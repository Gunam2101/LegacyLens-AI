import json
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, AnalysisEvent, SessionLocal
from app.agents.orchestrator import AgentOrchestrator
from app.schemas.schemas import AnalysisEventResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/{project_id}/start")
async def start_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "analyzing"
    db.commit()

    async def run_in_bg():
        session = SessionLocal()
        try:
            async for _ in AgentOrchestrator.run_investigation_pipeline(session, project_id):
                pass
        finally:
            session.close()

    background_tasks.add_task(run_in_bg)
    return {"status": "started", "project_id": project_id, "message": "Autonomous investigation launched."}

@router.get("/{project_id}/stream")
async def stream_analysis(project_id: str):
    """Server-Sent Events (SSE) stream for real-time analysis progress."""
    async def event_generator():
        session = SessionLocal()
        try:
            async for event in AgentOrchestrator.run_investigation_pipeline(session, project_id):
                payload = f"data: {json.dumps(event)}\n\n"
                yield payload
        finally:
            session.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/{project_id}/events", response_model=List[AnalysisEventResponse])
def get_analysis_events(project_id: str, db: Session = Depends(get_db)):
    return db.query(AnalysisEvent).filter(AnalysisEvent.project_id == project_id).order_by(AnalysisEvent.timestamp.asc()).all()
