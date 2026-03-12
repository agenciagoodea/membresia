
export enum LadderStage {
  WIN = 'GANHAR',
  CONSOLIDATE = 'CONSOLIDAR',
  DISCIPLE = 'DISCIPULAR',
  SEND = 'ENVIAR'
}

export enum UserRole {
  MASTER_ADMIN = 'MASTER ADMIN',
  CHURCH_ADMIN = 'ADMINISTRADOR DA IGREJA',
  PASTOR = 'PASTOR',
  CELL_LEADER_DISCIPLE = 'LÍDER DE CÉLULA / DISCIPULADOR',
  MEMBER_VISITOR = 'MEMBRO / VISITANTE'
}

export enum ChurchStatus {
  ACTIVE = 'ATIVO',
  SUSPENDED = 'SUSPENSO',
  PENDING = 'PENDENTE'
}

export enum PlanType {
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export interface PlanLimits {
  price: number;
  maxMembers: number;
  maxCells: number;
  maxLeaders: number;
  features: string[];
}

export enum PrayerStatus {
  PENDING = 'PENDENTE',
  APPROVED = 'APROVADO',
  IN_PRAYER = 'EM ORAÇÃO',
  ANSWERED = 'ATENDIDO',
  REJECTED = 'REJEITADO'
}

export enum MemberOrigin {
  EVANGELISM = 'EVANGELISMO',
  CELL_VISIT = 'VISITA DE CÉLULA',
  PRAYER_REQUEST = 'PEDIDO DE ORAÇÃO',
  OTHER_CHURCH = 'OUTRA IGREJA'
}

export interface StageHistory {
  stage: LadderStage;
  date: string;
  notes?: string;
  recordedBy: string;
  milestones?: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  stage: LadderStage;
  cellId: string;
  disciplerId?: string;
  avatar: string;
  stageHistory: StageHistory[];
  completedMilestones?: string[];
  origin?: MemberOrigin;
  baptismDate?: string;
  joinedDate: string;
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  maritalStatus?: string;
  spouseId?: string | null;
  login?: string;
  password?: string;
}

export interface MeetingReport {
  id: string;
  cellId: string;
  date: string;
  presentMemberIds: string[];
  visitorCount: number;
  childrenCount: number;
  photoUrl?: string;
  offeringAmount: number;
  report: string;
  recordedBy: string;
}

export interface Cell {
  id: string;
  name: string;
  leaderId: string;
  hostName: string;
  address: string;
  meetingDay: string;
  meetingTime: string;
  membersCount: number;
  status: 'ACTIVE' | 'MULTIPLYING' | 'INACTIVE';
  averageAttendance?: number;
  logo?: string;
}

export interface PrayerRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  photo?: string;
  request: string;
  status: PrayerStatus;
  createdAt: string;
  consentLGPD: boolean;
  isAnonymous: boolean;
  targetPerson: 'SELF' | 'OTHER';
  targetName?: string;
  showOnScreen: boolean;
  requestPastoralCall: boolean;
}

export interface ChurchTenant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  cnpj?: string;
  responsibleName?: string;
  email?: string;
  phone?: string;
  status: ChurchStatus;
  plan: PlanType;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
  addressDetails?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  stats: {
    totalMembers: number;
    activeCells: number;
    monthlyGrowth: number;
  };
}

export interface FinancialRecord {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
}
