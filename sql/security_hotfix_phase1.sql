-- SECURITY HOTFIX - PHASE 1
-- Execute manually in Supabase SQL Editor after backup.
-- Objective: remove the most dangerous exposures immediately.

BEGIN;

-- 1) Never keep plaintext password mirror in members table.
ALTER TABLE IF EXISTS public.members
  DROP COLUMN IF EXISTS password;

-- 2) Revoke public/anonymous data access on sensitive domain tables.
REVOKE ALL ON TABLE public.members FROM anon;
REVOKE ALL ON TABLE public.cells FROM anon;
REVOKE ALL ON TABLE public.meeting_reports FROM anon;
REVOKE ALL ON TABLE public.financial_records FROM anon;
REVOKE ALL ON TABLE public.payment_logs FROM anon;
REVOKE ALL ON TABLE public.webhook_logs FROM anon;
REVOKE ALL ON TABLE public.smtp_settings FROM anon;
REVOKE ALL ON TABLE public.saas_email_settings FROM anon;
REVOKE ALL ON TABLE public.saas_payment_settings FROM anon;
REVOKE ALL ON TABLE public.saas_ai_settings FROM anon;

-- 3) Remove known unsafe "allow all/public" policies.
DROP POLICY IF EXISTS "Allow public insert" ON public.members;
DROP POLICY IF EXISTS "Allow public select" ON public.members;
DROP POLICY IF EXISTS "Allow public update" ON public.members;
DROP POLICY IF EXISTS "Allow public delete" ON public.members;

DROP POLICY IF EXISTS "Allow public insert" ON public.cells;
DROP POLICY IF EXISTS "Allow public select" ON public.cells;
DROP POLICY IF EXISTS "Allow public update" ON public.cells;
DROP POLICY IF EXISTS "Allow public delete" ON public.cells;

DROP POLICY IF EXISTS "Allow public insert" ON public.meeting_reports;
DROP POLICY IF EXISTS "Allow public select" ON public.meeting_reports;
DROP POLICY IF EXISTS "Allow authenticated manage reports" ON public.meeting_reports;

DROP POLICY IF EXISTS "Allow public select" ON public.financial_records;
DROP POLICY IF EXISTS "Allow public insert" ON public.financial_records;
DROP POLICY IF EXISTS "Allow public update" ON public.financial_records;
DROP POLICY IF EXISTS "Allow public delete" ON public.financial_records;

-- 4) Keep RLS enabled (policies must be rebuilt with tenant isolation).
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meeting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_records ENABLE ROW LEVEL SECURITY;

COMMIT;

-- IMPORTANT:
-- After this hotfix, apply tenant-aware policies based on auth.uid(), church_id and role.
