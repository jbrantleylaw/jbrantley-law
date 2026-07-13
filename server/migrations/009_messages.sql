CREATE TABLE IF NOT EXISTS message_threads (
  id           SERIAL PRIMARY KEY,
  matter_id    INTEGER REFERENCES matters(id) ON DELETE SET NULL,
  subject      VARCHAR(500) NOT NULL,
  thread_type  VARCHAR(20) NOT NULL DEFAULT 'internal',
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_email VARCHAR(255),
  client_name  VARCHAR(255),
  secure_token VARCHAR(128) UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  thread_id   INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL DEFAULT 'staff',
  sender_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(255),
  body        TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_thread  ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_matter   ON message_threads(matter_id);
CREATE INDEX IF NOT EXISTS idx_threads_token    ON message_threads(secure_token);
CREATE INDEX IF NOT EXISTS idx_messages_read    ON messages(read_at) WHERE read_at IS NULL;
