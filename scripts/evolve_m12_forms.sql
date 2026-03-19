-- 1. Atualizar m12_checkpoints com novos campos de lógica dinâmica
ALTER TABLE m12_checkpoints 
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_value JSONB,
ADD COLUMN IF NOT EXISTS is_multiple_choice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS logical_condition TEXT,
ADD COLUMN IF NOT EXISTS is_calculated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS config_options JSONB DEFAULT '[]'::jsonb; -- Migrar de TEXT[] para JSONB para flexibilidade

-- 2. Tabela de Respostas Estruturadas (Opcional, mas recomendado para relatórios complexos)
CREATE TABLE IF NOT EXISTS member_activity_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES m12_checkpoints(id) ON DELETE CASCADE,
    value JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, activity_id)
);

-- 3. Tabela de Relacionamentos Dinâmicos
CREATE TABLE IF NOT EXISTS member_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    related_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'CONJUGE', 'LIDER', 'PASTOR', 'FILHO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, related_member_id, relationship_type)
);

-- 4. Funções para Campos Calculados (Exemplo: Idade)
CREATE OR REPLACE FUNCTION calculate_member_age(birth_date DATE) 
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM age(birth_date));
END;
$$ LANGUAGE plpgsql;

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE member_activity_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations responses" ON member_activity_responses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations relationships" ON member_relationships FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON member_activity_responses TO anon, authenticated, service_role;
GRANT ALL ON member_relationships TO anon, authenticated, service_role;
