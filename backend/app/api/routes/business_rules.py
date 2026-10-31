from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.models.database import get_db, BusinessRule, RuleAuditLog
from app.schemas.schemas import (
    BusinessRuleResponse, BusinessRuleStatusUpdate, RuleAuditLogResponse
)

router = APIRouter(prefix="/business-rules", tags=["business-rules"])

@router.get("/{project_id}", response_model=List[BusinessRuleResponse])
def get_business_rules(
    project_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(BusinessRule).filter(BusinessRule.project_id == project_id)
    if status_filter:
        query = query.filter(BusinessRule.status == status_filter)
    if min_confidence is not None:
        query = query.filter(BusinessRule.confidence >= min_confidence)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (BusinessRule.description.ilike(s)) |
            (BusinessRule.rule_code.ilike(s)) |
            (BusinessRule.source_file.ilike(s)) |
            (BusinessRule.evidence_quote.ilike(s))
        )
    return query.order_by(BusinessRule.rule_code.asc()).all()

@router.get("/rule/{rule_id}", response_model=BusinessRuleResponse)
def get_single_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Business rule not found")
    return rule

@router.patch("/rule/{rule_id}/status", response_model=BusinessRuleResponse)
def update_rule_status(
    rule_id: str,
    update_data: BusinessRuleStatusUpdate,
    db: Session = Depends(get_db)
):
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Business rule not found")

    prev_status = rule.status
    rule.status = update_data.status
    if update_data.user_notes:
        rule.user_notes = update_data.user_notes
    rule.updated_at = datetime.utcnow()

    # Record audit log
    audit = RuleAuditLog(
        rule_id=rule.id,
        project_id=rule.project_id,
        action="status_override",
        previous_status=prev_status,
        new_status=update_data.status,
        reason=update_data.reason or "User review update",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("/rule/{rule_id}/audit", response_model=List[RuleAuditLogResponse])
def get_rule_audit_logs(rule_id: str, db: Session = Depends(get_db)):
    return db.query(RuleAuditLog).filter(RuleAuditLog.rule_id == rule_id).order_by(RuleAuditLog.timestamp.desc()).all()
