-- Migration 001: Add intake_forms table
-- Run: psql $DATABASE_URL -f server/migrations/001_add_intake_forms.sql

CREATE TABLE IF NOT EXISTS intake_forms (
  id               SERIAL PRIMARY KEY,
  contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  practice_area    VARCHAR(100) NOT NULL,
  form_data        JSONB NOT NULL DEFAULT '{}',
  status           VARCHAR(50) DEFAULT 'Draft',
  conflict_check_completed BOOLEAN DEFAULT FALSE,
  conflict_check_cleared   BOOLEAN DEFAULT FALSE,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_forms_contact       ON intake_forms(contact_id);
CREATE INDEX IF NOT EXISTS idx_intake_forms_practice_area ON intake_forms(practice_area);
CREATE INDEX IF NOT EXISTS idx_intake_forms_created_at    ON intake_forms(created_at DESC);

CREATE TRIGGER trg_intake_forms_updated
  BEFORE UPDATE ON intake_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
