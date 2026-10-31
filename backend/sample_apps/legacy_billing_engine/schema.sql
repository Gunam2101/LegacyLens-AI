-- Legacy Invoicing Database Schema
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'STANDARD',
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_tier CHECK (tier IN ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM'))
);

CREATE TABLE invoices (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) REFERENCES customers(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_amount CHECK (amount >= 0)
);

-- Settlement query used by batch runner
SELECT * FROM invoices WHERE status = 'PENDING' AND amount > 0;
