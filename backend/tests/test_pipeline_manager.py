import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.pipeline_manager import PipelineManager

@pytest.mark.asyncio
async def test_pipeline_manager_deduplication_and_streaming():
    pm = PipelineManager()
    project_id = "test-proj-dedup-1"

    # Mock AgentOrchestrator.run_investigation_pipeline to yield 3 events with delay
    async def mock_generator(session, pid):
        yield {"stage": "Input Validation", "progress": 10, "message": "Stage 1"}
        await asyncio.sleep(0.05)
        yield {"stage": "Dependency Analysis", "progress": 50, "message": "Stage 2"}
        await asyncio.sleep(0.05)
        yield {"stage": "Complete", "progress": 100, "message": "Finished"}

    with patch("app.agents.orchestrator.AgentOrchestrator.run_investigation_pipeline", side_effect=mock_generator):
        # First start should return True
        started_first = await pm.start_job(project_id)
        assert started_first is True
        assert pm.is_running(project_id) is True

        # Second concurrent start should return False (prevent duplicate pipeline runs)
        started_second = await pm.start_job(project_id)
        assert started_second is False

        # Subscriber connects
        queue = await pm.subscribe(project_id)

        received_events = []
        while True:
            event = await queue.get()
            if event is None:
                break
            received_events.append(event)

        await pm.unsubscribe(project_id, queue)

        assert len(received_events) == 3
        assert received_events[0]["stage"] == "Input Validation"
        assert received_events[1]["stage"] == "Dependency Analysis"
        assert received_events[2]["stage"] == "Complete"

        # After pipeline finishes, is_running should be False
        assert pm.is_running(project_id) is False

        # History should contain all 3 events
        history = pm.get_history(project_id)
        assert len(history) == 3
