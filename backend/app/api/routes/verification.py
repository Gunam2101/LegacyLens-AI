from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, CodeProposal, WebsiteInspection
from app.services.verification_service import VerificationService
from app.schemas.schemas import VerificationResultResponse

router = APIRouter(prefix="/verification", tags=["verification"])

@router.post("/{project_id}/run", response_model=VerificationResultResponse)
def run_verification_gate(
    project_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    source_dir = Path(project.workspace_path)
    modernized_dir = source_dir.parent / "modernized"

    # Execute dual-run gate
    outcome = VerificationService.execute_behaviour_gate(source_dir, modernized_dir)

    # Update code proposals if any
    proposals = db.query(CodeProposal).filter(CodeProposal.project_id == project_id).all()
    for proposal in proposals:
        proposal.baseline_test_passed = outcome.baseline_failed == 0 and outcome.baseline_passed > 0
        proposal.post_test_passed = outcome.post_failed == 0 and outcome.post_passed > 0
        proposal.preservation_gate_status = outcome.gate_status
    db.commit()

    return VerificationResultResponse(
        proposal_id=proposals[0].id if proposals else None,
        baseline_passed=outcome.baseline_passed,
        baseline_failed=outcome.baseline_failed,
        post_passed=outcome.post_passed,
        post_failed=outcome.post_failed,
        regressions_detected=outcome.regressions,
        behavior_diffs=outcome.behavior_diffs,
        preservation_status=outcome.gate_status,
        execution_output=outcome.output_log,
        duration_seconds=outcome.duration_seconds
    )

@router.get("/{project_id}/visual-regression")
def get_visual_regression(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    source_dir = Path(project.workspace_path)
    modernized_dir = source_dir.parent / "modernized"

    orig_html = ""
    mod_html = ""

    # Check database inspection first
    insp = db.query(WebsiteInspection).filter(WebsiteInspection.project_id == project_id).first()
    if insp:
        orig_html = insp.raw_html
        mod_html = insp.redesign_prototype_html
    elif (source_dir / "index.html").exists():
        orig_html = (source_dir / "index.html").read_text(encoding="utf-8", errors="ignore")
        if (modernized_dir / "index.html").exists():
            mod_html = (modernized_dir / "index.html").read_text(encoding="utf-8", errors="ignore")

    if not orig_html:
        return {
            "has_visual_data": False,
            "message": "No HTML or website frontend components discovered in this project workspace."
        }

    metrics = VerificationService.compare_visual_dom(orig_html, mod_html or orig_html)
    return {
        "has_visual_data": True,
        "project_id": project_id,
        "metrics": metrics
    }
