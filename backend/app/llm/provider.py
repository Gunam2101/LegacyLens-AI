import os
import re
import json
import logging
from typing import Dict, List, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMProvider:
    def __init__(self):
        self.provider_type = settings.AI_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        self._init_clients()

    def _init_clients(self):
        self.gemini_client = None
        self.openai_client = None

        if self.gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_key)
            except Exception as e:
                logger.warning(f"Could not initialize Gemini client: {e}")

        if self.openai_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.openai_key)
            except Exception as e:
                logger.warning(f"Could not initialize OpenAI client: {e}")

    def get_active_provider_info(self) -> Dict[str, Any]:
        """Returns details about which provider is active, model name, and whether keys are configured."""
        if self.gemini_client and self.provider_type in ("gemini", "auto"):
            return {"provider": "gemini", "model": settings.GEMINI_MODEL, "configured": True}
        elif self.openai_client and self.provider_type in ("openai", "auto"):
            return {"provider": "openai", "model": settings.OPENAI_MODEL, "configured": True}
        else:
            return {
                "provider": "local_heuristic",
                "model": "deterministic-ast-correlator",
                "configured": False,
                "note": "Set GEMINI_API_KEY or OPENAI_API_KEY in Settings or .env for cloud LLM reasoning"
            }

    async def correlate_evidence_and_rules(
        self,
        rules: List[Dict[str, Any]],
        evidence_docs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Cross-correlate candidate code rules with uploaded documentation, incident reports, and tickets.
        Flags corroborations or conflicts.
        """
        info = self.get_active_provider_info()
        
        # If Gemini is configured
        if info["provider"] == "gemini" and self.gemini_client:
            try:
                prompt = (
                    "You are a Senior Application Security & Modernization Architect.\n"
                    "Analyze these extracted code rules against the provided evidence documents (incident reports, change tickets).\n"
                    "Identify:\n"
                    "1. Any conflicting rules (where code contradicts business policy or incident findings)\n"
                    "2. Corroborated rules (where evidence confirms the business rule)\n"
                    "3. Confidence adjustments\n\n"
                    f"Candidate Rules:\n{json.dumps(rules[:15], indent=2)}\n\n"
                    f"Evidence Documents:\n{json.dumps(evidence_docs, indent=2)}\n\n"
                    "Respond with a JSON list of objects having keys: rule_code, status ('verified'|'conflicting'|'inferred'), "
                    "confidence (float 0.0-1.0), conflicting_evidence (string or null), user_notes (explanation of finding)."
                )
                response = self.gemini_client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                correlations = json.loads(response.text)
                return self._apply_llm_correlations(rules, correlations)
            except Exception as e:
                logger.error(f"Gemini call failed: {e}. Falling back to deterministic correlator.")

        # If OpenAI is configured
        elif info["provider"] == "openai" and self.openai_client:
            try:
                prompt = (
                    f"Candidate Rules:\n{json.dumps(rules[:15], indent=2)}\n\n"
                    f"Evidence Documents:\n{json.dumps(evidence_docs, indent=2)}"
                )
                response = self.openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "You correlate software business rules with incident reports and tickets. Return valid JSON array with keys: rule_code, status, confidence, conflicting_evidence, user_notes."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                data = json.loads(response.choices[0].message.content)
                items = data.get("rules", data.get("correlations", [])) if isinstance(data, dict) else data
                return self._apply_llm_correlations(rules, items)
            except Exception as e:
                logger.error(f"OpenAI call failed: {e}. Falling back to deterministic correlator.")

        # Local deterministic correlator fallback
        return self._local_correlator(rules, evidence_docs)

    def _apply_llm_correlations(self, rules: List[Dict[str, Any]], correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        corr_map = {c.get("rule_code"): c for c in correlations if "rule_code" in c}
        for r in rules:
            c = corr_map.get(r.get("rule_code"))
            if c:
                r["status"] = c.get("status", r["status"])
                r["confidence"] = c.get("confidence", r["confidence"])
                if c.get("conflicting_evidence"):
                    r["conflicting_evidence"] = c.get("conflicting_evidence")
                if c.get("user_notes"):
                    r["user_notes"] = c.get("user_notes")
        return rules

    def _local_correlator(self, rules: List[Dict[str, Any]], evidence_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deterministic, rule-based cross-referencing engine.
        Inspects incident reports and tickets for rule keywords, policy overrides, or conflicting guidelines.
        """
        doc_texts = []
        for d in evidence_docs:
            doc_texts.append({
                "name": d.get("filename", ""),
                "type": d.get("doc_type", "doc"),
                "text": d.get("content", "").lower()
            })

        for r in rules:
            r_desc = r.get("description", "").lower()
            r_file = r.get("source_file", "").lower()
            quote = r.get("evidence_quote", "").lower()

            for doc in doc_texts:
                # Check for incident report conflict (e.g. override, bug, exception, incorrect calculation)
                if doc["type"] == "incident_report":
                    if any(term in doc["text"] for term in ["incident", "override", "incorrect", "defect", "breach", "grace period", "policy bug"]):
                        words = [w for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', r_desc + " " + quote).split() if len(w) > 3]
                        match_count = sum(1 for kw in words if kw in doc["text"])
                        if match_count >= 2:
                            r["status"] = "conflicting"
                            r["conflicting_evidence"] = f"Incident Report '{doc['name']}' notes conflict: {doc['text'][:180]}..."
                            r["confidence"] = 0.65
                            r["user_notes"] = f"Flagged for human review: Source code rule conflicts with incident findings in {doc['name']}."
                            break

                # Check for corroborating documentation or policy
                elif doc["type"] in ("documentation", "policy", "change_ticket"):
                    words = [w for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', r_desc + " " + quote).split() if len(w) > 3]
                    match_count = sum(1 for kw in words if kw in doc["text"])
                    if match_count >= 2 and r["status"] != "conflicting":
                        r["status"] = "verified"
                        r["confidence"] = 0.95
                        r["user_notes"] = f"Verified: Corroborated by documentation in '{doc['name']}'."

        return rules

    async def generate_modernization_roadmap(
        self,
        tech_stack: Dict[str, Any],
        rules_count: int,
        risks_count: int,
        features: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generates a structured, phased modernization roadmap."""
        return [
            {
                "phase_number": 1,
                "title": "Phase 1: Stabilization & Test Characterization",
                "description": "Establish automated test harness and capture baseline outputs for critical business logic modules before modifying runtime code.",
                "target_components": ["Core Engine", "Database Queries", "Pricing & Billing Rules"],
                "risk_mitigation": "Run regression baseline suites to detect subtle arithmetic or logic shifts.",
                "verification_steps": ["Execute existing unit tests", "Generate characterization tests for state mutations", "Record input/output snapshots"],
                "estimated_effort": "1-2 Weeks"
            },
            {
                "phase_number": 2,
                "title": "Phase 2: Risk Reduction & Obsolete Code Pruning",
                "description": "Audit candidate obsolete modules with zero incoming references and no dynamic dispatch references. Isolate deprecated dependencies.",
                "target_components": ["Unreferenced legacy helpers", "Deprecated package versions", "Redundant utility scripts"],
                "risk_mitigation": "Check incident logs and database trigger catalogues to avoid deleting scheduled or compliance fallback code.",
                "verification_steps": ["Cross-reference runtime call logs", "Verify zero test breakage upon stubbing", "Obtain human architect sign-off"],
                "estimated_effort": "1 Week"
            },
            {
                "phase_number": 3,
                "title": "Phase 3: Architecture Modernization & Refactoring",
                "description": "Migrate tightly-coupled procedural routines into typed, modular domain services with dependency injection.",
                "target_components": ["Monolithic handlers", "Direct SQL string concatenations", "Legacy API endpoints"],
                "risk_mitigation": "Preserve explicit business rule boundaries verified in the Business Rules Catalogue.",
                "verification_steps": ["Run AST semantic diff check", "Re-run full verification gate", "Benchmark response latency"],
                "estimated_effort": "3-4 Weeks"
            },
            {
                "phase_number": 4,
                "title": "Phase 4: Behaviour-Preservation Verification",
                "description": "Run dual-execution verification comparing original baseline outputs against modernized code branch across synthetic and boundary inputs.",
                "target_components": ["All refactored services", "Database migrations", "REST API schemas"],
                "risk_mitigation": "Automated Behaviour-Preservation Gate halts deployment if any business calculation diverges.",
                "verification_steps": ["Execute dual-run test comparison", "Inspect diff report", "Validate zero regression"],
                "estimated_effort": "1 Week"
            },
            {
                "phase_number": 5,
                "title": "Phase 5: Production Deployment Readiness",
                "description": "Finalize containerization, environment variable configurations, observability metrics, and structured rollback playbooks.",
                "target_components": ["Dockerfiles", "Health probes", "Telemetry logging"],
                "risk_mitigation": "Canary deployment strategy with automated rollback on error spikes.",
                "verification_steps": ["Smoke test in staging container", "Verify audit logs and metrics", "Human approval sign-off"],
                "estimated_effort": "1 Week"
            }
        ]

llm_provider = LLMProvider()
