-- DEPRECATED / INSECURE
-- Não executar em produção.
-- Use: sql/security_hotfix_phase1.sql e políticas tenant-aware baseadas em auth.uid().
-- RLS Fix for Members Table
-- Este script habilita o acesso público à tabela members para permitir a importação de novos membros

-- 1. Habilitar RLS na tabela members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow public insert" ON members;
DROP POLICY IF EXISTS "Allow public select" ON members;
DROP POLICY IF EXISTS "Allow public update" ON members;
DROP POLICY IF EXISTS "Allow public delete" ON members;

-- 3. Criar políticas para acesso total público (necessário para o estágio atual do projeto)
CREATE POLICY "Allow public insert" ON members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON members FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update" ON members FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON members FOR DELETE TO public USING (true);

-- 4. Garantir permissões de acesso aos roles anon e authenticated
GRANT ALL ON members TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
