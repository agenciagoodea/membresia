-- Permissões de equipe para Eventos Pagos
-- Objetivo:
-- 1) Permitir que coordenador e auxiliares editem o evento
-- 2) Permitir que coordenador e auxiliares visualizem/gerenciem inscrições
-- Mantém as políticas administrativas já existentes.

BEGIN;

-- ============================================================
-- paid_events: update para equipe do evento
-- ============================================================
DROP POLICY IF EXISTS paid_events_team_update ON public.paid_events;

CREATE POLICY paid_events_team_update
  ON public.paid_events
  FOR UPDATE
  TO authenticated
  USING (
    public.app_is_authenticated()
    AND (
      created_by = public.app_current_member_id()
      OR coordenador_id = public.app_current_member_id()
      OR public.app_current_member_id() = ANY(coalesce(auxiliares_ids, '{}'::uuid[]))
    )
  )
  WITH CHECK (
    public.app_can_access_church(church_id)
  );

-- ============================================================
-- paid_event_registrations: equipe pode ver/editar/excluir
-- ============================================================
DROP POLICY IF EXISTS paid_event_registrations_team_select ON public.paid_event_registrations;
DROP POLICY IF EXISTS paid_event_registrations_team_update ON public.paid_event_registrations;
DROP POLICY IF EXISTS paid_event_registrations_team_delete ON public.paid_event_registrations;

CREATE POLICY paid_event_registrations_team_select
  ON public.paid_event_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.paid_events e
      WHERE e.id = paid_event_registrations.event_id
        AND e.church_id = paid_event_registrations.church_id
        AND (
          e.created_by = public.app_current_member_id()
          OR e.coordenador_id = public.app_current_member_id()
          OR public.app_current_member_id() = ANY(coalesce(e.auxiliares_ids, '{}'::uuid[]))
        )
    )
  );

CREATE POLICY paid_event_registrations_team_update
  ON public.paid_event_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.paid_events e
      WHERE e.id = paid_event_registrations.event_id
        AND e.church_id = paid_event_registrations.church_id
        AND (
          e.created_by = public.app_current_member_id()
          OR e.coordenador_id = public.app_current_member_id()
          OR public.app_current_member_id() = ANY(coalesce(e.auxiliares_ids, '{}'::uuid[]))
        )
    )
  )
  WITH CHECK (
    public.app_can_access_church(church_id)
    AND EXISTS (
      SELECT 1
      FROM public.paid_events e
      WHERE e.id = paid_event_registrations.event_id
        AND e.church_id = paid_event_registrations.church_id
        AND (
          e.created_by = public.app_current_member_id()
          OR e.coordenador_id = public.app_current_member_id()
          OR public.app_current_member_id() = ANY(coalesce(e.auxiliares_ids, '{}'::uuid[]))
        )
    )
  );

CREATE POLICY paid_event_registrations_team_delete
  ON public.paid_event_registrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.paid_events e
      WHERE e.id = paid_event_registrations.event_id
        AND e.church_id = paid_event_registrations.church_id
        AND (
          e.created_by = public.app_current_member_id()
          OR e.coordenador_id = public.app_current_member_id()
          OR public.app_current_member_id() = ANY(coalesce(e.auxiliares_ids, '{}'::uuid[]))
        )
    )
  );

COMMIT;

