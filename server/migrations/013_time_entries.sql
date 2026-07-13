CREATE TABLE IF NOT EXISTS time_entries (
  id           SERIAL PRIMARY KEY,
  matter_id    INTEGER REFERENCES matters(id) ON DELETE SET NULL,
  user_id      INTEGER REFERENCES users(id)   ON DELETE SET NULL,
  entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  hours        NUMERIC(6,2) NOT NULL,
  rate         NUMERIC(10,2),
  description  TEXT NOT NULL,
  billable     BOOLEAN NOT NULL DEFAULT TRUE,
  invoiced     BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_id   INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_matter ON time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user   ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date   ON time_entries(entry_date);
