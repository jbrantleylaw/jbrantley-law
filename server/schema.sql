-- J Brantley Law — Database Schema
-- Run: psql -U postgres -d jbrantley_law -f schema.sql

CREATE TYPE user_role AS ENUM ('attorney', 'staff');
CREATE TYPE matter_status AS ENUM ('open', 'closed', 'pending', 'inactive');

CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  role                 user_role NOT NULL DEFAULT 'staff',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id            SERIAL PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  company       VARCHAR(255),
  phone         VARCHAR(50),
  email         VARCHAR(255),
  address       TEXT,
  contact_type  VARCHAR(50),  -- client, opposing_counsel, expert, vendor, witness, other
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matters (
  id             SERIAL PRIMARY KEY,
  matter_number  VARCHAR(50) UNIQUE NOT NULL,
  matter_name    VARCHAR(255) NOT NULL,
  practice_area  VARCHAR(100),
  status         matter_status NOT NULL DEFAULT 'open',
  open_date      DATE,
  sol_date       DATE,
  client_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_staff INTEGER REFERENCES users(id) ON DELETE SET NULL,
  description    TEXT,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name  ON contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_matters_status      ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_client      ON matters(client_id);
CREATE INDEX IF NOT EXISTS idx_matters_staff       ON matters(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_matters_sol_date    ON matters(sol_date);

-- Auto-update updated_at on contacts and matters
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER matters_updated_at
  BEFORE UPDATE ON matters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
