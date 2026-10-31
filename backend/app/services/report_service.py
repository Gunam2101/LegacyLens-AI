import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.database import (
    Project, BusinessRule, DependencyNode, DependencyEdge, ObsoleteFinding,
    CoreFeature, CodeProposal, RuleAuditLog, EvidenceDocument, ModernizationPlan
)
from app.core.config import settings

class ReportService:
    @staticmethod
    def generate_full_report_data(db: Session, project_id: str) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        rules = db.query(BusinessRule).filter(BusinessRule.project_id == project_id).all()
        features = db.query(CoreFeature).filter(CoreFeature.project_id == project_id).all()
        nodes = db.query(DependencyNode).filter(DependencyNode.project_id == project_id).all()
        edges = db.query(DependencyEdge).filter(DependencyEdge.project_id == project_id).all()
        obsolete = db.query(ObsoleteFinding).filter(ObsoleteFinding.project_id == project_id).all()
        proposals = db.query(CodeProposal).filter(CodeProposal.project_id == project_id).all()
        docs = db.query(EvidenceDocument).filter(EvidenceDocument.project_id == project_id).all()
        audit_logs = db.query(RuleAuditLog).filter(RuleAuditLog.project_id == project_id).order_by(RuleAuditLog.timestamp.desc()).all()
        plan = db.query(ModernizationPlan).filter(ModernizationPlan.project_id == project_id).first()

        return {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "agent": "LegacyLens AI Modernization Suite v1.0",
                "project_id": project.id,
                "project_name": project.name,
                "description": project.description,
                "status": project.status,
                "created_at": project.created_at.isoformat() if project.created_at else "",
                "languages": project.languages or {},
                "frameworks": project.frameworks or [],
                "stats": project.stats or {}
            },
            "evidence_documents": [
                {"filename": d.filename, "doc_type": d.doc_type, "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else ""}
                for d in docs
            ],
            "core_features": [
                {"name": f.name, "description": f.description, "detected_type": f.detected_type, "risk_level": f.risk_level}
                for f in features
            ],
            "business_rules": [
                {
                    "rule_code": r.rule_code,
                    "description": r.description,
                    "source_file": r.source_file,
                    "line_range": f"{r.line_start}-{r.line_end}" if r.line_start else "N/A",
                    "evidence_quote": r.evidence_quote,
                    "evidence_type": r.evidence_type,
                    "confidence": r.confidence,
                    "status": r.status,
                    "conflicting_evidence": r.conflicting_evidence,
                    "user_notes": r.user_notes
                }
                for r in rules
            ],
            "dependency_summary": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "high_risk_components": [n.name for n in nodes if n.risk_level == "high"]
            },
            "obsolete_findings": [
                {
                    "component": o.component_name,
                    "file": o.file_path,
                    "line": o.line_number,
                    "category": o.category,
                    "confidence": o.confidence,
                    "signals": o.signals,
                    "recommendation": o.recommendation,
                    "impact": o.business_impact
                }
                for o in obsolete
            ],
            "modernization_plan": plan.phases if plan else [],
            "code_proposals": [
                {
                    "title": p.title,
                    "file_path": p.file_path,
                    "preservation_status": p.preservation_gate_status,
                    "approval_status": p.approval_status,
                    "rationale": p.rationale
                }
                for p in proposals
            ],
            "audit_trail": [
                {
                    "rule_id": a.rule_id,
                    "action": a.action,
                    "previous_status": a.previous_status,
                    "new_status": a.new_status,
                    "reason": a.reason,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else ""
                }
                for a in audit_logs
            ]
        }

    @classmethod
    def generate_markdown_report(cls, db: Session, project_id: str) -> str:
        data = cls.generate_full_report_data(db, project_id)
        meta = data["metadata"]
        
        md = []
        md.append(f"# LegacyLens AI Modernization Report")
        md.append(f"**Project:** {meta['project_name']} (ID: `{meta['project_id']}`)")
        md.append(f"**Generated:** {meta['generated_at']} UTC | **Status:** {meta['status']}\n")
        
        md.append("## 1. Executive Summary")
        md.append(f"- **Languages Detected:** {', '.join(meta['languages'].keys()) or 'None'}")
        md.append(f"- **Frameworks Identified:** {', '.join(meta['frameworks']) or 'None'}")
        stats = meta.get("stats", {})
        md.append(f"- **Files Analyzed:** {stats.get('file_count', 0)} ({stats.get('total_loc', 0)} LOC)")
        md.append(f"- **Extracted Business Rules:** {len(data['business_rules'])}")
        md.append(f"- **Obsolete / Dead Code Findings:** {len(data['obsolete_findings'])}")
        md.append(f"- **Core Features Discovered:** {len(data['core_features'])}\n")
        
        md.append("## 2. Core Business Features Discovered")
        for f in data["core_features"]:
            md.append(f"### {f['name']} `[{f['detected_type'].upper()}]`")
            md.append(f"- **Description:** {f['description']}")
            md.append(f"- **Risk Level:** `{f['risk_level'].upper()}`\n")
            
        md.append("## 3. Business Rule Reconstruction Catalogue")
        md.append("| Rule Code | Description | Source Location | Evidence Type | Status | Conf. |")
        md.append("|---|---|---|---|---|---|")
        for r in data["business_rules"]:
            md.append(f"| `{r['rule_code']}` | {r['description']} | `{r['source_file']}:{r['line_range']}` | {r['evidence_type']} | `{r['status']}` | {r['confidence']*100:.0f}% |")
        md.append("")
        
        md.append("## 4. Multi-Signal Obsolete Code Investigation")
        for o in data["obsolete_findings"]:
            md.append(f"### `{o['component']}` (`{o['file']}:{o['line']}`)")
            md.append(f"- **Classification:** `{o['category']}` (Confidence: {o['confidence']*100:.0f}%)")
            md.append(f"- **Signals:** {', '.join(o['signals'])}")
            md.append(f"- **Recommendation:** {o['recommendation']}")
            md.append(f"- **Business Impact:** {o['impact']}\n")

        md.append("## 5. Modernization Roadmap")
        for phase in data["modernization_plan"]:
            md.append(f"### Phase {phase.get('phase_number')}: {phase.get('title')}")
            md.append(f"{phase.get('description')}")
            md.append(f"- **Target Components:** {', '.join(phase.get('target_components', []))}")
            md.append(f"- **Risk Mitigation:** {phase.get('risk_mitigation')}")
            md.append(f"- **Estimated Effort:** {phase.get('estimated_effort')}\n")

        md.append("## 6. Audit Trail & Human Decisions")
        if data["audit_trail"]:
            for a in data["audit_trail"]:
                md.append(f"- `[{a['timestamp']}]` Rule `{a['rule_id']}` changed `{a['previous_status']}` -> `{a['new_status']}`: {a['reason']}")
        else:
            md.append("No manual or replanning audit entries recorded yet.\n")

        md.append("\n---\n*Report compiled autonomously by LegacyLens AI.*")
        return "\n".join(md)
