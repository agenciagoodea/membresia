-- SECURITY PHASE 2 - TENANT-AWARE RLS
-- Execute after sql/security_hotfix_phase1.sql
-- Target: Supabase/Postgres (public schema)

BEGIN;

SET search_path = public;

-- ============================================================
-- Helper functions (security-definer, RLS-safe)
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_drop_policies(target_schema text, target_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = target_schema
      AND tablename = target_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', item.policyname, target_schema, target_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_normalize_role(raw_role text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  role_value text;
BEGIN
  role_value := upper(trim(coalesce(raw_role, '')));
  role_value := replace(translate(role_value, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '  ', ' ');
  RETURN role_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.members m
  WHERE m.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_current_church_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.church_id
  FROM public.members m
  WHERE m.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.members m
  WHERE m.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.app_is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_normalize_role(public.app_current_role()) IN ('MASTER ADMIN', 'MASTER_ADMIN')
$$;

CREATE OR REPLACE FUNCTION public.app_is_church_admin_or_pastor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_normalize_role(public.app_current_role()) IN (
    'ADMINISTRADOR DA IGREJA',
    'CHURCH_ADMIN',
    'ADMIN_IGREJA',
    'ADMINISTRADOR_IGREJA',
    'PASTOR'
  )
$$;

CREATE OR REPLACE FUNCTION public.app_is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_is_master_admin()
      OR public.app_is_church_admin_or_pastor()
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_church(target_church_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_master_admin()
    OR (
      public.app_is_authenticated()
      AND target_church_id IS NOT NULL
      AND target_church_id = public.app_current_church_id()
    )
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_church(target_church_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.app_is_master_admin()
    OR (
      public.app_is_church_admin_or_pastor()
      AND target_church_id IS NOT NULL
      AND target_church_id = public.app_current_church_id()
    )
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_cell(target_cell_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cells c
    WHERE c.id = target_cell_id
      AND public.app_can_access_church(c.church_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_cell(target_cell_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_member_id uuid;
  my_church_id uuid;
BEGIN
  IF public.app_is_master_admin() THEN
    RETURN TRUE;
  END IF;

  my_member_id := public.app_current_member_id();
  my_church_id := public.app_current_church_id();

  IF my_member_id IS NULL OR my_church_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.app_is_church_admin_or_pastor() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.cells c
      WHERE c.id = target_cell_id
        AND c.church_id = my_church_id
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.cells c
    WHERE c.id = target_cell_id
      AND c.church_id = my_church_id
      AND (
        c.leader_id = my_member_id
      )
  );
END;
$$;

-- ============================================================
-- Core tenant tables
-- ============================================================

-- churches
DO $$
BEGIN
  IF to_regclass('public.churches') IS NOT NULL THEN
    ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'churches');

    CREATE POLICY churches_select
      ON public.churches
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(id));

    CREATE POLICY churches_public_active_select
      ON public.churches
      FOR SELECT
      TO anon
      USING (status IN ('ATIVO', 'ACTIVE'));

    CREATE POLICY churches_manage
      ON public.churches
      FOR ALL
      TO authenticated
      USING (public.app_is_master_admin())
      WITH CHECK (public.app_is_master_admin());
  END IF;
END $$;

-- members
DO $$
BEGIN
  IF to_regclass('public.members') IS NOT NULL THEN
    ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'members');

    CREATE POLICY members_select
      ON public.members
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    -- Admin manages members in same church
    CREATE POLICY members_manage_admin
      ON public.members
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));

    -- Public/initial registration can only create low-privilege pending members
    CREATE POLICY members_public_registration
      ON public.members
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        public.app_normalize_role(role) IN ('MEMBRO / VISITANTE', 'MEMBER', 'MEMBER_VISITOR', 'VISITANTE', 'VISITOR')
        AND coalesce(public.app_normalize_role(status), 'PENDENTE') IN ('PENDENTE', 'PENDING')
        AND church_id IS NOT NULL
      );
  END IF;
END $$;

-- cells
DO $$
BEGIN
  IF to_regclass('public.cells') IS NOT NULL THEN
    ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'cells');

    CREATE POLICY cells_select
      ON public.cells
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY cells_manage
      ON public.cells
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id) OR public.app_can_manage_cell(id))
      WITH CHECK (public.app_can_manage_church(church_id) OR public.app_can_manage_cell(id));
  END IF;
END $$;

-- meeting_reports (church inferred from cell)
DO $$
BEGIN
  IF to_regclass('public.meeting_reports') IS NOT NULL THEN
    ALTER TABLE public.meeting_reports ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'meeting_reports');

    CREATE POLICY meeting_reports_select
      ON public.meeting_reports
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_cell(cell_id));

    CREATE POLICY meeting_reports_manage
      ON public.meeting_reports
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_cell(cell_id))
      WITH CHECK (public.app_can_manage_cell(cell_id));
  END IF;
