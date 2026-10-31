from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import (
    get_db, ModernizationPlan, CoreFeature, ObsoleteFinding, CodeProposal, Project
)
from app.schemas.schemas import (
    ModernizationRoadmapResponse, CoreFeatureResponse, ObsoleteFindingResponse,
    CodeProposalResponse, CodeProposalApproval, CodeProposalEdit
)
from app.services.change_control import ChangeControlService

router = APIRouter(prefix="/modernization", tags=["modernization"])

@router.get("/{project_id}/roadmap", response_model=ModernizationRoadmapResponse)
def get_roadmap(project_id: str, db: Session = Depends(get_db)):
    plan = db.query(ModernizationPlan).filter(ModernizationPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Modernization plan not found")
    return ModernizationRoadmapResponse(
        project_id=project_id,
        phases=plan.phases,
        recommendations=plan.recommendations,
        created_at=plan.created_at
    )

@router.get("/{project_id}/features", response_model=List[CoreFeatureResponse])
def get_core_features(project_id: str, db: Session = Depends(get_db)):
    return db.query(CoreFeature).filter(CoreFeature.project_id == project_id).all()

@router.get("/{project_id}/obsolete", response_model=List[ObsoleteFindingResponse])
def get_obsolete_findings(project_id: str, db: Session = Depends(get_db)):
    return db.query(ObsoleteFinding).filter(ObsoleteFinding.project_id == project_id).all()

@router.get("/{project_id}/proposals", response_model=List[CodeProposalResponse])
def get_code_proposals(project_id: str, db: Session = Depends(get_db)):
    return db.query(CodeProposal).filter(CodeProposal.project_id == project_id).order_by(CodeProposal.created_at.asc()).all()

@router.post("/proposal/{proposal_id}/approve", response_model=CodeProposalResponse)
def approve_proposal(
    proposal_id: str,
    action: CodeProposalApproval,
    db: Session = Depends(get_db)
):
    try:
        prop, warnings = ChangeControlService.update_proposal_status(
            db, proposal_id, action.approval_status, action.reason or ""
        )
        return prop
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/proposal/{proposal_id}/revert", response_model=CodeProposalResponse)
def revert_single_proposal(proposal_id: str, db: Session = Depends(get_db)):
    try:
        return ChangeControlService.revert_proposal(db, proposal_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/proposal/{proposal_id}/edit", response_model=CodeProposalResponse)
def edit_proposal_content(
    proposal_id: str,
    data: CodeProposalEdit,
    db: Session = Depends(get_db)
):
    try:
        return ChangeControlService.edit_proposal(
            db, proposal_id,
            new_title=data.title,
            new_proposed_code=data.proposed_code,
            new_rationale=data.rationale
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{project_id}/apply-approved")
def apply_all_approved_proposals(project_id: str, db: Session = Depends(get_db)):
    try:
        return ChangeControlService.apply_approved_changes(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{project_id}/rollback-all")
def rollback_all_changes(project_id: str, db: Session = Depends(get_db)):
    try:
        return ChangeControlService.rollback_all(db, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
