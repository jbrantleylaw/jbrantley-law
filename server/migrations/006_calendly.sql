CREATE TABLE IF NOT EXISTS calendly_events (
  id                 SERIAL PRIMARY KEY,
  calendly_event_id  VARCHAR(255) UNIQUE NOT NULL,
  invitee_name       VARCHAR(255),
  invitee_email      VARCHAR(255),
  event_name         VARCHAR(255),
  start_time         TIMESTAMPTZ,
  end_time           TIMESTAMPTZ,
  linked_contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  linked_matter_id   INTEGER REFERENCES matters(id)  ON DELETE SET NULL,
  status             VARCHAR(50) DEFAULT 'active',
  raw_data           JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendly_start ON calendly_events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_calendly_contact ON calendly_events(linked_contact_id);
