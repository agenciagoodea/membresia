-- Permite autocomplete público seguro para formulário de inscrição de eventos.
-- NÃO abre SELECT direto na tabela members para anon.
-- Exponha apenas display_name e role, restrito por igreja com evento publicado.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_public_member_names(
  target_church_id uuid,
  search_query text,
  only_pastors boolean DEFAULT false
)
RETURNS TABLE (
  display_name text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT trim(coalesce(search_query, '')) AS term
  ),
  guard AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.paid_events e
      WHERE e.church_id = target_church_id
        AND e.status = 'published'
      LIMIT 1
    ) AS allowed
  )
  SELECT
    trim(coalesce(m.full_name, m.name, '')) AS display_name,
    coalesce(m.role, '') AS role
  FROM public.members m
  JOIN q ON true
  JOIN guard g ON g.allowed = true
  WHERE m.church_id = target_church_id
    AND length(q.term) >= 3
    AND trim(coalesce(m.full_name, m.name, '')) <> ''
    AND (
      coalesce(m.full_name, '') ILIKE '%' || q.term || '%'
      OR coalesce(m.name, '') ILIKE '%' || q.term || '%'
    )
    AND (
      only_pastors = false
      OR upper(trim(translate(coalesce(m.role, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'))) IN (
        'PASTOR',
        'PASTORA',
        'MASTER ADMIN',
        'MASTER_ADMIN',
        'CHURCH_ADMIN',
        'ADMINISTRADOR DA IGREJA',
        'ADMIN_IGREJA',
        'ADMINISTRADOR_IGREJA'
      )
    )
  ORDER BY display_name
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.search_public_member_names(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_member_names(uuid, text, boolean) TO anon, authenticated;

COMMIT;

