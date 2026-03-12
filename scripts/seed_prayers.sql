
-- 1. Tenta inserir a igreja, se já existir pelo slug (vida-nova), não faz nada
INSERT INTO churches (name, slug, status, plan, primary_color, secondary_color)
VALUES (
  'Igreja Vida Nova', 
  'vida-nova', 
  'ATIVO', 
  'PRO',
  '#2563eb',
  '#1e40af'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insere os pedidos de oração buscando o ID correto da igreja pelo slug
-- Isso evita erros de Foreign Key e Duplicidade ao mesmo tempo

INSERT INTO prayers (church_id, name, request, status, is_anonymous, show_on_screen, target_person, target_name)
SELECT 
  id, 'Ana Cláudia Oliveira', 'Pela saúde da minha família, especialmente pelos meus avós que estão em idade avançada.', 'APROVADO', false, true, 'OTHER', 'Avós'
FROM churches WHERE slug = 'vida-nova'
UNION ALL
SELECT 
  id, 'Marcos Roberto', 'Agradeço a Deus por uma nova oportunidade de emprego que recebi esta semana! Deus é fiel.', 'APROVADO', false, true, 'SELF', NULL
FROM churches WHERE slug = 'vida-nova'
UNION ALL
SELECT 
  id, 'Juliana Santos', 'Peço oração pelo meu casamento e pela harmonia em nosso lar. Que o Senhor restaure o amor.', 'APROVADO', false, true, 'OTHER', 'Família Santos'
FROM churches WHERE slug = 'vida-nova'
UNION ALL
SELECT 
  id, 'Ricardo Lima', 'Por uma porta aberta na área financeira e sabedoria para administrar os recursos da melhor forma.', 'APROVADO', false, true, 'SELF', NULL
FROM churches WHERE slug = 'vida-nova'
UNION ALL
SELECT 
  id, 'Irmão em Cristo', 'Pela restauração da saúde do irmão José que está hospitalizado. Que a mão do Senhor o cure.', 'APROVADO', true, true, 'OTHER', 'Irmão José'
FROM churches WHERE slug = 'vida-nova'
UNION ALL
SELECT 
  id, 'Beatriz Fonseca', 'Agradecimento pela formatura da minha filha e pelos planos de Deus na vida dela daqui para frente.', 'APROVADO', false, true, 'OTHER', 'Filha Gabriela'
FROM churches WHERE slug = 'vida-nova';
