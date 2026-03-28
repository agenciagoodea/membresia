# Documentação do Sistema - Ecclesia SaaS (Membresia)

## Visão Geral
O **Ecclesia SaaS** (projeto Membresia) é uma plataforma de gestão de igrejas focada na **Visão Celular** (ex: M12) e no acompanhamento do ciclo de vida dos membros (Escada de Sucesso). O sistema é multi-tenant (várias igrejas) e oferece diferentes planos de assinatura (Basic, Pro, Enterprise).

## Stack Tecnológico
**Frontend:**
- **React 19** com **Vite** (TypeScript)
- **React Router v7** para navegação
- **Tailwind CSS** para estilização (utilitários de classe)
- **Lucide React** para iconografia
- **Recharts** para gráficos no Dashboard
- **Framer Motion** para animações
- **React Easy Crop** para edição/corte de imagens (avatares)

**Backend as a Service (BaaS):**
- **Supabase** (PostgreSQL, Auth, Storage)

**Integrações de IA:**
- **Google Generative AI (Gemini)** para ferramentas de IA (Insights de Célula e Resumos).

---

## Estrutura do Projeto (Arquitetura Frontend)

A aplicação segue uma arquitetura modular por contexto de negócio (Feature-basing) dentro do diretório `src/components`:

- `/Auth`: Componentes de autenticação e registro.
- `/Cells` & `CellModal.tsx`: Gestão de Células (Cadastro, Relatórios de Reuniões, Estatísticas).
- `/Dashboard.tsx`: Painel principal com gráficos e KPIS adaptados ao nível de acesso do usuário.
- `/Events`: Gestão da agenda de eventos globais e da igreja local.
- `/Finance.tsx`: Gestão financeira (entradas e saídas).
- `/IAInsights.tsx`: Módulo assistido por IA usando o Gemini para gerar roteiros de células ou análises pastorais.
- `/Ladder`: Gestão da "Escada de Sucesso" (M12) - visualização do funil de consolidação de membros.
- `/Marketing`: Área pública, landing pages e formulários públicos.
- `/MasterAdmin`: Painel exlusivo do dono do SaaS (Gestão de Inquilinos/Igrejas e Assinaturas).
- `/Member` & `Members.tsx`: Listagem, criação e edição de perfis de membros.

A pasta `src/services/` contém os manipuladores de regra de negócio e chamadas ao banco (SupabaseClient), separados por entidade (ex: `churchService.ts`, `memberService.ts`, `cellService.ts`, `authService.ts`).

---

## Perfis de Acesso e Permissões (Roles)

O sistema possui controle rigoroso baseado no Papel (Role) do usuário conectado, alterando dinamicamente o menu, os dashboards e as permissões de edição:

1. **Master Admin (SaaS Owner):** Visão top-level. Cria igrejas/clientes, define planos, gere acesso de administradores de igreja.
2. **Administrador da Igreja & Pastor:** Têm acesso a todo o painel da sua igreja (Tenant). Podem gerir todos os membros, células, criar eventos globais, visualizar dados financeiros, relatórios M12 gerais e utilizar IA Insights.
3. **Líder de Célula / Discipulador:** Têm acesso restrito. Podem ver os membros da sua própria célula, preencher relatórios de reunião ("Meeting Reports"), cuidar da jornada na Escada de Sucesso dos seus liderados e acessar IA Insights para estudos celulares.
4. **Membro / Visitante:** Aceso básico. Visualizam a agenda, os dados da sua célula (se aplicável), acompanham seu progresso na Visão e podem enviar/acompanhar pedidos de oração.

---

## Esquema do Banco de Dados (Supabase - PostgreSQL)

A arquitetura Multi-Tenant isola os dados de cada Igreja através da chave `church_id` nas tabelas principais.

### Tabelas Principais:
1. **churches (Igrejas/Tenants):** ID, Nome, Slug (para URL única), Plano de assinatura (`BASIC`, `PRO`, `ENTERPRISE`), endereço, status e estatísticas pré-calculadas.
2. **members (Membros):** Dados pessoais, email, telefone, Role, estágio na visão (`GANHAR`, `CONSOLIDAR`, `DISCIPULAR`, `ENVIAR`), célula vinculada (`cell_id`), liderança discipuladora, data de entrada e histórico de transições de estágio (`stage_history`).
3. **cells (Células):** Nome da célula, líder (ref members.id), anfitrião, endereço, dia e horário de encontro, e contagem de membresia atualizada.
4. **prayers (Pedidos de Oração):** Pedidos feitos publicamente ou por membros, controle de moderação (status: Pendente, Aprovado, Respondido), consentimento da LGPD e flag para exibição no telão (Broadcast).
5. **financial_records (Financeiro):** Controle fluxo de caixa (Entrada/Saída), categoria e valor financeiro atrelado à igreja.
6. **plans (Planos):** Tabela do sistema SaaS contendo os limites comerciais (ex: limite de membros, limite de células).

## Funcionalidades Core

- **Visão Celular / Escada de Sucesso (M12):** Funcionalidade central da aplicação, permite aos Pastores e Líderes moverem os membros através das trilhas: `Ganhar > Consolidar > Discipular > Enviar`. Mantém histórico para relatórios de conversão e retenção.
- **Relatório de Célula (Meeting Report):** No fim da reunião celular, o líder relata os presentes, número de visitantes, crianças presentes e valor da oferta colhida.
- **Pedidos de Oração Modal / Telão:** Sistema dual - o membro envia o pedido, e a equipe de intercessão da igreja modera. Se aprovado para exibição pública (`allowScreenBroadcast`), o pedido aparece automaticamente na tela de projeção da igreja (rota sem cabeçalho).
- **Relacionamentos de Mentoria:** Cada membro pode ser cadastrado não apenas por célula, mas também por um Discipulador (outro membro), formando a árvore hierárquica da visão adotada.

---

## Como Rodar o Projeto Básico

**Pré-requisitos:** Node.js (v18+)

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` (ou `.env.local`) informando as variáveis do Supabase e do Gemini:
   ```env
   VITE_SUPABASE_URL=url-do-seu-supabase
   VITE_SUPABASE_ANON_KEY=chave-anon-do-supabase
   VITE_GEMINI_API_KEY=chave-do-google-gemini
   ```
4. Suba a aplicação de desenvolvimento:
   ```bash
   npm run dev
   ```
A aplicação abrirá no localhost, porta padrão do Vite (geralmente `http://localhost:5173`).

---

*Documentação gerada automaticamente para o Sistema Membresia - Ecclesia SaaS.*
