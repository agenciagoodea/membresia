-- SECURITY PHASE 2 - CHECKLIST DE VALIDAÇÃO
-- Execute no Supabase SQL Editor (somente leitura/diagnóstico).
-- Objetivo: validar que as políticas tenant-aware estão ativas e sem brechas óbvias.

-- ============================================================
-- CHECK 1) RLS habilitado nas tabelas críticas
-- PASS: todos os itens abaixo com rls_enabled = true
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
JOIN pg_class ON pg_class.relname = pg_tables.tablename
JOIN pg_namespace ns ON ns.oid = pg_class.relnamespace AND ns.nspname = pg_tables.schemaname
WHERE schemaname = 'public'
  AND tablename IN (
    'churches',
    'members',
    'cells',
    'meeting_reports',
    'cell_meeting_exceptions',
    'prayers',
    'financial_records',
    'events',
    'paid_events',
    'paid_event_registrations',
    'paid_event_payment_logs',
    'm12_checkpoints',
    'm12_performance_tracking',
    'member_activity_responses',
    'member_relationships',
    'plans',
    'saas_settings',
    'saas_email_settings',
    'saas_payment_settings',
    'saas_ai_settings',
    'terms_versions',
    'email_templates',
    'payment_logs',
    'webhook_logs',
    'subscriptions',
    'smtp_settings',
    'lgpd_requests'
  )
ORDER BY tablename;

-- ============================================================
-- CHECK 2) Não existem políticas inseguras (USING/WITH CHECK true)
-- PASS: 0 linhas
-- ============================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(qual, '') ILIKE '%true%'
    OR coalesce(with_check, '') ILIKE '%true%'
    OR roles::text ILIKE '%public%'
  )
ORDER BY tablename, policyname;

-- ============================================================
-- CHECK 3) Políticas por tabela realmente existem
-- PASS: tabela crítica sem lacuna (sem policy_count = 0)
-- ============================================================
SELECT
  tablename,
  count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- CHECK 4) Grants de anon mínimos
-- PASS esperado:
--   - churches: SELECT
--   - prayers: INSERT
--   - members: INSERT
--   - paid_events: SELECT
--   - paid_event_registrations: INSERT
-- e nada além disso em tabelas sensíveis
-- ============================================================
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- ============================================================
-- CHECK 5) Grants de authenticated
-- PASS esperado:
-- authenticated terá permissões SQL amplas, mas limitado por RLS.
-- Aqui só confirma que não faltam grants básicos.
-- ============================================================
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- ============================================================
-- CHECK 6) Funções helper presentes
-- PASS: todas listadas
-- ============================================================
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'app_drop_policies',
    'app_normalize_role',
    'app_current_member_id',
    'app_current_church_id',
    'app_current_role',
    'app_is_authenticated',
    'app_is_master_admin',
    'app_is_church_admin_or_pastor',
    'app_is_church_admin',
    'app_can_access_church',
    'app_can_manage_church',
    'app_can_access_cell',
    'app_can_manage_cell'
  )
ORDER BY p.proname;

-- ============================================================
-- CHECK 7) Diagnóstico de políticas por tabela
-- (use para inspeção visual rápida)
-- ============================================================
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- CHECK 8) Guardrail para tautologia perigosa em paid_event_registrations
-- PASS: 0 linhas
-- ============================================================
SELECT
  tablename,
  policyname,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'paid_event_registrations'
  AND policyname = 'paid_event_registrations_insert_public'
  AND coalesce(with_check, '') ILIKE '%e.church_id = e.church_id%';
