import json
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.models.database import get_db, Project, AnalysisEvent, SessionLocal
from app.services.pipeline_manager import pipeline_manager
from app.llm.provider import llm_provider
from app.schemas.schemas import AnalysisEventResponse, TokenUsageResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/{project_id}/start")
async def start_analysis(project_id: str, db: Session = Depends(get_db)):
    """Starts autonomous investigation pipeline in the background if not already running."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "analyzing"
    db.commit()

    started = await pipeline_manager.start_job(project_id)
    return {
        "status": "started" if started else "already_running",
        "project_id": project_id,
        "message": "Autonomous investigation launched." if started else "Autonomous investigation already in progress."
    }

@router.get("/{project_id}/stream")
async def stream_analysis(project_id: str):
    """Server-Sent Events (SSE) stream for real-time analysis progress without duplicate execution."""
    session = SessionLocal()
    try:
        project = session.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project_status = project.status
    finally:
        session.close()

    async def event_generator():
        # Case 1: Job is not running but already completed or failed
        if not pipeline_manager.is_running(project_id) and project_status in ("analyzed", "failed"):
            db_session = SessionLocal()
            try:
                events = db_session.query(AnalysisEvent).filter(
                    AnalysisEvent.project_id == project_id
                ).order_by(AnalysisEvent.timestamp.asc()).all()
                for ev in events:
                    ev_dict = {
                        "id": ev.id,
                        "stage": ev.stage,
                        "progress": ev.progress,
                        "message": ev.message,
                        "level": ev.level,
                        "timestamp": ev.timestamp.isoformat() if ev.timestamp else "",
                        "token_usage": getattr(ev, "token_usage", None)
                    }
                    yield f"data: {json.dumps(ev_dict)}\n\n"
                    await asyncio.sleep(0.01)
            finally:
                db_session.close()
            return

        # Case 2: Job is not running and needs to be started
        if not pipeline_manager.is_running(project_id):
            await pipeline_manager.start_job(project_id)

        # Case 3: Subscribe to live job and replay buffer
        queue = await pipeline_manager.subscribe(project_id)
        seen_events = set()
        try:
            # Replay any events already buffered in history
            history = pipeline_manager.get_history(project_id)
            for ev in history:
                ev_key = (ev.get("stage"), ev.get("progress"), ev.get("message"))
                if ev_key not in seen_events:
                    seen_events.add(ev_key)
                    yield f"data: {json.dumps(ev)}\n\n"

            # Stream remaining live events
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield ": keep-alive\n\n"
                    continue

                if event is None:
                    # Pipeline completed
                    break

                ev_key = (event.get("stage"), event.get("progress"), event.get("message"))
                if ev_key not in seen_events:
                    seen_events.add(ev_key)
                    yield f"data: {json.dumps(event)}\n\n"

                if event.get("progress") == 100 or event.get("stage") in ("Complete", "Pipeline Error"):
                    break
        finally:
            await pipeline_manager.unsubscribe(project_id, queue)

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

@router.get("/{project_id}/token-usage", response_model=TokenUsageResponse)
def get_token_usage(project_id: str, db: Session = Depends(get_db)):
    """
    Returns actual AI token usage metadata for the project.
    First checks the active tracker for real-time progress, then persisted project stats.
    Returns 'available': False if no model usage occurred.
    """
    # 1. Active live analysis tracker
    live_usage = llm_provider.get_project_token_usage(project_id)
    if live_usage and live_usage.get("available"):
        return live_usage

    # 2. Persisted stats on project record
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stats = project.stats or {}
    persisted_usage = stats.get("token_usage")
    if persisted_usage and isinstance(persisted_usage, dict) and persisted_usage.get("available"):
        return persisted_usage

    return {
        "available": False,
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "calls_count": 0,
        "provider": None,
        "model": None,
        "models": {},
        "reason": "Token usage unavailable",
        "last_updated": None
    }
