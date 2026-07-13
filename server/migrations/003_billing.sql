-- Migration 003: Billing tables
-- Run: psql $DATABASE_URL -f server/migrations/003_billing.sql

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

CREATE TABLE IF NOT EXISTS time_entries (
  id          SERIAL PRIMARY KEY,
  matter_id   INTEGER REFERENCES matters(id)  ON DELETE SET NULL,
  user_id     INTEGER REFERENCES users(id)    ON DELETE SET NULL,
  date        DATE          NOT NULL,
  description TEXT          NOT NULL,
  hours       NUMERIC(6,2)  NOT NULL DEFAULT 0,
  rate        NUMERIC(10,2) NOT NULL DEFAULT 0,
  billable    BOOLEAN       DEFAULT TRUE,
  status      VARCHAR(20)   DEFAULT 'unbilled',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  invoice_number INTEGER       DEFAULT nextval('invoice_number_seq'),
  matter_id      INTEGER REFERENCES matters(id)  ON DELETE SET NULL,
  contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  invoice_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  status         VARCHAR(20)   DEFAULT 'unpaid',
  payment_method VARCHAR(100),
  notes          TEXT,
  total_amount   NUMERIC(12,2) DEFAULT 0,
  amount_paid    NUMERIC(12,2) DEFAULT 0,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT          NOT NULL,
  quantity    NUMERIC(8,2)  DEFAULT 1,
  rate        NUMERIC(10,2) DEFAULT 0,
  amount      NUMERIC(12,2) DEFAULT 0,
  entry_id    INTEGER REFERENCES time_entries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_entries_matter  ON time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user    ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status  ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_invoices_matter      ON invoices(matter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id);

CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