END $$;

-- cell_meeting_exceptions
DO $$
BEGIN
  IF to_regclass('public.cell_meeting_exceptions') IS NOT NULL THEN
    ALTER TABLE public.cell_meeting_exceptions ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'cell_meeting_exceptions');

    CREATE POLICY cell_meeting_exceptions_select
      ON public.cell_meeting_exceptions
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY cell_meeting_exceptions_manage
      ON public.cell_meeting_exceptions
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id) OR public.app_can_manage_cell(cell_id))
      WITH CHECK (public.app_can_manage_church(church_id) OR public.app_can_manage_cell(cell_id));
  END IF;
END $$;

-- prayers
DO $$
BEGIN
  IF to_regclass('public.prayers') IS NOT NULL THEN
    ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'prayers');

    CREATE POLICY prayers_select
      ON public.prayers
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY prayers_manage
      ON public.prayers
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));

    -- Public prayer request
    CREATE POLICY prayers_public_insert
      ON public.prayers
      FOR INSERT
      TO anon
      WITH CHECK (
        church_id IS NOT NULL
        AND coalesce(public.app_normalize_role(status), 'PENDENTE') IN ('PENDENTE', 'PENDING')
      );
  END IF;
END $$;

-- financial_records
DO $$
BEGIN
  IF to_regclass('public.financial_records') IS NOT NULL THEN
    ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'financial_records');

    CREATE POLICY financial_records_select
      ON public.financial_records
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY financial_records_manage
      ON public.financial_records
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

-- events
DO $$
BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'events');

    CREATE POLICY events_select_authenticated
      ON public.events
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY events_manage
      ON public.events
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

-- ============================================================
-- Paid events module
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.paid_events') IS NOT NULL THEN
    ALTER TABLE public.paid_events ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'paid_events');

    CREATE POLICY paid_events_select_authenticated
      ON public.paid_events
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY paid_events_select_public_published
      ON public.paid_events
      FOR SELECT
      TO anon
      USING (status = 'published');

    CREATE POLICY paid_events_manage
      ON public.paid_events
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.paid_event_registrations') IS NOT NULL THEN
    ALTER TABLE public.paid_event_registrations ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'paid_event_registrations');

    CREATE POLICY paid_event_registrations_select_admin
      ON public.paid_event_registrations
      FOR SELECT
      TO authenticated
      USING (
        public.app_is_master_admin()
        OR public.app_can_manage_church(church_id)
        OR member_id = public.app_current_member_id()
      );

    CREATE POLICY paid_event_registrations_insert_public
      ON public.paid_event_registrations
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        church_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.paid_events e
          WHERE e.id = event_id
            AND e.church_id = paid_event_registrations.church_id
            AND e.status = 'published'
        )
      );

    CREATE POLICY paid_event_registrations_manage
      ON public.paid_event_registrations
      FOR UPDATE
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));

    CREATE POLICY paid_event_registrations_delete
      ON public.paid_event_registrations
      FOR DELETE
      TO authenticated
      USING (public.app_can_manage_church(church_id));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.paid_event_payment_logs') IS NOT NULL THEN
    ALTER TABLE public.paid_event_payment_logs ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'paid_event_payment_logs');

    CREATE POLICY paid_event_payment_logs_select
      ON public.paid_event_payment_logs
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY paid_event_payment_logs_manage
      ON public.paid_event_payment_logs
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

-- ============================================================
-- M12 module
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.m12_checkpoints') IS NOT NULL THEN
    ALTER TABLE public.m12_checkpoints ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'm12_checkpoints');

    CREATE POLICY m12_checkpoints_select
      ON public.m12_checkpoints
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY m12_checkpoints_manage
      ON public.m12_checkpoints
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.m12_performance_tracking') IS NOT NULL THEN
    ALTER TABLE public.m12_performance_tracking ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'm12_performance_tracking');

    CREATE POLICY m12_performance_select
      ON public.m12_performance_tracking
      FOR SELECT
      TO authenticated
      USING (
        public.app_can_access_church(church_id)
        OR member_id = public.app_current_member_id()
      );

    CREATE POLICY m12_performance_manage
      ON public.m12_performance_tracking
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.member_activity_responses') IS NOT NULL THEN
    ALTER TABLE public.member_activity_responses ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'member_activity_responses');

    CREATE POLICY member_activity_responses_select
      ON public.member_activity_responses
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_activity_responses.member_id
            AND (
              public.app_can_access_church(m.church_id)
              OR m.id = public.app_current_member_id()
            )
        )
      );

    CREATE POLICY member_activity_responses_manage
      ON public.member_activity_responses
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_activity_responses.member_id
            AND public.app_can_manage_church(m.church_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_activity_responses.member_id
            AND public.app_can_manage_church(m.church_id)
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.member_relationships') IS NOT NULL THEN
    ALTER TABLE public.member_relationships ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'member_relationships');

    CREATE POLICY member_relationships_select
      ON public.member_relationships
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_relationships.member_id
            AND public.app_can_access_church(m.church_id)
        )
      );

    CREATE POLICY member_relationships_manage
      ON public.member_relationships
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_relationships.member_id
            AND public.app_can_manage_church(m.church_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.id = member_relationships.member_id
            AND public.app_can_manage_church(m.church_id)
        )
      );
  END IF;
