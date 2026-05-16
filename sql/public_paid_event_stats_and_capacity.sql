-- Stats públicos e internos de eventos pagos + sincronização automática de lotação.
-- Seguro para anon: somente eventos publicados/encerrados por slug.
-- Seguro para authenticated: valida acesso por igreja/equipe.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_paid_event_stats(
  target_event_id uuid DEFAULT NULL,
  target_slug text DEFAULT NULL
)
RETURNS TABLE (
  event_id uuid,
  status text,
  max_participants integer,
  total_active bigint,
  total_confirmed bigint,
  total_pending bigint,
  spots_left bigint,
  is_sold_out boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_event AS (
    SELECT e.*
    FROM public.paid_events e
    WHERE (
      target_event_id IS NOT NULL
      AND e.id = target_event_id
    ) OR (
      target_slug IS NOT NULL
      AND e.slug = target_slug
    )
    LIMIT 1
  ),
  visible_event AS (
    SELECT e.*
    FROM target_event e
    WHERE
      (
        auth.uid() IS NULL
        AND e.status IN ('published', 'closed')
      )
      OR
      (
        auth.uid() IS NOT NULL
        AND (
          public.app_can_access_church(e.church_id)
          OR e.created_by = public.app_current_member_id()
          OR e.coordenador_id = public.app_current_member_id()
          OR public.app_current_member_id() = ANY(coalesce(e.auxiliares_ids, '{}'::uuid[]))
        )
      )
  ),
  counters AS (
    SELECT
      v.id AS event_id,
      count(*) FILTER (
        WHERE r.payment_status = 'pago_confirmado'
      )::bigint AS total_active,
      count(*) FILTER (
        WHERE r.payment_status = 'pago_confirmado'
      )::bigint AS total_confirmed
    FROM visible_event v
    LEFT JOIN public.paid_event_registrations r
      ON r.event_id = v.id
    GROUP BY v.id
  )
  SELECT
    v.id AS event_id,
    v.status,
    v.max_participants,
    c.total_active,
    c.total_confirmed,
    GREATEST(c.total_active - c.total_confirmed, 0)::bigint AS total_pending,
    CASE
      WHEN v.max_participants IS NULL THEN NULL
      ELSE GREATEST(v.max_participants::bigint - c.total_active, 0)
    END AS spots_left,
    CASE
      WHEN v.max_participants IS NULL THEN false
      ELSE c.total_active >= v.max_participants::bigint
    END AS is_sold_out
  FROM visible_event v
  JOIN counters c
    ON c.event_id = v.id;
$$;

REVOKE ALL ON FUNCTION public.get_paid_event_stats(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paid_event_stats(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_paid_event_capacity_status(
  target_event_id uuid
)
RETURNS TABLE (
  event_id uuid,
  previous_status text,
  new_status text,
  total_active bigint,
  max_participants integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  evt public.paid_events%ROWTYPE;
  active_count bigint := 0;
  next_status text;
BEGIN
  IF target_event_id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO evt
  FROM public.paid_events
  WHERE id = target_event_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF evt.max_participants IS NULL THEN
    RETURN QUERY SELECT evt.id, evt.status, evt.status, 0::bigint, evt.max_participants;
    RETURN;
  END IF;

  SELECT count(*)
  INTO active_count
  FROM public.paid_event_registrations r
  WHERE r.event_id = evt.id
    AND r.payment_status = 'pago_confirmado';

  next_status := evt.status;

  IF evt.status IN ('published', 'closed') THEN
    IF active_count >= evt.max_participants THEN
      next_status := 'closed';
    ELSIF active_count < evt.max_participants THEN
      next_status := 'published';
    END IF;
  END IF;

  IF next_status <> evt.status THEN
    UPDATE public.paid_events
    SET
      status = next_status,
      updated_at = now()
    WHERE id = evt.id;
  END IF;

  RETURN QUERY SELECT evt.id, evt.status, next_status, active_count, evt.max_participants;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_paid_event_capacity_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_paid_event_capacity_status(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_paid_event_capacity_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW.event_id, OLD.event_id);
  PERFORM *
  FROM public.sync_paid_event_capacity_status(target_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_paid_event_capacity_status_on_registrations ON public.paid_event_registrations;

CREATE TRIGGER sync_paid_event_capacity_status_on_registrations
AFTER INSERT OR UPDATE OR DELETE
ON public.paid_event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_paid_event_capacity_status();

COMMIT;

