import re
from pathlib import Path
from typing import List, Dict, Any, Set
from app.analyzers.base import AnalysisResult, ExtractedEntity

class ObsoleteDetectorService:
    @staticmethod
    def detect_obsolete_candidates(
        entities: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        workspace_path: Path,
        evidence_docs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        findings = []
        
        # 1. Map target in-degrees (who references what)
        incoming_refs: Dict[str, List[Dict[str, Any]]] = {}
        for edge in edges:
            t = edge["target_key"]
            if t not in incoming_refs:
                incoming_refs[t] = []
            incoming_refs[t].append(edge)

        # 2. Gather text from all documentation, incident reports, and configs for cross-reference
        doc_corpus = ""
        for doc in evidence_docs:
            doc_corpus += f"\n{doc.get('filename', '')} {doc.get('content', '')}"

        # Also scan configs and SQL files in workspace
        config_corpus = ""
        for p in workspace_path.glob("**/*"):
            if p.is_file() and p.suffix in (".sql", ".json", ".yaml", ".yml", ".env", ".cfg", ".ini", ".md"):
                try:
                    config_corpus += f"\n{p.read_text(encoding='utf-8', errors='ignore')}"
                except Exception:
                    pass

        # 3. Analyze functions and modules
        for node in entities:
            n_type = node.get("node_type")
            n_name = node.get("name", "")
            n_key = node.get("node_key", "")
            f_path = node.get("file_path", "")
            line_no = node.get("line_number")

            if n_type not in ("function", "module", "class"):
                continue

            # Don't flag entrypoints, init, or test files
            if any(ep in f_path.lower() for ep in ["main.py", "app.py", "server.js", "index.js", "__init__.py", "test"]):
                continue

            refs = incoming_refs.get(n_key, [])
            
            # Check if referenced indirectly by name
            base_name = n_name.split(".")[-1]
            ref_in_doc = base_name in doc_corpus and len(base_name) > 3
            ref_in_config = base_name in config_corpus and len(base_name) > 3

            signals: List[str] = []
            
            if len(refs) == 0:
                signals.append("no_direct_static_incoming_references")
            if not ref_in_config:
                signals.append("not_found_in_config_or_sql_literals")
            if ref_in_doc:
                signals.append("referenced_in_documentation_or_incident_reports")
            if ref_in_config:
                signals.append("referenced_in_config_or_sql_metadata")

            # Determine category based on multi-signal evidence
            if len(refs) == 0 and not ref_in_doc and not ref_in_config:
                findings.append({
                    "component_name": n_name,
                    "file_path": f_path,
                    "line_number": line_no,
                    "category": "potentially_obsolete",
                    "confidence": 0.82,
                    "signals": signals,
                    "recommendation": f"Component '{n_name}' has no incoming static references or config references. Audit dynamic calls or dispatch tables before decommissioning.",
                    "business_impact": "Medium-Low: Potential dead code, but verification required prior to safe removal."
                })
            elif len(refs) == 0 and (ref_in_doc or ref_in_config):
                findings.append({
                    "component_name": n_name,
                    "file_path": f_path,
                    "line_number": line_no,
                    "category": "possibly_business_critical",
                    "confidence": 0.89,
                    "signals": signals,
                    "recommendation": f"Component '{n_name}' has no static call sites in code, but is referenced in external incident reports or configuration. DO NOT REMOVE without domain audit.",
                    "business_impact": "HIGH: Likely executed dynamically, via scheduled jobs, or retained as compliance fallback."
                })

        return findings
