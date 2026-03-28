-- Adiciona as colunas children e visitors na tabela meeting_reports
-- Ambas do tipo JSONB para suportar os arrays de objetos (repetidores)

ALTER TABLE meeting_reports 
ADD COLUMN IF NOT EXISTS children JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS visitors JSONB DEFAULT '[]'::JSONB;

-- Comentário opcional para documentação
COMMENT ON COLUMN meeting_reports.children IS 'Lista nominal de crianças presentes no encontro (JSON)';
COMMENT ON COLUMN meeting_reports.visitors IS 'Lista nominal de visitantes presentes no encontro (JSON)';
