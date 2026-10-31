import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "LegacyLens AI" in data["app"]

def test_project_crud():
    # 1. Create Project
    res = client.post("/api/v1/projects", json={"name": "Test Legacy App", "description": "Banking app"})
    assert res.status_code == 201
    proj = res.json()
    proj_id = proj["id"]
    assert proj["name"] == "Test Legacy App"

    # 2. Get Project
    res_get = client.get(f"/api/v1/projects/{proj_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == proj_id

    # 3. List Projects
    res_list = client.get("/api/v1/projects")
    assert res_list.status_code == 200
    assert any(p["id"] == proj_id for p in res_list.json())

    # 4. Cleanup
    res_del = client.delete(f"/api/v1/projects/{proj_id}")
    assert res_del.status_code == 204

def test_settings_api():
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()
    assert "active_provider_info" in data
    assert "limits" in data
