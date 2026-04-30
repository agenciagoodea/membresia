
import React from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  TrendingUp,
  DollarSign,
  Settings,
  MessageSquare,
  Globe,
  CreditCard,
  ShieldAlert,
  HeartHandshake,
  Monitor,
  UserCircle,
  BookOpen,
  MapPin,
  Heart,
  Plus,
  Tv,
  Users2,
  Calendar,
  Target,
  Ticket
} from 'lucide-react';
export { PlanType } from './types';
import { Member, Cell, LadderStage, ChurchTenant, FinancialRecord, UserRole, ChurchStatus, PlanType, MeetingReport, PrayerRequest, PrayerStatus, PlanLimits, MemberStatus } from './types';

// SaaS PLAN CONFIGURATIONS
export const PLAN_CONFIGS: Record<PlanType, PlanLimits> = {
  [PlanType.BASIC]: {
    price: 97,
    maxMembers: 50,
    maxCells: 5,
    maxLeaders: 2,
    features: ['DASHBOARD', 'MEMBERS', 'CELLS', 'PRAYER_SYSTEM', 'AGENDA']
  },
  [PlanType.PRO]: {
    price: 247,
    maxMembers: 500,
    maxCells: 50,
    maxLeaders: 20,
    features: ['DASHBOARD', 'MEMBERS', 'CELLS', 'LADDER', 'PRAYER_SYSTEM', 'FINANCE', 'IA_INSIGHTS', 'AGENDA']
  },
  [PlanType.ENTERPRISE]: {
    price: 997,
    maxMembers: 99999,
    maxCells: 9999,
    maxLeaders: 9999,
    features: ['DASHBOARD', 'MEMBERS', 'CELLS', 'LADDER', 'PRAYER_SYSTEM', 'FINANCE', 'IA_INSIGHTS', 'WHITE_LABEL', 'AGENDA']
  }
};

// PLATFORM LEVEL (SaaS Owner)
export const MASTER_NAV_ITEMS = [
  { id: 'master-dashboard', label: 'Painel Global', icon: <LayoutDashboard size={20} /> },
  { id: 'churches', label: 'Igrejas / Clientes', icon: <Globe size={20} /> },
  { id: 'admins', label: 'Administradores', icon: <Users2 size={20} /> },
  { id: 'plans', label: 'Planos & Assinaturas', icon: <CreditCard size={20} /> },
  { id: 'security', label: 'Segurança & Auditoria', icon: <ShieldAlert size={20} /> },
  { id: 'master-settings', label: 'Configurações SaaS', icon: <Settings size={20} /> },
];

// CHURCH LEVEL (Pastor / Admin)
export const PASTOR_NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel Pastoral', icon: <LayoutDashboard size={20} /> },
  { id: 'members', label: 'Membros & Líderes', icon: <Users size={20} /> },
  { id: 'cells', label: 'Gestão de Células', icon: <Layers size={20} /> },
  { id: 'ladder', label: 'Visão Celular M12', icon: <TrendingUp size={20} /> },
  { id: 'm12-config', label: 'Configurar M12', icon: <Settings size={20} /> },
  { id: 'events', label: 'Agenda & Eventos', icon: <Calendar size={20} /> },
  { id: 'paid-events', label: 'Eventos Pagos', icon: <Ticket size={20} /> },
  { id: 'prayer-moderation', label: 'Moderação de Orações', icon: <HeartHandshake size={20} /> },
  { id: 'prayer-screen-link', label: 'Abrir Telão (Demo)', icon: <Tv size={20} /> },
  { id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} /> },
  { id: 'ia-insights', label: 'IA Insights', icon: <MessageSquare size={20} /> },
  { id: 'settings', label: 'Meu Perfil', icon: <Settings size={20} /> },
];

