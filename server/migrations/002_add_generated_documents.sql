-- Migration 002: Add generated_documents table
-- Run: psql $DATABASE_URL -f server/migrations/002_add_generated_documents.sql

CREATE TABLE IF NOT EXISTS generated_documents (
  id             SERIAL PRIMARY KEY,
  template_key   VARCHAR(100)  NOT NULL,
  document_name  VARCHAR(255)  NOT NULL,
  document_type  VARCHAR(10)   DEFAULT 'docx',
  practice_area  VARCHAR(100),
  file_path      VARCHAR(500)  NOT NULL,
  generated_data JSONB         NOT NULL DEFAULT '{}',
  matter_id      INTEGER       REFERENCES matters(id)  ON DELETE SET NULL,
  contact_id     INTEGER       REFERENCES contacts(id) ON DELETE SET NULL,
  created_by     INTEGER       REFERENCES users(id)    ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gen_docs_template    ON generated_documents(template_key);
CREATE INDEX IF NOT EXISTS idx_gen_docs_matter      ON generated_documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_created_at  ON generated_documents(created_at DESC);
