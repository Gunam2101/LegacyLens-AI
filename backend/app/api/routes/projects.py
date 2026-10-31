from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, WebsiteInspection, CodeProposal
from app.schemas.schemas import (
    ProjectCreate, ProjectResponse, FileTreeResponse, FileContentResponse,
    WebsiteInspectionResponse
)
from app.services.archive_service import ArchiveService
from app.services.workspace_inspector import WorkspaceInspectorService
from app.services.change_control import ChangeControlService
from app.services.git_service import GitService
from app.core.security import validate_and_normalize_url, SecurityError

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    source_type = data.source_type or "zip"
    source_url = ""

    # Validate based on source type
    if source_type == "url":
        if not data.source_url:
            raise HTTPException(status_code=400, detail="Website URL is required when source type is 'url'")
        try:
            source_url = validate_and_normalize_url(data.source_url)
        except SecurityError as se:
            raise HTTPException(status_code=400, detail=f"Invalid or prohibited URL: {str(se)}")

    elif source_type == "git":
        if not data.source_url:
            raise HTTPException(status_code=400, detail="Git repository URL is required when source type is 'git'")
        try:
            source_url = GitService.validate_repo_url(data.source_url)
        except SecurityError as se:
            raise HTTPException(status_code=400, detail=f"Invalid Git URL: {str(se)}")

    proj = Project(
        name=data.name,
        description=data.description or "",
        source_type=source_type,
        source_url=source_url,
        source_branch=data.source_branch or "main"
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # Initialize workspace dirs
    source_dir, modernized_dir = ArchiveService.create_modernized_workspace(proj.id)
    proj.workspace_path = str(source_dir)
    db.commit()
    db.refresh(proj)

    return proj

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return None

@router.get("/{project_id}/file-tree", response_model=FileTreeResponse)
def get_file_tree(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    source_dir = Path(proj.workspace_path)
    modernized_dir = source_dir.parent / "modernized"
    return WorkspaceInspectorService.get_file_tree(project_id, source_dir, modernized_dir)

@router.get("/{project_id}/file-content", response_model=FileContentResponse)
def get_file_content(
    project_id: str,
    path: str = Query(..., description="Relative file path within workspace"),
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    source_dir = Path(proj.workspace_path)
    modernized_dir = source_dir.parent / "modernized"

    try:
        return WorkspaceInspectorService.get_file_content(project_id, source_dir, modernized_dir, path)
    except SecurityError as se:
        raise HTTPException(status_code=400, detail=str(se))

@router.get("/{project_id}/website-inspection", response_model=WebsiteInspectionResponse)
def get_website_inspection(project_id: str, db: Session = Depends(get_db)):
    insp = db.query(WebsiteInspection).filter(WebsiteInspection.project_id == project_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="No website inspection findings recorded for this project")
    return insp

@router.get("/{project_id}/patch")
def get_project_patch(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    patch_text = ChangeControlService.generate_unified_patch(db, project_id)
    return Response(
        content=patch_text,
        media_type="text/x-diff",
        headers={"Content-Disposition": f"attachment; filename=legacylens_{project_id[:8]}.patch"}
    )