// GROUP LEVEL (Cell Leader)
export const LEADER_NAV_ITEMS = [
  { id: 'dashboard', label: 'Meu Painel', icon: <LayoutDashboard size={20} /> },
  { id: 'cells', label: 'Minhas Células', icon: <Layers size={20} /> },
  { id: 'ladder', label: 'Visão Celular M12', icon: <TrendingUp size={20} /> },
  { id: 'my-activities', label: 'Minhas Atividades M12', icon: <Target size={20} /> },
  { id: 'events', label: 'Agenda da Igreja', icon: <Calendar size={20} /> },
  { id: 'prayer-moderation', label: 'Pedidos de Oração', icon: <Heart size={20} /> },
  { id: 'ia-insights', label: 'Estudo de Célula (IA)', icon: <BookOpen size={20} /> },
  { id: 'profile', label: 'Meu Perfil', icon: <UserCircle size={20} /> },
];

// MEMBER LEVEL (Regular user / Visitor)
export const MEMBER_NAV_ITEMS = [
  { id: 'dashboard', label: 'Principal', icon: <LayoutDashboard size={20} /> },
  { id: 'events', label: 'Agenda', icon: <Calendar size={20} /> },
  { id: 'my-activities', label: 'Minhas Atividades M12', icon: <Target size={20} /> },
  { id: 'my-cell-detail', label: 'Minha Célula', icon: <MapPin size={20} /> },
  { id: 'prayer-request-new', label: 'Enviar Oração', icon: <Plus size={20} /> },
  { id: 'my-prayers', label: 'Histórico de Pedidos', icon: <Heart size={20} /> },
  { id: 'settings', label: 'Meu Perfil', icon: <Settings size={20} /> },
];

export const MOCK_CHURCHES: ChurchTenant[] = [
  {
    id: '779bc274-eab3-489e-a947-d4b0d39ed6ea',
    name: 'Ministério da Restauração - MIR Centro-Sul',
    slug: 'mircentrosul',
    logo: 'https://vXWU8FgB8oYRt.supabase.co/storage/v1/object/public/logos/mir-logo.png',
    cnpj: '26306700000100',
    status: ChurchStatus.ACTIVE,
    plan: PlanType.ENTERPRISE,
    primaryColor: '#0047AB',
    secondaryColor: '#FFD700',
    createdAt: '2023-01-10',
    stats: { totalMembers: 0, activeCells: 0, monthlyGrowth: 0 }
  }
];

export const MOCK_TENANT = MOCK_CHURCHES[0];

export const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 98888-7777',
    role: UserRole.CELL_LEADER_DISCIPLE,
    status: MemberStatus.ACTIVE,
    stage: LadderStage.SEND,
    cellId: 'c1',
    joinedDate: '2022-01-15',
    avatar: 'https://i.pravatar.cc/150?u=1',
    birthDate: '1990-05-15',
    stageHistory: [
      { stage: LadderStage.WIN, date: '2022-01-15', recordedBy: 'Admin', notes: 'Aceitou a Jesus no culto de jovens.' },
      { stage: LadderStage.CONSOLIDATE, date: '2022-02-10', recordedBy: 'Admin' },
      { stage: LadderStage.DISCIPLE, date: '2022-06-01', recordedBy: 'Pr. André' },
      { stage: LadderStage.SEND, date: '2023-01-15', recordedBy: 'Pr. André', notes: 'Iniciou liderança da Célula Renovo.' }
    ]
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '(11) 97777-6666',
    role: UserRole.CELL_LEADER_DISCIPLE,
    status: MemberStatus.ACTIVE,
    stage: LadderStage.DISCIPLE,
    cellId: 'c1',
    joinedDate: '2023-03-10',
    avatar: 'https://i.pravatar.cc/150?u=2',
    birthDate: '1995-08-20',
    stageHistory: [
      { stage: LadderStage.WIN, date: '2023-03-10', recordedBy: 'João Silva' },
      { stage: LadderStage.CONSOLIDATE, date: '2023-04-10', recordedBy: 'João Silva' },
      { stage: LadderStage.DISCIPLE, date: '2023-10-15', recordedBy: 'João Silva' }
    ]
  },
  { id: 'Pedro Souza', name: 'Pedro Souza', email: 'pedro@email.com', phone: '(11) 96666-5555', role: UserRole.MEMBER_VISITOR, status: MemberStatus.ACTIVE, stage: LadderStage.CONSOLIDATE, cellId: 'c2', joinedDate: '2024-05-20', avatar: 'https://i.pravatar.cc/150?u=3', birthDate: '1988-12-05', stageHistory: [] },
  { id: '4', name: 'Ana Costa', email: 'ana@email.com', phone: '(11) 95555-4444', role: UserRole.MEMBER_VISITOR, status: MemberStatus.ACTIVE, stage: LadderStage.WIN, cellId: 'c3', joinedDate: '2024-11-01', avatar: 'https://i.pravatar.cc/150?u=4', birthDate: '1992-03-25', stageHistory: [] },
];

