CREATE TABLE IF NOT EXISTS workflow_templates (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  practice_area TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_template_phases (
  id          SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflow_template_tasks (
  id          SERIAL PRIMARY KEY,
  phase_id    INTEGER NOT NULL REFERENCES workflow_template_phases(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  days_offset INTEGER DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matter_workflows (
  id          SERIAL PRIMARY KEY,
  matter_id   INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES workflow_templates(id),
  name        TEXT NOT NULL,
  started_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matter_workflow_phases (
  id                 SERIAL PRIMARY KEY,
  matter_workflow_id INTEGER NOT NULL REFERENCES matter_workflows(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  position           INTEGER NOT NULL DEFAULT 0,
  completed_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS matter_workflow_tasks (
  id                       SERIAL PRIMARY KEY,
  matter_workflow_phase_id INTEGER NOT NULL REFERENCES matter_workflow_phases(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  description              TEXT,
  due_date                 DATE,
  completed_at             TIMESTAMPTZ,
  position                 INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_matter_workflows_matter ON matter_workflows(matter_id);
