import pytest
from app.llm.provider import LLMProvider
from app.analyzers.sql_analyzer import SQLAnalyzer

def test_llm_json_cleaning_and_parsing():
    dirty_json = """```json
    [
        {"rule_code": "BR-001", "status": "verified", "confidence": 0.95, "user_notes": "Cleaned correctly"}
    ]
    ```"""
    parsed = LLMProvider._clean_and_parse_json(dirty_json)
    assert isinstance(parsed, list)
    assert parsed[0]["rule_code"] == "BR-001"
    assert parsed[0]["status"] == "verified"

@pytest.mark.asyncio
async def test_llm_caching():
    provider = LLMProvider()
    rules = [{"rule_code": "BR-TEST-1", "description": "Payment amount limit check", "evidence_quote": "amount <= 5000", "source_file": "core.py"}]
    docs = [{"filename": "policy.md", "doc_type": "policy", "content": "Payment amount limit is 5000"}]

    res1 = await provider.correlate_evidence_and_rules(rules, docs)
    assert len(provider._correlation_cache) == 1

    # Second call should use cache
    res2 = await provider.correlate_evidence_and_rules(rules, docs)
    assert res1 == res2
    assert len(provider._correlation_cache) == 1

def test_sql_analyzer_line_number_accuracy():
    sql_content = """-- Header comment
-- More comments
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    status VARCHAR(20),
    balance DECIMAL(15, 2),
    CHECK (balance >= 0.0)
);

CREATE TABLE transactions (
    id INT PRIMARY KEY,
    account_id INT,
    amount DECIMAL(15, 2),
    CHECK (amount > 0.0)
);
"""
    analyzer = SQLAnalyzer()
    res = analyzer.analyze("schema.sql", sql_content, "schema.sql")

    # Table 'accounts' should start on line 3
    accounts_entity = next((e for e in res.entities if e.name == "accounts"), None)
    assert accounts_entity is not None
    assert accounts_entity.line_start == 3

    # Table 'transactions' should start on line 10
    txn_entity = next((e for e in res.entities if e.name == "transactions"), None)
    assert txn_entity is not None
    assert txn_entity.line_start == 10

    # Check constraint on accounts (balance >= 0.0) should be at line 7
    chk_rules = [r for r in res.rules if "balance" in r.evidence_quote]
    assert len(chk_rules) > 0
    assert chk_rules[0].line_start == 7
