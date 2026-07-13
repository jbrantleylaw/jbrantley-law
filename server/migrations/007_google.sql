CREATE TABLE IF NOT EXISTS google_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  scope        TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS email_log (
  id           SERIAL PRIMARY KEY,
  matter_id    INTEGER REFERENCES matters(id)  ON DELETE SET NULL,
  contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  to_email     VARCHAR(255),
  cc_email     VARCHAR(255),
  subject      VARCHAR(500),
  body_preview TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  sent_by      INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_log_matter  ON email_log(matter_id);
CREATE INDEX IF NOT EXISTS idx_email_log_contact ON email_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_user ON google_tokens(user_id);
