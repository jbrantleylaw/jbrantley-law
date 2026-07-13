-- Add status column to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
UPDATE contacts SET status = 'active' WHERE status IS NULL;

-- Add new values to matter_status enum
ALTER TYPE matter_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE matter_status ADD VALUE IF NOT EXISTS 'on_hold';
