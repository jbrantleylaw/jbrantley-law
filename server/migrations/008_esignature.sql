CREATE TABLE IF NOT EXISTS signature_requests (
  id                   SERIAL PRIMARY KEY,
  matter_id            INTEGER REFERENCES matters(id) ON DELETE SET NULL,
  document_name        VARCHAR(500) NOT NULL,
  document_path        VARCHAR(1000),
  recipient_name       VARCHAR(255),
  recipient_email      VARCHAR(255) NOT NULL,
  status               VARCHAR(50) DEFAULT 'pending',
  secure_token         VARCHAR(128) UNIQUE NOT NULL,
  sent_at              TIMESTAMPTZ DEFAULT NOW(),
  viewed_at            TIMESTAMPTZ,
  signed_at            TIMESTAMPTZ,
  declined_at          TIMESTAMPTZ,
  ip_address           VARCHAR(64),
  signature_type       VARCHAR(20) DEFAULT 'typed',
  signature_data       TEXT,
  signed_document_path VARCHAR(1000),
  sent_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adobe_agreements (
  id                   SERIAL PRIMARY KEY,
  matter_id            INTEGER REFERENCES matters(id) ON DELETE SET NULL,
  adobe_agreement_id   VARCHAR(255) UNIQUE NOT NULL,
  document_name        VARCHAR(500),
  recipient_email      VARCHAR(255),
  status               VARCHAR(100) DEFAULT 'OUT_FOR_SIGNATURE',
  sent_at              TIMESTAMPTZ DEFAULT NOW(),
  signed_at            TIMESTAMPTZ,
  signed_document_path VARCHAR(1000),
  sent_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sig_requests_token  ON signature_requests(secure_token);
CREATE INDEX IF NOT EXISTS idx_sig_requests_matter ON signature_requests(matter_id);
CREATE INDEX IF NOT EXISTS idx_adobe_agreements_matter ON adobe_agreements(matter_id);
