import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_synthetic_benchmark_workflow():
    # 1. Trigger synthetic application benchmark
    res = client.post("/api/v1/benchmark/run-synthetic")
    assert res.status_code == 200, res.text
    data = res.json()
    
    assert data["status"] == "completed"
    proj_id = data["benchmark_id"]
    metrics = data["metrics"]
    gt = data["ground_truth_verification"]

    # Verify Business Rule Reconstruction
    assert metrics["business_rule_recall"] >= 0.8
    assert metrics["business_rule_precision"] == 1.0
    assert gt["rule_discount_detected"] is True
    assert gt["rule_late_penalty_detected"] is True
    assert gt["rule_grace_period_detected"] is True
    assert gt["rule_tax_detected"] is True
    assert gt["rule_sql_check_detected"] is True

    # Verify Multi-Signal Obsolete Code Investigation
    assert gt["obsolete_fax_properly_flagged"] is True
    assert gt["compliance_logger_protected"] is True
    assert metrics["obsolete_false_positive_rate"] == 0.0

    # Verify Behaviour Gate & Tests
    assert metrics["baseline_tests_passed"] == 4
    assert metrics["baseline_tests_failed"] == 0
    assert metrics["test_suite_execution_status"] == "PASS"

    # Verify Evidence-Triggered Replanning with INC-4092
    assert metrics["replanning_trigger_verified"] is True
    assert metrics["conflicting_rules_flagged"] >= 1
    assert gt["incident_inc4092_replan_conflict_flagged"] is True

    # 2. Test Report Download endpoints
    res_md = client.get(f"/api/v1/reports/{proj_id}/markdown")
    assert res_md.status_code == 200
    assert "LegacyLens AI Modernization Report" in res_md.text

    res_json = client.get(f"/api/v1/reports/{proj_id}/data")
    assert res_json.status_code == 200
    report_data = res_json.json()
    assert len(report_data["business_rules"]) > 0
    assert len(report_data["modernization_plan"]) == 5

    res_html = client.get(f"/api/v1/reports/{proj_id}/html")
    assert res_html.status_code == 200
    assert "<h1>LegacyLens AI Modernization Report</h1>" in res_html.text

    # 3. Test Business Rule User Override & Audit Trail
    rules = report_data["business_rules"]
    rule_code = rules[0]["rule_code"]
    
    # Fetch rule by rule_code to get its ID
    res_rules = client.get(f"/api/v1/business-rules/{proj_id}")
    assert res_rules.status_code == 200
    rule_obj = res_rules.json()[0]
    rule_id = rule_obj["id"]

    # User confirms the rule
    patch_res = client.patch(
        f"/api/v1/business-rules/rule/{rule_id}/status",
        json={"status": "user_confirmed", "reason": "Verified against corporate charter", "user_notes": "Sign-off by Lead Architect"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "user_confirmed"

    # Verify Audit Trail
    audit_res = client.get(f"/api/v1/business-rules/rule/{rule_id}/audit")
    assert audit_res.status_code == 200
    audit_entries = audit_res.json()
    assert len(audit_entries) >= 1
    assert audit_entries[0]["new_status"] == "user_confirmed"
    assert "corporate charter" in audit_entries[0]["reason"]
