import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, EvidenceDocument
from app.services.archive_service import ArchiveService
from app.core.config import settings
from app.schemas.schemas import EvidenceDocumentResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.post("/{project_id}/zip")
async def upload_project_zip(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported")

    # Save to temporary upload location
    temp_zip = settings.UPLOAD_DIR / f"{project_id}_{file.filename}"
    try:
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    # Inspect and validate ZIP
    validation = ArchiveService.inspect_and_validate_zip(temp_zip)
    if not validation.is_valid:
        if temp_zip.exists():
            temp_zip.unlink()
        raise HTTPException(status_code=400, detail=f"Invalid or unsafe archive: {validation.error}")

    # Extract safely
    source_dir = Path(project.workspace_path)
    modernized_dir = source_dir.parent / "modernized"
    
    try:
        extracted = ArchiveService.extract_safely(temp_zip, source_dir)
        # Duplicate to modernized workspace
        ArchiveService.sync_to_modernized_workspace(source_dir, modernized_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")
    finally:
        if temp_zip.exists():
            temp_zip.unlink()

    return {
        "status": "success",
        "message": f"Successfully extracted {len(extracted)} files safely.",
        "file_count": validation.file_count,
        "total_uncompressed_bytes": validation.total_size_bytes,
        "files_sample": extracted[:15]
    }

@router.post("/{project_id}/evidence", response_model=EvidenceDocumentResponse)
async def upload_evidence_document(
    project_id: str,
    file: UploadFile = File(None),
    filename: str = Form(None),
    doc_type: str = Form("incident_report"), # incident_report, change_ticket, documentation
    content: str = Form(None),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    text_content = ""
    doc_name = filename or "evidence.txt"

    if file:
        doc_name = file.filename
        raw_bytes = await file.read()
        text_content = raw_bytes.decode("utf-8", errors="ignore")
    elif content:
        text_content = content
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file or text content")

    doc = EvidenceDocument(
        project_id=project_id,
        filename=doc_name,
        doc_type=doc_type,
        content=text_content,
        summary=text_content[:300].strip()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
