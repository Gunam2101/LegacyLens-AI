from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models.database import get_db, Project, EvidenceDocument
from app.services.replanning_service import ReplanningService

router = APIRouter(prefix="/replanning", tags=["replanning"])

class QuickEvidenceRequest(BaseModel):
    filename: str
    doc_type: str = "incident_report"
    content: str

@router.post("/{project_id}/evidence/{evidence_id}")
async def replan_with_existing_evidence(
    project_id: str,
    evidence_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    evidence = db.query(EvidenceDocument).filter(
        EvidenceDocument.id == evidence_id,
        EvidenceDocument.project_id == project_id
    ).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence document not found")

    result = await ReplanningService.trigger_replanning_with_new_evidence(db, project_id, evidence)
    return result

@router.post("/{project_id}/quick-evidence")
async def replan_with_new_evidence(
    project_id: str,
    req: QuickEvidenceRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Store evidence
    doc = EvidenceDocument(
        project_id=project_id,
        filename=req.filename,
        doc_type=req.doc_type,
        content=req.content,
        summary=req.content[:300].strip()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    result = await ReplanningService.trigger_replanning_with_new_evidence(db, project_id, doc)
    return result
