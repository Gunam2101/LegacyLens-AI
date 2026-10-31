import pytest
from app.llm.provider import LLMProvider, TokenTracker
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class MockGeminiUsageObj:
    def __init__(self, prompt: int, candidates: int, total: int):
        self.prompt_token_count = prompt
        self.candidates_token_count = candidates
        self.total_token_count = total

class MockGeminiResponseObj:
    def __init__(self, usage):
        self.usage_metadata = usage

class MockGeminiUsageCamelObj:
    def __init__(self, prompt: int, candidates: int, total: int):
        self.promptTokenCount = prompt
        self.candidatesTokenCount = candidates
        self.totalTokenCount = total

class MockOpenAIUsageObj:
    def __init__(self, prompt: int, completion: int, total: int):
        self.prompt_tokens = prompt
        self.completion_tokens = completion
        self.total_tokens = total

class MockOpenAIResponseObj:
    def __init__(self, usage):
        self.usage = usage


def test_gemini_usage_metadata_extraction():
    # 1. Object with snake_case
    resp1 = MockGeminiResponseObj(MockGeminiUsageObj(420, 85, 505))
    usage1 = LLMProvider.extract_gemini_usage(resp1, "gemini-2.5-flash")
    assert usage1 is not None
    assert usage1["input_tokens"] == 420
    assert usage1["output_tokens"] == 85
    assert usage1["total_tokens"] == 505
    assert usage1["provider"] == "gemini"
    assert usage1["model"] == "gemini-2.5-flash"

    # 2. Object with camelCase
    resp2 = MockGeminiResponseObj(MockGeminiUsageCamelObj(310, 60, 370))
    usage2 = LLMProvider.extract_gemini_usage(resp2, "gemini-2.5-flash")
    assert usage2 is not None
    assert usage2["input_tokens"] == 310
    assert usage2["output_tokens"] == 60
    assert usage2["total_tokens"] == 370

    # 3. Dict usage metadata
    resp3 = MockGeminiResponseObj({"promptTokenCount": 500, "candidatesTokenCount": 120, "totalTokenCount": 620})
    usage3 = LLMProvider.extract_gemini_usage(resp3, "gemini-2.5-flash")
    assert usage3 is not None
    assert usage3["input_tokens"] == 500
    assert usage3["output_tokens"] == 120
    assert usage3["total_tokens"] == 620


def test_openai_usage_extraction():
    resp = MockOpenAIResponseObj(MockOpenAIUsageObj(800, 200, 1000))
    usage = LLMProvider.extract_openai_usage(resp, "gpt-4o-mini")
    assert usage is not None
    assert usage["input_tokens"] == 800
    assert usage["output_tokens"] == 200
    assert usage["total_tokens"] == 1000
    assert usage["provider"] == "openai"


def test_missing_usage_metadata_graceful_handling():
    # Response with no usage_metadata attribute
    empty_resp = object()
    usage = LLMProvider.extract_gemini_usage(empty_resp, "gemini-2.5-flash")
    assert usage is None

    # Response with None usage_metadata
    none_resp = MockGeminiResponseObj(None)
    assert LLMProvider.extract_gemini_usage(none_resp, "gemini-2.5-flash") is None


def test_token_tracker_aggregation_and_deduplication():
    tracker = TokenTracker()
    proj_id = "test-proj-token-1"

    # First model call
    res1 = tracker.record_call(
        project_id=proj_id,
        input_tokens=1000,
        output_tokens=250,
        total_tokens=1250,
        provider="gemini",
        model="gemini-2.5-flash",
        call_hash="call_hash_1"
    )
    assert res1 is True

    # Duplicate call notification should be ignored
    res_dup = tracker.record_call(
        project_id=proj_id,
        input_tokens=1000,
        output_tokens=250,
        total_tokens=1250,
        provider="gemini",
        model="gemini-2.5-flash",
        call_hash="call_hash_1"
    )
    assert res_dup is False

    # Second distinct model call
    res2 = tracker.record_call(
        project_id=proj_id,
        input_tokens=500,
        output_tokens=150,
        total_tokens=650,
        provider="gemini",
        model="gemini-2.5-flash",
        call_hash="call_hash_2"
    )
    assert res2 is True

    # Verify accurate aggregation
    data = tracker.get_project_usage(proj_id)
    assert data["available"] is True
    assert data["input_tokens"] == 1500
    assert data["output_tokens"] == 400
    assert data["total_tokens"] == 1900
    assert data["calls_count"] == 2
    assert "gemini-2.5-flash" in data["models"]
    assert data["models"]["gemini-2.5-flash"]["calls"] == 2


def test_token_tracker_multi_model_breakdown():
    tracker = TokenTracker()
    proj_id = "test-proj-multi-model"

    # Gemini call
    tracker.record_call(
        project_id=proj_id,
        input_tokens=1200,
        output_tokens=300,
        total_tokens=1500,
        provider="gemini",
        model="gemini-2.5-flash",
        call_hash="gemini_call_1"
    )

    # OpenAI call
    tracker.record_call(
        project_id=proj_id,
        input_tokens=800,
        output_tokens=200,
        total_tokens=1000,
        provider="openai",
        model="gpt-4o-mini",
        call_hash="openai_call_1"
    )

    data = tracker.get_project_usage(proj_id)
    assert data["available"] is True
    assert data["input_tokens"] == 2000
    assert data["output_tokens"] == 500
    assert data["total_tokens"] == 2500
    assert data["calls_count"] == 2
    assert data["models"]["gemini-2.5-flash"]["total_tokens"] == 1500
    assert data["models"]["gpt-4o-mini"]["total_tokens"] == 1000


def test_token_usage_endpoint(monkeypatch):
    # Create test project
    create_res = client.post("/api/v1/projects", json={
        "name": "Token Usage API Test App",
        "description": "API verification project",
        "source_type": "sample"
    })
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # Before model run: token usage is unavailable
    res_before = client.get(f"/api/v1/analysis/{proj_id}/token-usage")
    assert res_before.status_code == 200
    data_before = res_before.json()
    assert data_before["available"] is False
    assert data_before["reason"] == "Token usage unavailable"
    assert data_before["total_tokens"] == 0

    # Simulate recorded token usage
    from app.llm.provider import llm_provider
    llm_provider.token_tracker.record_call(
        project_id=proj_id,
        input_tokens=750,
        output_tokens=120,
        total_tokens=870,
        provider="gemini",
        model="gemini-2.5-flash"
    )

    # After model run: token usage is available
    res_after = client.get(f"/api/v1/analysis/{proj_id}/token-usage")
    assert res_after.status_code == 200
    data_after = res_after.json()
    assert data_after["available"] is True
    assert data_after["input_tokens"] == 750
    assert data_after["output_tokens"] == 120
    assert data_after["total_tokens"] == 870
    assert data_after["provider"] == "gemini"
    assert data_after["model"] == "gemini-2.5-flash"
