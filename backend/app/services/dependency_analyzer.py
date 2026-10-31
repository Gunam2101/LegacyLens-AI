import os
from pathlib import Path
from typing import Dict, List, Any, Set, Tuple
from app.analyzers.base import AnalysisResult, ExtractedDependency, ExtractedEntity
from app.analyzers.python_analyzer import PythonAnalyzer
from app.analyzers.javascript_analyzer import JavaScriptAnalyzer
from app.analyzers.sql_analyzer import SQLAnalyzer
from app.schemas.schemas import DependencyNodeResponse, DependencyEdgeResponse, DependencyGraphResponse

class DependencyAnalyzerService:
    def __init__(self):
        self.analyzers = [
            PythonAnalyzer(),
            JavaScriptAnalyzer(),
            SQLAnalyzer()
        ]

    def analyze_workspace(self, workspace_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[AnalysisResult]]:
        all_results: List[AnalysisResult] = []
        raw_nodes: Dict[str, Dict[str, Any]] = {}
        raw_edges: List[Dict[str, Any]] = []

        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "venv", ".venv", "__pycache__", "dist", "build")]
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(workspace_path).as_posix()
                
                # Check analyzers
                for analyzer in self.analyzers:
                    if analyzer.can_handle(rel_path):
                        try:
                            content = file_path.read_text(encoding="utf-8", errors="ignore")
                            res = analyzer.analyze(str(file_path), content, rel_path)
                            all_results.append(res)
                            
                            # Register Module Node
                            mod_key = f"mod:{rel_path}"
                            raw_nodes[mod_key] = {
                                "node_key": mod_key,
                                "name": Path(rel_path).name,
                                "node_type": "module",
                                "file_path": rel_path,
                                "line_number": 1,
                                "risk_level": "low",
                                "details": {"path": rel_path, "rules": len(res.rules), "loc": res.metrics.get("lines_of_code", 0)}
                            }

                            # Register Entity Nodes
                            for entity in res.entities:
                                if entity.entity_type in ("function", "class", "endpoint", "table", "test"):
                                    node_key = f"{entity.entity_type}:{rel_path}:{entity.name}"
                                    raw_nodes[node_key] = {
                                        "node_key": node_key,
                                        "name": entity.name,
                                        "node_type": entity.entity_type,
                                        "file_path": rel_path,
                                        "line_number": entity.line_start,
                                        "risk_level": "medium" if entity.entity_type == "endpoint" else "low",
                                        "details": entity.details
                                    }
                                    # Module owns Entity
                                    raw_edges.append({
                                        "source_key": mod_key,
                                        "target_key": node_key,
                                        "relationship": "declares",
                                        "evidence_type": "static_ast",
                                        "file_path": rel_path,
                                        "line_number": entity.line_start
                                    })

                            # Process Dependencies
                            for dep in res.dependencies:
                                raw_edges.append({
                                    "source_key": dep.source,
                                    "target_key": dep.target,
                                    "relationship": dep.relationship,
                                    "evidence_type": dep.evidence_type,
                                    "file_path": dep.file_path,
                                    "line_number": dep.line_number
                                })
                                # Ensure target node is registered if external or unresolved
                                if dep.target not in raw_nodes:
                                    t_parts = dep.target.split(":", 1)
                                    t_type = t_parts[0] if len(t_parts) > 1 else "external"
                                    t_name = t_parts[1] if len(t_parts) > 1 else dep.target
                                    raw_nodes[dep.target] = {
                                        "node_key": dep.target,
                                        "name": t_name,
                                        "node_type": t_type if t_type in ("module", "table", "external") else "external",
                                        "file_path": "",
                                        "line_number": None,
                                        "risk_level": "low",
                                        "details": {"external": True}
                                    }
                        except Exception as e:
                            pass
                        break

        # Compute Risk Levels based on in-degree (dependents)
        in_degrees: Dict[str, int] = {}
        for edge in raw_edges:
            t = edge["target_key"]
            in_degrees[t] = in_degrees.get(t, 0) + 1

        for k, node in raw_nodes.items():
            deg = in_degrees.get(k, 0)
            if deg >= 5:
                node["risk_level"] = "high"
            elif deg >= 2:
                node["risk_level"] = "medium"

        return list(raw_nodes.values()), raw_edges, all_results
