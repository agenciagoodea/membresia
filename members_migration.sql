-- Migration to add marital status, spouse linking, and auth fields to members table
ALTER TABLE members
ADD COLUMN marital_status TEXT DEFAULT 'Solteiro(a)',
ADD COLUMN spouse_id UUID REFERENCES members(id) NULL,
ADD COLUMN login TEXT UNIQUE NULL,
ADD COLUMN password TEXT NULL;
