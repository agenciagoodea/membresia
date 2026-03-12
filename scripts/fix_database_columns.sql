
-- ==========================================================
-- SCRIPT DE CORREÇÃO: ESCADA DO SUCESSO & ORIGEM
-- Execute este script no SQL Editor do seu Supabase
-- ==========================================================

-- 1. Adicionar coluna para os Checkpoints (Atividades)
ALTER TABLE IF EXISTS members 
ADD COLUMN IF NOT EXISTS completed_milestones text[] DEFAULT '{}';

-- 2. Adicionar coluna para a Origem do Discípulo
ALTER TABLE IF EXISTS members 
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'OUTROS';

-- 3. (Opcional) Adicionar coluna para o histórico detalhado, caso não exista
ALTER TABLE IF EXISTS members 
ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]';

-- Atualizar metadados
COMMENT ON COLUMN members.completed_milestones IS 'Lista de atividades concluídas na Escada do Sucesso';
COMMENT ON COLUMN members.origin IS 'Origem do membro: EVANGELISMO, VISITA DE CÉLULA, PEDIDO DE ORAÇÃO, OUTROS';
COMMENT ON COLUMN members.stage_history IS 'Histórico completo de transições na Escada do Sucesso';

-- Recarregar cache de esquema do PostgREST (Supabase faz isso automaticamente, mas é bom garantir)
NOTIFY pgrst, 'reload schema';
