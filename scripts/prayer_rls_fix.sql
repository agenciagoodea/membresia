-- RLS Fix and Church Seed for Prayers Table (CORRIGIDO)
-- Este script resolve o erro de Foreign Key e as políticas de segurança

-- 1. Remover igreja existente com o mesmo slug para evitar conflito de Unique Key
-- Isso garante que a igreja terá o ID '779bc274-eab3-489e-a947-d4b0d39ed6ea' que o frontend espera
DELETE FROM churches WHERE slug = 'vida-nova';

-- 2. Inserir a igreja com o ID esperado pelo frontend (constants.tsx)
INSERT INTO churches (id, name, slug, status, plan, primary_color, secondary_color)
VALUES (
  '779bc274-eab3-489e-a947-d4b0d39ed6ea',
  'Igreja Vida Nova', 
  'vida-nova', 
  'ATIVO', 
  'PRO',
  '#2563eb',
  '#1e40af'
);

-- 3. Habilitar RLS nas tabelas
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;

-- 4. Limpar políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow public insert" ON prayers;
DROP POLICY IF EXISTS "Allow public select" ON prayers;
DROP POLICY IF EXISTS "Allow public select" ON churches;

-- 5. Criar nova política para inserção pública em prayers
CREATE POLICY "Allow public insert" ON prayers
FOR INSERT
TO public
WITH CHECK (true);

-- 6. Criar nova política para leitura pública em prayers e churches
DROP POLICY IF EXISTS "Allow public select" ON prayers;
DROP POLICY IF EXISTS "Allow public select" ON churches;
CREATE POLICY "Allow public select" ON prayers FOR SELECT TO public USING (true);
CREATE POLICY "Allow public select" ON churches FOR SELECT TO public USING (true);

-- 7. Criar políticas para moderação (Update e Delete)
DROP POLICY IF EXISTS "Allow public update" ON prayers;
DROP POLICY IF EXISTS "Allow public delete" ON prayers;

CREATE POLICY "Allow public update" ON prayers 
FOR UPDATE 
TO public 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public delete" ON prayers 
FOR DELETE 
TO public 
USING (true);

-- 8. Garantir permissões de acesso aos roles anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON prayers TO anon, authenticated, service_role;

-- 9. Configurar Supabase Storage para fotos
-- Cria o bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('prayer-photos', 'prayer-photos', true, 10485760, '{image/png,image/jpeg,image/webp,image/heic,image/gif}')
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de acesso ao bucket de fotos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'prayer-photos');

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'prayer-photos');
GRANT ALL ON churches TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
