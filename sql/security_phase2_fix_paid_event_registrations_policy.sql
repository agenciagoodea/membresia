-- HOTFIX: corrige validação de church_id no INSERT público de paid_event_registrations
-- Motivo: evitar condição tautológica (e.church_id = e.church_id)

BEGIN;

DROP POLICY IF EXISTS paid_event_registrations_insert_public ON public.paid_event_registrations;

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

COMMIT;
