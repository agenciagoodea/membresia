-- Adiciona campos na tabela meeting_reports
ALTER TABLE meeting_reports 
ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Cria o bucket 'cell_reports' caso ele não exista
insert into storage.buckets (id, name, public)
values ('cell_reports', 'cell_reports', true)
on conflict (id) do nothing;

-- Libera permissão para todos visualizarem as fotos (Select)
create policy "cell_reports_public_access"
  on storage.objects for select
  using ( bucket_id = 'cell_reports' );

-- Libera permissão para Inserção de fotos (Insert)
create policy "cell_reports_public_insert"
  on storage.objects for insert
  with check ( bucket_id = 'cell_reports' );

-- Adiciona a coluna para armazenar a URL da logomarca da célula
ALTER TABLE cells
ADD COLUMN IF NOT EXISTS logo text;

-- Cria o bucket 'cell_logos' caso ele não exista
insert into storage.buckets (id, name, public)
values ('cell_logos', 'cell_logos', true)
on conflict (id) do nothing;

-- Libera permissão para todos visualizarem as fotos (Select)
create policy "cell_logos_public_access"
  on storage.objects for select
  using ( bucket_id = 'cell_logos' );

-- Libera permissão para Inserção de fotos (Insert)
create policy "cell_logos_public_insert"
  on storage.objects for insert
  with check ( bucket_id = 'cell_logos' );