export const MOCK_CELLS: Cell[] = [
  { id: 'c1', name: 'Célula Renovo', leaderId: '1', hostName: 'Família Silva', address: 'Rua das Flores, 123', meetingDay: 'Terça-feira', meetingTime: '20:00', membersCount: 12, status: 'ACTIVE', averageAttendance: 10 },
  { id: 'c2', name: 'Célula Esperança', leaderId: '2', hostName: 'Marcos Oliveira', address: 'Av. Brasil, 500', meetingDay: 'Quarta-feira', meetingTime: '19:30', membersCount: 8, status: 'ACTIVE', averageAttendance: 7 },
  { id: 'c3', name: 'Célula Alpha', leaderId: '1', hostName: 'Centro Comunitário', address: 'Rua Central, 10', meetingDay: 'Sábado', meetingTime: '18:00', membersCount: 15, status: 'ACTIVE', averageAttendance: 13 }
];

export const MOCK_PRAYER_REQUESTS: PrayerRequest[] = [
  {
    id: '1',
    name: 'Roberto Almeida',
    phone: '(11) 99999-0000',
    email: 'roberto@email.com',
    request: 'Pela saúde da minha mãe que fará uma cirurgia amanhã.',
    status: PrayerStatus.APPROVED,
    createdAt: '2024-06-10T10:00:00Z',
    consentLGPD: true,
    isAnonymous: false,
    targetPerson: 'OTHER',
    targetName: 'Maria Almeida',
    allowScreenBroadcast: true,
    requestPastoralCall: false
  },
  {
    id: '2',
    name: 'Carla Dias',
    phone: '(11) 98888-1111',
    email: 'carla@email.com',
    request: 'Agradecimento por uma porta de emprego aberta.',
    status: PrayerStatus.IN_PRAYER,
    createdAt: '2024-06-11T14:30:00Z',
    consentLGPD: true,
    isAnonymous: false,
    targetPerson: 'SELF',
    allowScreenBroadcast: true,
    requestPastoralCall: false
  },
  {
    id: '3',
    name: 'Marcos Vinicius',
    phone: '(11) 97777-2222',
    email: 'marcos@email.com',
    request: 'Pela restauração do meu casamento.',
    status: PrayerStatus.PENDING,
    createdAt: '2024-06-12T08:15:00Z',
    consentLGPD: true,
    isAnonymous: false,
    targetPerson: 'SELF',
    allowScreenBroadcast: false,
    requestPastoralCall: true
  }
];

export const MOCK_MEETING_REPORTS: MeetingReport[] = [
  {
    id: 'r1',
    cellId: 'c1',
    date: '2024-06-04',
    presentMemberIds: ['1', '2'],
    visitorCount: 2,
    childrenCount: 0,
    offeringAmount: 150.00,

    report: 'Reunião abençoada com muito louvor e uma palavra sobre fé.',
    recordedBy: 'João Silva'
  }
];

export const MOCK_FINANCE: FinancialRecord[] = [
  { id: 'f1', description: 'Dízimos Culto Domingo', amount: 2500, type: 'INCOME', date: '2024-06-02', category: 'Dízimos' },
  { id: 'f2', description: 'Aluguel Prédio Central', amount: 1200, type: 'EXPENSE', date: '2024-06-05', category: 'Aluguel' },
  { id: 'f3', description: 'Ofertas Células', amount: 850, type: 'INCOME', date: '2024-06-07', category: 'Ofertas' },
  { id: 'f4', description: 'Manutenção Som', amount: 350, type: 'EXPENSE', date: '2024-06-08', category: 'Manutenção' }
];
