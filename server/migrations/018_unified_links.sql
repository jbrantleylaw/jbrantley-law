-- 018_unified_links.sql
-- Cross-module integration: unified link columns, notes, folders, activity log

-- ── Link columns on existing tables ─────────────────────────────────────────

ALTER TABLE documents         ADD COLUMN IF NOT EXISTS contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE documents         ADD COLUMN IF NOT EXISTS folder_id        INTEGER;
ALTER TABLE documents         ADD COLUMN IF NOT EXISTS document_source  VARCHAR(50) DEFAULT 'upload';

ALTER TABLE tasks             ADD COLUMN IF NOT EXISTS contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE time_entries      ADD COLUMN IF NOT EXISTS contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE invoices          ADD COLUMN IF NOT EXISTS contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE matter_workflow_tasks ADD COLUMN IF NOT EXISTS contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

-- ── document_folders ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_folders (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  parent_id   INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
  matter_id   INTEGER REFERENCES matters(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_folders_matter    ON document_folders(matter_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent    ON document_folders(parent_id);

-- ── notes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id          SERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  matter_id   INTEGER REFERENCES matters(id)   ON DELETE SET NULL,
  contact_id  INTEGER REFERENCES contacts(id)  ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id)     ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_matter   ON notes(matter_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact  ON notes(contact_id);

-- ── activity_log ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  event_type  VARCHAR(100) NOT NULL,
  description TEXT,
  matter_id   INTEGER REFERENCES matters(id)   ON DELETE SET NULL,
  contact_id  INTEGER REFERENCES contacts(id)  ON DELETE SET NULL,
  user_id     INTEGER REFERENCES users(id)     ON DELETE SET NULL,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_matter  ON activity_log(matter_id);
CREATE INDEX IF NOT EXISTS idx_activity_contact ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
