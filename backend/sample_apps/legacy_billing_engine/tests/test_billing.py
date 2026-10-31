import pytest
from billing import calculate_discount, apply_late_penalty, evaluate_grace_period, compute_total_invoice

def test_gold_customer_discount():
    # Gold tier gets 15% discount over 500
    discount = calculate_discount("GOLD", 1000.0)
    assert discount == 150.0

def test_standard_customer_no_discount():
    discount = calculate_discount("STANDARD", 1000.0)
    assert discount == 0.0

def test_late_penalty_application():
    penalty = apply_late_penalty(200.0, 45)
    assert penalty == 10.0

def test_total_invoice_computation():
    total = compute_total_invoice(1000.0, "GOLD", 0, tax_exempt=True)
    # 1000 - 150 = 850
    assert total == 850.0