END $$;

-- ============================================================
-- SaaS/admin-only tables
-- ============================================================

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'plans',
    'saas_settings',
    'saas_email_settings',
    'saas_payment_settings',
    'saas_ai_settings',
    'terms_versions',
    'email_templates',
    'payment_logs',
    'webhook_logs'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      PERFORM public.app_drop_policies('public', table_name);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.app_is_master_admin()) WITH CHECK (public.app_is_master_admin())',
        table_name || '_master_only',
        table_name
      );
    END IF;
  END LOOP;
END $$;

-- subscriptions: master sees all, church admins only own church
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'subscriptions');

    CREATE POLICY subscriptions_select
      ON public.subscriptions
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY subscriptions_manage
      ON public.subscriptions
      FOR ALL
      TO authenticated
      USING (public.app_is_master_admin())
      WITH CHECK (public.app_is_master_admin());
  END IF;
END $$;

-- smtp_settings (church admin/pastor can manage own church)
DO $$
BEGIN
  IF to_regclass('public.smtp_settings') IS NOT NULL THEN
    ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'smtp_settings');

    CREATE POLICY smtp_settings_select
      ON public.smtp_settings
      FOR SELECT
      TO authenticated
      USING (public.app_can_access_church(church_id));

    CREATE POLICY smtp_settings_manage
      ON public.smtp_settings
      FOR ALL
      TO authenticated
      USING (public.app_can_manage_church(church_id))
      WITH CHECK (public.app_can_manage_church(church_id));
  END IF;
END $$;

-- lgpd_requests (master + same church admin via member_id relation)
DO $$
BEGIN
  IF to_regclass('public.lgpd_requests') IS NOT NULL THEN
    ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;
    PERFORM public.app_drop_policies('public', 'lgpd_requests');

    CREATE POLICY lgpd_requests_select
      ON public.lgpd_requests
      FOR SELECT
      TO authenticated
      USING (
        public.app_is_master_admin()
        OR EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.user_id = lgpd_requests.user_id
            AND public.app_can_access_church(m.church_id)
        )
      );

    CREATE POLICY lgpd_requests_manage
      ON public.lgpd_requests
      FOR ALL
      TO authenticated
      USING (
        public.app_is_master_admin()
        OR EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.user_id = lgpd_requests.user_id
            AND public.app_can_manage_church(m.church_id)
        )
      )
      WITH CHECK (
        public.app_is_master_admin()
        OR EXISTS (
          SELECT 1
          FROM public.members m
          WHERE m.user_id = lgpd_requests.user_id
            AND public.app_can_manage_church(m.church_id)
        )
      );
  END IF;
END $$;

-- ============================================================
-- Explicit grants (remove anon by default, then re-open only needed)
-- ============================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- anon: only public features
DO $$
BEGIN
  IF to_regclass('public.churches') IS NOT NULL THEN
    GRANT SELECT ON public.churches TO anon;
  END IF;
  IF to_regclass('public.prayers') IS NOT NULL THEN
    GRANT INSERT ON public.prayers TO anon;
  END IF;
  IF to_regclass('public.members') IS NOT NULL THEN
    GRANT INSERT ON public.members TO anon;
  END IF;
  IF to_regclass('public.paid_events') IS NOT NULL THEN
    GRANT SELECT ON public.paid_events TO anon;
  END IF;
  IF to_regclass('public.paid_event_registrations') IS NOT NULL THEN
    GRANT INSERT ON public.paid_event_registrations TO anon;
  END IF;
END $$;

COMMIT;

-- Post-apply validation suggestions:
-- 1) Test anon insert in public registrations/prayers
-- 2) Test authenticated same-church reads
-- 3) Test cross-church denial for church admins
-- 4) Test master-admin global access
