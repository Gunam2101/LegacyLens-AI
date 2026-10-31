"""
Legacy Billing Engine - Core Invoicing and Calculation Logic
Contains business rules for tiered pricing, penalties, and tax calculation.
"""

def calculate_discount(customer_tier: str, amount: float) -> float:
    # Rule BR-TIER: Gold tier gets 15% discount for invoices over $500
    if customer_tier == "GOLD" and amount > 500:
        return amount * 0.15
    elif customer_tier == "SILVER" and amount > 1000:
        return amount * 0.08
    return 0.0

def apply_late_penalty(balance: float, days_overdue: int) -> float:
    # Rule BR-PENALTY: Late fee applied if overdue > 30 days
    if days_overdue > 30:
        return balance * 0.05
    return 0.0

def evaluate_grace_period(days_overdue: int, is_weekend: bool) -> bool:
    # Rule BR-GRACE: Code currently enforces 3-day grace period
    # Note: Conflicted by Incident Report INC-4092 which requires 7 days
    if is_weekend and days_overdue <= 3:
        return True
    return False

def compute_total_invoice(amount: float, customer_tier: str, days_overdue: int, tax_exempt: bool = False) -> float:
    discount = calculate_discount(customer_tier, amount)
    subtotal = amount - discount
    penalty = apply_late_penalty(subtotal, days_overdue)
    
    # Rule BR-TAX: Tax exemption overrides standard 8.25% state tax
    if tax_exempt:
        tax = 0.0
    else:
        tax = subtotal * 0.0825
        
    return round(subtotal + penalty + tax, 2)
