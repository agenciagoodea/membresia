-- Tabela para gerenciar exceções nas reuniões de célula (cancelamentos e reagendamentos)
CREATE TABLE IF NOT EXISTS public.cell_meeting_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    original_date DATE NOT NULL,
    new_date DATE,
    new_time TIME,
    status TEXT NOT NULL CHECK (status IN ('CANCELLED', 'RESCHEDULED')),
    reason TEXT,
    church_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.cell_meeting_exceptions ENABLE ROW LEVEL SECURITY;

-- Função de Segurança para extrair dados do JWT de forma robusta
CREATE OR REPLACE FUNCTION public.get_auth_profile_data()
RETURNS TABLE (role TEXT, church_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 
        COALESCE(
            auth.jwt() -> 'user_metadata' -> 'profile' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role'
        ),
        COALESCE(
            (auth.jwt() -> 'user_metadata' -> 'profile' ->> 'churchId'),
            (auth.jwt() -> 'user_metadata' -> 'profile' ->> 'church_id'),
            (auth.jwt() -> 'user_metadata' ->> 'church_id'),
            (auth.jwt() -> 'user_metadata' ->> 'churchId')
        )::uuid,
        auth.jwt() ->> 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de Segurança para gerir exceções
CREATE OR REPLACE FUNCTION public.can_manage_cell_meeting(target_cell_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    u_role TEXT;
    u_church_id UUID;
    u_email TEXT;
BEGIN
    SELECT role, church_id, email INTO u_role, u_church_id, u_email FROM public.get_auth_profile_data();

    -- MASTER ADMIN tem acesso total
    IF u_role = 'MASTER ADMIN' THEN RETURN TRUE; END IF;

    -- Admins e Pastores da mesma igreja podem gerir
    IF u_role IN ('ADMINISTRADOR DA IGREJA', 'PASTOR') THEN
        RETURN EXISTS (SELECT 1 FROM public.cells WHERE id = target_cell_id AND church_id = u_church_id);
    END IF;

    -- Líderes de célula podem gerir sua própria célula
    IF u_role = 'LÍDER DE CÉLULA / DISCIPULADOR' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.cells c
            JOIN public.members m ON m.id = c.leader_id
            WHERE c.id = target_cell_id AND m.email = u_email
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Política de Visualização
DROP POLICY IF EXISTS "Membros da igreja veem exceções de reuniões" ON public.cell_meeting_exceptions;
CREATE POLICY "Membros da igreja veem exceções de reuniões"
ON public.cell_meeting_exceptions FOR SELECT
TO authenticated
USING (
    church_id = (SELECT church_id FROM public.get_auth_profile_data())
    OR (SELECT role FROM public.get_auth_profile_data()) = 'MASTER ADMIN'
);

-- Política de Gerenciamento
DROP POLICY IF EXISTS "Líderes e Admins gerenciam exceções" ON public.cell_meeting_exceptions;
CREATE POLICY "Líderes e Admins gerenciam exceções"
ON public.cell_meeting_exceptions FOR ALL
TO authenticated
USING (can_manage_cell_meeting(cell_id))
WITH CHECK (can_manage_cell_meeting(cell_id));
