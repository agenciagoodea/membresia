-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: churches (Tenants)
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo TEXT,
    cnpj TEXT,
    responsible_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'PENDENTE',
    plan TEXT DEFAULT 'BASIC',
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#1d4ed8',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    address_details JSONB,
    stats JSONB DEFAULT '{"totalMembers": 0, "activeCells": 0, "monthlyGrowth": 0}'::JSONB
);

-- Table: members
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL,
    stage TEXT NOT NULL,
    cell_id TEXT, -- Can be UUID later if we link to cells table
    discipler_id UUID REFERENCES members(id) ON DELETE SET NULL,
    baptism_date DATE,
    joined_date DATE DEFAULT CURRENT_DATE,
    avatar TEXT,
    stage_history JSONB DEFAULT '[]'::JSONB,
    cep TEXT,
    state TEXT,
    city TEXT,
    neighborhood TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: cells
CREATE TABLE IF NOT EXISTS cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
    host_name TEXT,
    address TEXT,
    meeting_day TEXT,
    meeting_time TEXT,
    members_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    average_attendance DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prayers
CREATE TABLE IF NOT EXISTS prayers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo TEXT,
    request TEXT NOT NULL,
    status TEXT DEFAULT 'PENDENTE',
    consent_lgpd BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    target_person TEXT DEFAULT 'SELF',
    target_name TEXT,
    show_on_screen BOOLEAN DEFAULT TRUE,
    request_pastoral_call BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: financial_records
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type TEXT NOT NULL, -- INCOME or EXPENSE
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT UNIQUE NOT NULL, -- BASIC, PRO, ENTERPRISE
    price DECIMAL(15,2) NOT NULL,
    max_members INTEGER,
    max_cells INTEGER,
    max_leaders INTEGER,
    features JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (name, type, price, max_members, max_cells, max_leaders, features)
VALUES 
('Básico', 'BASIC', 0.00, 50, 5, 10, '["Gestão de Membros", "Células Básicas"]'),
('Pro', 'PRO', 97.00, 500, 50, 100, '["Gestão Completa", "IA Insights", "Relatórios Financeiros"]'),
('Enterprise', 'ENTERPRISE', 297.00, 999999, 999999, 999999, '["Suporte 24/7", "Personalização Total", "Multi-Igrejas"]');
