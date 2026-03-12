-- Migration: Add completed_milestones to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS completed_milestones JSONB DEFAULT '[]'::jsonb;

-- Garantir que a coluna seja acessível via RLS se necessário (já deve estar pelo SELECT *)
