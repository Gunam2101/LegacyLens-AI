import os
import re
import json
import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class TokenTracker:
    """
    Accurately tracks and aggregates real AI token usage metadata across model requests.
    Prevents double-counting, handles multiple calls and models, and distinguishes
    input, output, and total tokens.
    """
    def __init__(self):
        self._project_usage: Dict[str, Dict[str, Any]] = {}
        self._recorded_call_hashes: Dict[str, set] = {}

    def reset_project(self, project_id: str):
        if not project_id:
            return
        self._project_usage[project_id] = {
            "available": False,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "calls_count": 0,
            "provider": None,
            "model": None,
            "models": {},
            "last_updated": None
        }
        self._recorded_call_hashes[project_id] = set()

    def record_call(
        self,
        project_id: str,
        input_tokens: int,
        output_tokens: int,
        total_tokens: int,
        provider: str,
        model: str,
        call_hash: Optional[str] = None
    ) -> bool:
        if not project_id:
            return False

        if project_id not in self._project_usage:
            self.reset_project(project_id)

        # Guard against double-counting on identical/repeated event passes
        if call_hash:
            if call_hash in self._recorded_call_hashes[project_id]:
                return False
            self._recorded_call_hashes[project_id].add(call_hash)

        curr = self._project_usage[project_id]
        curr["available"] = True
        curr["input_tokens"] += int(input_tokens)
        curr["output_tokens"] += int(output_tokens)
        curr["total_tokens"] += int(total_tokens)
        curr["calls_count"] += 1
        curr["provider"] = provider
        curr["model"] = model
        curr["last_updated"] = datetime.now(timezone.utc).isoformat()

        # Aggregate model-specific usage separately
        if model not in curr["models"]:
            curr["models"][model] = {
                "provider": provider,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "calls": 0
            }
        curr["models"][model]["input_tokens"] += int(input_tokens)
        curr["models"][model]["output_tokens"] += int(output_tokens)
        curr["models"][model]["total_tokens"] += int(total_tokens)
        curr["models"][model]["calls"] += 1
        return True

    def get_project_usage(self, project_id: str) -> Dict[str, Any]:
        if project_id in self._project_usage:
            return dict(self._project_usage[project_id])
        return {
            "available": False,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "calls_count": 0,
            "provider": None,
            "model": None,
            "models": {},
            "reason": "Token usage unavailable",
            "last_updated": None
        }


