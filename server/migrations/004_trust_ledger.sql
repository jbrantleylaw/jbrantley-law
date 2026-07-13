-- Migration 004: Trust ledger table
-- Run: psql $DATABASE_URL -f server/migrations/004_trust_ledger.sql

CREATE TABLE IF NOT EXISTS trust_ledger (
  id               SERIAL PRIMARY KEY,
  matter_id        INTEGER REFERENCES matters(id)  ON DELETE SET NULL,
  transaction_type VARCHAR(50)   NOT NULL,
  date             DATE          NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  description      TEXT,
  reference_number VARCHAR(100),
  balance_after    NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_id       INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  created_by       INTEGER REFERENCES users(id)    ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_ledger_matter ON trust_ledger(matter_id);
CREATE INDEX IF NOT EXISTS idx_trust_ledger_date   ON trust_ledger(date DESC);
