from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import (
    get_db, ModernizationPlan, CoreFeature, ObsoleteFinding, CodeProposal, Project
)
from app.schemas.schemas import (
    ModernizationRoadmapResponse, CoreFeatureResponse, ObsoleteFindingResponse,
    CodeProposalResponse, CodeProposalApproval
)

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
    return db.query(CodeProposal).filter(CodeProposal.project_id == project_id).all()

@router.post("/proposal/{proposal_id}/approve", response_model=CodeProposalResponse)
def approve_proposal(
    proposal_id: str,
    action: CodeProposalApproval,
    db: Session = Depends(get_db)
):
    prop = db.query(CodeProposal).filter(CodeProposal.id == proposal_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Code proposal not found")

    prop.approval_status = action.approval_status
    db.commit()
    db.refresh(prop)
    return prop
