-- Database Schema for Financial Records
-- Este script cria a tabela de lançamentos financeiros e configura o RLS

-- 1. Criar a tabela de lançamentos financeiros
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Segurança (RLS)
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas existentes
DROP POLICY IF EXISTS "Allow public insert" ON financial_records;
DROP POLICY IF EXISTS "Allow public select" ON financial_records;
DROP POLICY IF EXISTS "Allow public update" ON financial_records;
DROP POLICY IF EXISTS "Allow public delete" ON financial_records;

-- 4. Criar políticas para acesso público (fase de desenvolvimento)
CREATE POLICY "Allow public insert" ON financial_records FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON financial_records FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update" ON financial_records FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON financial_records FOR DELETE TO public USING (true);

-- 5. Garantir permissões
GRANT ALL ON financial_records TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
