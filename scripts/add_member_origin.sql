
-- Adicionar coluna de origem à tabela de membros
-- Este campo identifica como o discípulo chegou à igreja (Evangelismo, Visita, Pedido de Oração, etc)
ALTER TABLE members ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'OUTROS';

-- Atualizar comentários para documentação
COMMENT ON COLUMN members.origin IS 'Origem do membro: EVANGELISMO, VISITA DE CÉLULA, PEDIDO DE ORAÇÃO, OUTROS';
