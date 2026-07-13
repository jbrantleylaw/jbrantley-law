-- Migration 005: Firm settings + user is_active flag
-- Run: psql $DATABASE_URL -f server/migrations/005_firm_settings.sql

CREATE TABLE IF NOT EXISTS firm_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  attorney_name       VARCHAR(255) DEFAULT 'Jennifer N. Brantley, Esq.',
  firm_name           VARCHAR(255) DEFAULT 'J Brantley Law',
  phone               VARCHAR(50)  DEFAULT '(210) 742-2435',
  email               VARCHAR(255) DEFAULT 'jbrantley@jenniferbrantleylaw.com',
  website             VARCHAR(255) DEFAULT 'jenniferbrantleylaw.com',
  calendly_url        VARCHAR(500) DEFAULT 'https://calendly.com/jbrantley-jenniferbrantleylaw/30min',
  jurisdictions       TEXT         DEFAULT 'TX, GA, USPTO (Federal Trademark)',
  tagline             TEXT         DEFAULT 'I handle the fine print so you can build a life and business you love.',
  pp_integration_mode BOOLEAN      DEFAULT FALSE,
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

INSERT INTO firm_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
