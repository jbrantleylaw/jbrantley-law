CREATE TABLE IF NOT EXISTS matter_staff (
  matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (matter_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_matter_staff_matter ON matter_staff(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_staff_user   ON matter_staff(user_id);
