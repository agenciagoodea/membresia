-- SQL Consolidation for Cells and Meeting Reports
-- Este script cria as tabelas necessárias e configura a segurança (RLS)
-- Use este script se as tabelas ainda não existirem ou para resetar as políticas

-- Habilitar extensão para UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Criar a tabela de cells se não existir
CREATE TABLE IF NOT EXISTS cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL,
  name TEXT NOT NULL,
  leader_id UUID,
  host_name TEXT,
  address TEXT,
  meeting_day TEXT,
  meeting_time TEXT,
  members_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  average_attendance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar a tabela de meeting_reports se não existir
CREATE TABLE IF NOT EXISTS meeting_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id UUID REFERENCES cells(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  present_member_ids UUID[] DEFAULT '{}',
  visitor_count INTEGER DEFAULT 0,
  offering_amount DECIMAL(12,2) DEFAULT 0,
  report TEXT,
  recorded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_reports ENABLE ROW LEVEL SECURITY;

-- 4. Limpar políticas existentes
DROP POLICY IF EXISTS "Allow public insert" ON cells;
DROP POLICY IF EXISTS "Allow public select" ON cells;
DROP POLICY IF EXISTS "Allow public update" ON cells;
DROP POLICY IF EXISTS "Allow public delete" ON cells;
DROP POLICY IF EXISTS "Allow public insert" ON meeting_reports;
DROP POLICY IF EXISTS "Allow public select" ON meeting_reports;

-- 5. Criar políticas para Cells
CREATE POLICY "Allow public insert" ON cells FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON cells FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update" ON cells FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON cells FOR DELETE TO public USING (true);

-- 6. Criar políticas para Meeting Reports
CREATE POLICY "Allow public insert" ON meeting_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select" ON meeting_reports FOR SELECT TO public USING (true);

-- 7. Garantir permissões
GRANT ALL ON cells TO anon, authenticated, service_role;
GRANT ALL ON meeting_reports TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
