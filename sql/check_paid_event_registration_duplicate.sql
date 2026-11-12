-- RPC para verificar duplicidade de inscrição em evento pago (por Nome ou E-mail)
-- Permite acesso tanto para usuários públicos (anon) quanto autenticados
CREATE OR REPLACE FUNCTION public.check_paid_event_registration_duplicate(
  p_event_id uuid,
  p_full_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg record;
  v_clean_name text;
  v_clean_email text;
  v_clean_phone text;
BEGIN
  v_clean_name := lower(trim(coalesce(p_full_name, '')));
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  IF p_event_id IS NULL OR v_clean_name = '' THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- 1. Busca prioritária por nome idêntico (case-insensitive) no mesmo evento
  SELECT id, registration_code, full_name, email, phone, payment_status, registration_type, collaborator_role, created_at
  INTO v_reg
  FROM public.paid_event_registrations
  WHERE event_id = p_event_id
    AND lower(trim(full_name)) = v_clean_name
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Se não achou por nome, busca por e-mail no mesmo evento (se informado)
  IF v_reg.id IS NULL AND v_clean_email <> '' THEN
    SELECT id, registration_code, full_name, email, phone, payment_status, registration_type, collaborator_role, created_at
    INTO v_reg
    FROM public.paid_event_registrations
    WHERE event_id = p_event_id
      AND lower(trim(coalesce(email, ''))) = v_clean_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- 3. Se achou, retorna os dados da inscrição existente
  IF v_reg.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true,
      'id', v_reg.id,
      'registration_code', v_reg.registration_code,
      'full_name', v_reg.full_name,
      'email', v_reg.email,
      'phone', v_reg.phone,
      'payment_status', v_reg.payment_status,
      'registration_type', v_reg.registration_type,
      'collaborator_role', v_reg.collaborator_role
    );
  END IF;

  RETURN jsonb_build_object('exists', false);
END;
$$;

REVOKE ALL ON FUNCTION public.check_paid_event_registration_duplicate(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_paid_event_registration_duplicate(uuid, text, text, text) TO anon, authenticated;

