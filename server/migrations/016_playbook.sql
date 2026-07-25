-- Migration 016: Editable staff playbook

CREATE TABLE IF NOT EXISTS playbook_sections (
  id            SERIAL PRIMARY KEY,
  section_key   VARCHAR(100) NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  section_order INTEGER NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playbook_content (
  id            SERIAL PRIMARY KEY,
  section_id    INTEGER REFERENCES playbook_sections(id) ON DELETE CASCADE,
  content_type  VARCHAR(50) NOT NULL,
  content_order INTEGER NOT NULL,
  content_text  TEXT,
  content_json  JSONB,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_content_section ON playbook_content(section_id);
