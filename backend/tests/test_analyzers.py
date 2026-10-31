import pytest
from app.analyzers.python_analyzer import PythonAnalyzer
from app.analyzers.javascript_analyzer import JavaScriptAnalyzer
from app.analyzers.sql_analyzer import SQLAnalyzer

def test_python_analyzer_ast():
    code = '''
import os
from math import ceil

class PricingEngine:
    def evaluate(self, tier: str, amount: float):
        """Rule: Tier Gold receives preferential pricing."""
        if tier == "GOLD" and amount > 500:
            return amount * 0.85
        return amount
'''
    analyzer = PythonAnalyzer()
    res = analyzer.analyze("pricing.py", code, "pricing.py")
    
    assert res.metrics["lines_of_code"] > 0
    # Check classes and methods detected
    class_names = [e.name for e in res.entities if e.entity_type == "class"]
    assert "PricingEngine" in class_names
    
    # Check rule extraction
    assert len(res.rules) >= 1
    rule = next(r for r in res.rules if "GOLD" in r.evidence_quote)
    assert rule.line_start is not None
    assert rule.evidence_type in ("source_code", "documentation")

def test_javascript_analyzer():
    code = '''
import express from 'express';
const router = express.Router();

router.post('/checkout', (req, res) => {
    if (order.total > 1000) {
        applyVipStatus();
    }
});
'''
    analyzer = JavaScriptAnalyzer()
    res = analyzer.analyze("checkout.js", code, "checkout.js")
    
    endpoints = [e.name for e in res.entities if e.entity_type == "endpoint"]
    assert "POST /checkout" in endpoints
    assert len(res.rules) >= 1

def test_sql_analyzer():
    sql = '''
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    balance DECIMAL(10, 2),
    status VARCHAR(20),
    CONSTRAINT chk_positive CHECK (balance >= 0)
);

SELECT * FROM accounts WHERE status = 'ACTIVE' AND balance > 100;
'''
    analyzer = SQLAnalyzer()
    res = analyzer.analyze("schema.sql", sql, "schema.sql")
    
    table_names = [e.name for e in res.entities if e.entity_type == "table"]
    assert "accounts" in table_names
    assert len(res.rules) >= 1