class LLMProvider:
    def __init__(self):
        self._correlation_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.token_tracker = TokenTracker()
        self._init_clients()

    def _init_clients(self):
        """Initializes or re-initializes LLM clients with the latest configuration settings."""
        self.provider_type = settings.AI_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
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

    @staticmethod
    def extract_gemini_usage(response: Any, model: str) -> Optional[Dict[str, Any]]:
        """
        Extracts actual Gemini token counts from response.usage_metadata.
        Returns None if usage metadata is unavailable or empty.
        """
        usage = getattr(response, "usage_metadata", None)
        if not usage:
            return None

        if isinstance(usage, dict):
            prompt_cnt = usage.get("prompt_token_count")
            if prompt_cnt is None:
                prompt_cnt = usage.get("promptTokenCount")
            cand_cnt = usage.get("candidates_token_count")
            if cand_cnt is None:
                cand_cnt = usage.get("candidatesTokenCount")
            total_cnt = usage.get("total_token_count")
            if total_cnt is None:
                total_cnt = usage.get("totalTokenCount")
        else:
            prompt_cnt = getattr(usage, "prompt_token_count", None)
            if prompt_cnt is None:
                prompt_cnt = getattr(usage, "promptTokenCount", None)
            cand_cnt = getattr(usage, "candidates_token_count", None)
            if cand_cnt is None:
                cand_cnt = getattr(usage, "candidatesTokenCount", None)
            total_cnt = getattr(usage, "total_token_count", None)
            if total_cnt is None:
                total_cnt = getattr(usage, "totalTokenCount", None)

        if prompt_cnt is None and cand_cnt is None and total_cnt is None:
            return None

        prompt_tokens = int(prompt_cnt or 0)
        candidates_tokens = int(cand_cnt or 0)
        total_tokens = int(total_cnt) if total_cnt is not None else (prompt_tokens + candidates_tokens)

        return {
            "input_tokens": prompt_tokens,
            "output_tokens": candidates_tokens,
            "total_tokens": total_tokens,
            "provider": "gemini",
            "model": model
        }

    @staticmethod
    def extract_openai_usage(response: Any, model: str) -> Optional[Dict[str, Any]]:
        """
        Extracts actual OpenAI token counts from response.usage.
        Returns None if usage metadata is unavailable.
        """
        usage = getattr(response, "usage", None)
        if not usage:
            return None

        if isinstance(usage, dict):
            prompt_cnt = usage.get("prompt_tokens")
            completion_cnt = usage.get("completion_tokens")
            total_cnt = usage.get("total_tokens")
        else:
            prompt_cnt = getattr(usage, "prompt_tokens", None)
            completion_cnt = getattr(usage, "completion_tokens", None)
            total_cnt = getattr(usage, "total_tokens", None)

        if prompt_cnt is None and completion_cnt is None and total_cnt is None:
            return None

        prompt_tokens = int(prompt_cnt or 0)
        completion_tokens = int(completion_cnt or 0)
        total_tokens = int(total_cnt) if total_cnt is not None else (prompt_tokens + completion_tokens)

        return {
            "input_tokens": prompt_tokens,
            "output_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "provider": "openai",
            "model": model
        }

    def get_project_token_usage(self, project_id: str) -> Dict[str, Any]:
        """Returns the current aggregated token consumption for a project."""
        return self.token_tracker.get_project_usage(project_id)

    def reset_project_token_usage(self, project_id: str):
        """Resets token tracking for a new analysis session."""
        self.token_tracker.reset_project(project_id)

    @staticmethod
    def _clean_and_parse_json(text: str) -> Any:
        """Safely strips markdown code blocks and whitespace before JSON parsing."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned.strip())

    async def correlate_evidence_and_rules(
        self,
        rules: List[Dict[str, Any]],
        evidence_docs: List[Dict[str, Any]],
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Cross-correlate candidate code rules with uploaded documentation, incident reports, and tickets.
        Flags corroborations or conflicts. Includes caching, bounded retry, and deterministic fallback.
        Captures actual token usage metadata when available.
        """
        if not rules:
            return rules

        # Compute deterministic cache key invariant to rule in-place status mutations
        rule_signatures = [
            {"code": r.get("rule_code"), "desc": r.get("description"), "quote": r.get("evidence_quote")}
            for r in rules[:15]
        ]
        doc_signatures = [
            {"name": d.get("filename"), "content": d.get("content")}
            for d in evidence_docs
        ]
        cache_key = hashlib.sha256(
            json.dumps({"rules": rule_signatures, "evidence": doc_signatures}, sort_keys=True).encode("utf-8")
        ).hexdigest()

        if cache_key in self._correlation_cache:
            logger.info(f"Using cached correlation results for key {cache_key[:8]}")
            return self._apply_llm_correlations(rules, self._correlation_cache[cache_key])

        info = self.get_active_provider_info()

        # If Gemini is configured
        if info["provider"] == "gemini" and self.gemini_client:
            prompt = (
                "You are a Senior Application Security & Modernization Architect.\n"
                "Analyze these extracted code rules against the provided evidence documents (incident reports, change tickets).\n"
                "Ground all findings strictly in the provided evidence. Do NOT fabricate rules, citations, or facts.\n"
                "Identify:\n"
                "1. Any conflicting rules (where code contradicts business policy or incident findings)\n"
                "2. Corroborated rules (where evidence explicitly confirms the business rule)\n"
                "3. Realistic confidence adjustments based on documented evidence\n\n"
                f"Candidate Rules:\n{json.dumps(rules[:15], indent=2)}\n\n"
                f"Evidence Documents:\n{json.dumps(evidence_docs, indent=2)}\n\n"
                "Respond strictly with a JSON list of objects having keys: rule_code, status ('verified'|'conflicting'|'inferred'), "
                "confidence (float 0.0-1.0), conflicting_evidence (string or null), user_notes (concise explanation of finding)."
            )

            max_retries = 2
            delay = 1.0
            for attempt in range(max_retries + 1):
                try:
                    response = self.gemini_client.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=prompt,
                        config={"response_mime_type": "application/json"}
                    )

                    # Extract actual token usage metadata from Gemini response
                    usage_data = self.extract_gemini_usage(response, model=settings.GEMINI_MODEL)
                    if usage_data and project_id:
                        call_hash = hashlib.sha256(f"{cache_key}_{attempt}_{usage_data['total_tokens']}".encode("utf-8")).hexdigest()
                        self.token_tracker.record_call(
                            project_id=project_id,
                            input_tokens=usage_data["input_tokens"],
                            output_tokens=usage_data["output_tokens"],
                            total_tokens=usage_data["total_tokens"],
                            provider=usage_data["provider"],
                            model=usage_data["model"],
                            call_hash=call_hash
                        )

                    parsed = self._clean_and_parse_json(response.text)
                    correlations = parsed if isinstance(parsed, list) else parsed.get("rules", [parsed])
                    self._correlation_cache[cache_key] = correlations
                    return self._apply_llm_correlations(rules, correlations)
                except Exception as e:
                    err_msg = str(e).lower()
                    if attempt < max_retries and any(term in err_msg for term in ["429", "503", "quota", "rate limit", "temporarily unavailable"]):
                        logger.warning(f"Gemini call hit transient error ({e}), retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= 2
                    else:
                        logger.error(f"Gemini call failed on attempt {attempt + 1}: {e}. Falling back to deterministic correlator.")
                        break

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

                # Extract actual token usage from OpenAI response
                usage_data = self.extract_openai_usage(response, model=settings.OPENAI_MODEL)
                if usage_data and project_id:
                    call_hash = hashlib.sha256(f"{cache_key}_openai_{usage_data['total_tokens']}".encode("utf-8")).hexdigest()
                    self.token_tracker.record_call(
                        project_id=project_id,
                        input_tokens=usage_data["input_tokens"],
                        output_tokens=usage_data["output_tokens"],
                        total_tokens=usage_data["total_tokens"],
                        provider=usage_data["provider"],
                        model=usage_data["model"],
                        call_hash=call_hash
                    )

                data = self._clean_and_parse_json(response.choices[0].message.content)
                items = data.get("rules", data.get("correlations", [])) if isinstance(data, dict) else data
                self._correlation_cache[cache_key] = items
                return self._apply_llm_correlations(rules, items)
            except Exception as e:
                logger.error(f"OpenAI call failed: {e}. Falling back to deterministic correlator.")

        # Local deterministic correlator fallback
        local_res = self._local_correlator(rules, evidence_docs)
        self._correlation_cache[cache_key] = [
            {
                "rule_code": r.get("rule_code"),
                "status": r.get("status"),
                "confidence": r.get("confidence"),
                "conflicting_evidence": r.get("conflicting_evidence"),
                "user_notes": r.get("user_notes")
            }
            for r in local_res
        ]
        return local_res

    def _apply_llm_correlations(self, rules: List[Dict[str, Any]], correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        corr_map = {c.get("rule_code"): c for c in correlations if isinstance(c, dict) and "rule_code" in c}
        for r in rules:
            c = corr_map.get(r.get("rule_code"))
            if c:
                r["status"] = c.get("status", r.get("status", "inferred"))
                r["confidence"] = c.get("confidence", r.get("confidence", 0.7))
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
                    if match_count >= 2 and r.get("status") != "conflicting":
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
