-- Adiciona a coluna completed_milestones como um array de texto, com valor padrão vázio
ALTER TABLE IF EXISTS members 
ADD COLUMN IF NOT EXISTS completed_milestones text[] DEFAULT '{}';

-- Comentário explicativo na coluna
COMMENT ON COLUMN members.completed_milestones IS 'Lista de atividades concluídas na Escada do Sucesso (checkpoints)';
