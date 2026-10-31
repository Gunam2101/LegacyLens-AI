from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db, Project
from app.schemas.schemas import ProjectCreate, ProjectResponse
from app.services.archive_service import ArchiveService

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    proj = Project(
        name=data.name,
        description=data.description or "",
        source_type=data.source_type or "zip"
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
