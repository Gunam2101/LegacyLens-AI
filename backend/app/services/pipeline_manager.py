import asyncio
import logging
from typing import Dict, List, Any, Optional
from app.models.database import SessionLocal, Project, AnalysisEvent

logger = logging.getLogger(__name__)

class PipelineManager:
    _instance: Optional["PipelineManager"] = None

    def __init__(self):
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._event_history: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "PipelineManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_running(self, project_id: str) -> bool:
        task = self._active_tasks.get(project_id)
        return task is not None and not task.done()

    async def start_job(self, project_id: str) -> bool:
        """
        Starts the pipeline in the background if not already running.
        Returns True if a new job was launched, False if already running.
        """
        async with self._lock:
            if self.is_running(project_id):
                logger.info(f"Pipeline job for project {project_id} is already actively running.")
                return False

            self._subscribers.setdefault(project_id, [])
            self._event_history[project_id] = []

            # Launch background runner task
            task = asyncio.create_task(self._run_pipeline(project_id))
            self._active_tasks[project_id] = task
            return True

    async def _run_pipeline(self, project_id: str):
        from app.agents.orchestrator import AgentOrchestrator
        session = SessionLocal()
        try:
            async for event in AgentOrchestrator.run_investigation_pipeline(session, project_id):
                # Append to history
                if project_id in self._event_history:
                    self._event_history[project_id].append(event)
                # Broadcast to all active SSE queues
                subs = list(self._subscribers.get(project_id, []))
                for q in subs:
                    try:
                        await q.put(event)
                    except Exception as err:
                        logger.warning(f"Failed to put event into subscriber queue: {err}")
        except Exception as e:
            logger.error(f"Pipeline execution error for project {project_id}: {e}", exc_info=True)
            err_event = {
                "stage": "Pipeline Error",
                "progress": 100,
                "message": f"Execution error: {str(e)}",
                "level": "error"
            }
            if project_id in self._event_history:
                self._event_history[project_id].append(err_event)
            subs = list(self._subscribers.get(project_id, []))
            for q in subs:
                try:
                    await q.put(err_event)
                except Exception:
                    pass
        finally:
            session.close()
            # Send sentinel None to notify subscribers that execution ended
            subs = list(self._subscribers.get(project_id, []))
            for q in subs:
                try:
                    await q.put(None)
                except Exception:
                    pass
            async with self._lock:
                if project_id in self._active_tasks:
                    del self._active_tasks[project_id]

    async def subscribe(self, project_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._subscribers.setdefault(project_id, []).append(queue)
        return queue

    async def unsubscribe(self, project_id: str, queue: asyncio.Queue):
        async with self._lock:
            if project_id in self._subscribers and queue in self._subscribers[project_id]:
                self._subscribers[project_id].remove(queue)
                if not self._subscribers[project_id]:
                    del self._subscribers[project_id]

    def get_history(self, project_id: str) -> List[Dict[str, Any]]:
        return list(self._event_history.get(project_id, []))

pipeline_manager = PipelineManager.get_instance()
