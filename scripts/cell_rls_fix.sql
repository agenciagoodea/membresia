-- DEPRECATED / INSECURE
-- Não executar em produção.
-- Use: sql/security_hotfix_phase1.sql e políticas tenant-aware baseadas em auth.uid().
-- RLS Fix for Cells and Meeting Reports
-- Este script habilita o acesso às tabelas de células e relatórios

-- 1. Habilitar RLS
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_reports ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes
DROP POLICY IF EXISTS "Allow public insert" ON cells;
DROP POLICY IF EXISTS "Allow public select" ON cells;
DROP POLICY IF EXISTS "Allow public update" ON cells;
DROP POLICY IF EXISTS "Allow public delete" ON cells;

DROP POLICY IF EXISTS "Allow public insert" ON meeting_reports;
DROP POLICY IF EXISTS "Allow public select" ON meeting_reports;

-- 3. Criar políticas para Cells
CREATE POLICY "Allow public insert" ON cells FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON cells FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update" ON cells FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON cells FOR DELETE TO public USING (true);

-- 4. Criar políticas para Meeting Reports
CREATE POLICY "Allow public insert" ON meeting_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON meeting_reports FOR SELECT TO public USING (true);

-- 5. Garantir permissões
GRANT ALL ON cells TO anon, authenticated, service_role;
GRANT ALL ON meeting_reports TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
