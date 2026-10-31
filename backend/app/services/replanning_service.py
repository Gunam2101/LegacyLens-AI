import json
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.database import BusinessRule, RuleAuditLog, EvidenceDocument, ObsoleteFinding, AnalysisEvent
from app.llm.provider import llm_provider

class ReplanningService:
    @staticmethod
    async def trigger_replanning_with_new_evidence(
        db: Session,
        project_id: str,
        new_evidence: EvidenceDocument
    ) -> Dict[str, Any]:
        """
        Executes dynamic replanning when a new piece of evidence (incident report, change ticket, policy) is submitted.
        1. Identifies affected rules and obsolete findings.
        2. Updates rule verification status and records full audit trail.
        3. Updates risk and obsolete classifications if an unreferenced component is referenced in the evidence.
        """
        # Fetch current rules for project
        rules = db.query(BusinessRule).filter(BusinessRule.project_id == project_id).all()
        obsolete_findings = db.query(ObsoleteFinding).filter(ObsoleteFinding.project_id == project_id).all()
        
        doc_dict = [{
            "filename": new_evidence.filename,
            "doc_type": new_evidence.doc_type,
            "content": new_evidence.content
        }]
        
        affected_rules_count = 0
        conflicts_flagged = 0
        reclassified_findings = 0
        audit_records = []
        changes_summary = []

        # 1. Re-evaluate rules against the new evidence
        raw_rules_dict = [
            {
                "rule_code": r.rule_code,
                "description": r.description,
                "source_file": r.source_file,
                "evidence_quote": r.evidence_quote,
                "status": r.status,
                "confidence": r.confidence
            }
            for r in rules
        ]
        
        correlated = await llm_provider.correlate_evidence_and_rules(raw_rules_dict, doc_dict, project_id=project_id)
        corr_map = {c["rule_code"]: c for c in correlated}

        for r in rules:
            c = corr_map.get(r.rule_code)
            if c and (c["status"] != r.status or c.get("conflicting_evidence")):
                prev_status = r.status
                r.status = c["status"]
                r.confidence = c["confidence"]
                if c.get("conflicting_evidence"):
                    r.conflicting_evidence = c["conflicting_evidence"]
                    conflicts_flagged += 1
                if c.get("user_notes"):
                    r.user_notes = c["user_notes"]

                affected_rules_count += 1
                
                # Create Audit Log
                audit = RuleAuditLog(
                    rule_id=r.id,
                    project_id=project_id,
                    action="replanned",
                    previous_status=prev_status,
                    new_status=r.status,
                    reason=f"Evidence '{new_evidence.filename}' triggered re-evaluation. {r.conflicting_evidence or r.user_notes or ''}"
                )
                db.add(audit)
                audit_records.append(audit)
                changes_summary.append({
                    "rule_code": r.rule_code,
                    "previous_status": prev_status,
                    "new_status": r.status,
                    "reason": audit.reason
                })

        # 2. Re-evaluate obsolete findings: if component is mentioned in incident/ticket, reclassify to possibly_business_critical!
        ev_text = new_evidence.content.lower()
        for finding in obsolete_findings:
            comp_name = finding.component_name.lower()
            if len(comp_name) > 3 and comp_name in ev_text:
                if finding.category == "potentially_obsolete":
                    finding.category = "possibly_business_critical"
                    finding.confidence = 0.92
                    finding.signals = finding.signals + [f"referenced_in_new_evidence:{new_evidence.filename}"]
                    finding.recommendation = f"Evidence '{new_evidence.filename}' explicitly references this component. DO NOT DELETE. Investigate incident context."
                    finding.business_impact = "CRITICAL: Referenced in newly submitted incident or change documentation."
                    reclassified_findings += 1
                    changes_summary.append({
                        "component_name": finding.component_name,
                        "change": "Reclassified from potentially_obsolete to possibly_business_critical",
                        "evidence": new_evidence.filename
                    })

        # Record analysis event
        event = AnalysisEvent(
            project_id=project_id,
            stage="Replanning",
            progress=100,
            message=f"Replanning completed for evidence '{new_evidence.filename}': {affected_rules_count} rules updated ({conflicts_flagged} conflicting), {reclassified_findings} obsolete findings reclassified.",
            level="warning" if conflicts_flagged > 0 else "info"
        )
        db.add(event)
        
        db.commit()

        return {
            "project_id": project_id,
            "evidence_filename": new_evidence.filename,
            "affected_rules_count": affected_rules_count,
            "conflicts_flagged": conflicts_flagged,
            "reclassified_findings": reclassified_findings,
            "changes": changes_summary
        }
