-- Retorna nomes da equipe (coordenação e auxiliares) para página pública do evento pago.
-- Seguro para anon: só responde quando o evento está publicado.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_paid_event_public_team_by_slug(
  target_slug text
)
RETURNS TABLE (
  coordinator_name text,
  auxiliary_names text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nullif(trim(coalesce(coordinator.full_name, coordinator.name, '')), '') AS coordinator_name,
    coalesce(
      (
        SELECT array_agg(aux_name ORDER BY aux_name)
        FROM (
          SELECT DISTINCT nullif(trim(coalesce(aux.full_name, aux.name, '')), '') AS aux_name
          FROM public.members aux
          WHERE aux.id = ANY(coalesce(event_row.auxiliares_ids, '{}'::uuid[]))
        ) names
        WHERE names.aux_name IS NOT NULL
      ),
      '{}'::text[]
    ) AS auxiliary_names
  FROM public.paid_events event_row
  LEFT JOIN public.members coordinator
    ON coordinator.id = event_row.coordenador_id
  WHERE event_row.slug = target_slug
    AND event_row.status = 'published'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_paid_event_public_team_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paid_event_public_team_by_slug(text) TO anon, authenticated;

COMMIT;

