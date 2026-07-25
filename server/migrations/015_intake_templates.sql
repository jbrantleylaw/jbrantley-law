-- Migration 015: Editable intake templates

CREATE TABLE IF NOT EXISTS intake_templates (
  id            SERIAL PRIMARY KEY,
  practice_area VARCHAR(100) NOT NULL UNIQUE,
  display_name  VARCHAR(255) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_scripts (
  id           SERIAL PRIMARY KEY,
  template_id  INTEGER REFERENCES intake_templates(id) ON DELETE CASCADE,
  script_order INTEGER NOT NULL,
  script_type  VARCHAR(50) DEFAULT 'text',
  script_text  TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_fields (
  id            SERIAL PRIMARY KEY,
  template_id   INTEGER REFERENCES intake_templates(id) ON DELETE CASCADE,
  field_name    VARCHAR(100),
  field_label   VARCHAR(255) NOT NULL,
  field_type    VARCHAR(50) NOT NULL,
  field_order   INTEGER NOT NULL,
  field_options TEXT,
  is_required   BOOLEAN DEFAULT false,
  placeholder   TEXT,
  sol_field     BOOLEAN DEFAULT false,
  field_section VARCHAR(100),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_scripts_template ON intake_scripts(template_id);
CREATE INDEX IF NOT EXISTS idx_intake_fields_template  ON intake_fields(template_id);
