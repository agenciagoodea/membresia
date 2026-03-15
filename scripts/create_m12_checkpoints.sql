-- 1. Definição da função de limpeza (deve vir antes do uso)
CREATE OR REPLACE FUNCTION drop_all_policies(t_name text) RETURNS void AS $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN (SELECT policyname FROM pg_policies WHERE tablename = t_name) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, t_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Limpar tabelas e políticas existentes
DO $$ 
BEGIN
    -- Desabilitar RLS temporariamente
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'm12_performance_tracking') THEN
        ALTER TABLE m12_performance_tracking DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'm12_checkpoints') THEN
        ALTER TABLE m12_checkpoints DISABLE ROW LEVEL SECURITY;
    END IF;

    -- Remover TODAS as políticas usando cast explícito
    PERFORM drop_all_policies('m12_checkpoints'::text);
    PERFORM drop_all_policies('m12_performance_tracking'::text);
END $$;

-- 2. Recriar tabelas com schema robusto
CREATE TABLE IF NOT EXISTS m12_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID,
    stage TEXT NOT NULL, 
    label TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT true,
    depends_on_id UUID REFERENCES m12_checkpoints(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m12_performance_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    church_id UUID,
    stage TEXT NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    checkpoints_reached INTEGER DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS e criar política TOTALMENTE aberta
ALTER TABLE m12_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE m12_performance_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations m12_checkpoints" ON m12_checkpoints FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations m12_performance" ON m12_performance_tracking FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Garantir permissões de acesso
GRANT ALL ON m12_checkpoints TO anon, authenticated, service_role;
GRANT ALL ON m12_performance_tracking TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_m12_checkpoints_updated_at ON m12_checkpoints;
CREATE TRIGGER update_m12_checkpoints_updated_at
    BEFORE UPDATE ON m12_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
