
export enum LadderStage {
  WIN = 'GANHAR',
  CONSOLIDATE = 'CONSOLIDAR',
  DISCIPLE = 'DISCIPULAR',
  SEND = 'ENVIAR'
}

export type FormLogicType = 
  | 'BOOLEAN' 
  | 'STATUS' 
  | 'SELECT' 
  | 'MULTI_SELECT' 
  | 'TEXT' 
  | 'DATE' 
  | 'NUMBER' 
  | 'UPLOAD' 
  | 'RELATIONAL' 
  | 'CALCULATED' 
  | 'HIDDEN';

export type DataSource = 'MANUAL' | 'AUTO' | 'RELATIONAL';

export interface M12Activity {
  id: string;
  churchId: string;
  stage: LadderStage;
  label: string;
  order: number;
  description?: string;
  isActive: boolean;
  isRequired: boolean;
  isEditable: boolean;
  isVisible: boolean;
  defaultValue?: any;
  configOptions?: string[]; // Para SELECT e MULTI_SELECT
  isMultipleChoice: boolean;
  dependsOnId?: string;
  logicalCondition?: string; // Regra para exibição condicional
  isCalculated: boolean;
  dataSource: DataSource;
  logicType: FormLogicType;
  createdAt: string;
}

export interface M12Performance {
  memberId: string;
  stage: LadderStage;
  startDate: string;
  completionDate?: string;
  totalActivities: number;
  completedActivities: number;
  daysActive: number;
  efficiency: number; // percentage
}

export enum UserRole {
  MASTER_ADMIN = 'MASTER ADMIN',
  CHURCH_ADMIN = 'ADMINISTRADOR DA IGREJA',
  PASTOR = 'PASTOR',
  CELL_LEADER_DISCIPLE = 'LÍDER DE CÉLULA / DISCIPULADOR',
  MEMBER_VISITOR = 'MEMBRO / VISITANTE'
}

export enum MemberStatus {
  PENDING = 'PENDENTE',
  ACTIVE = 'ATIVO',
  REJECTED = 'REJEITADO'
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

export interface Child {
  id: string;
  name: string;
  birthDate: string;
  photo?: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string;
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
  churchId?: string;
  role: UserRole;
  status: MemberStatus;
  stage: LadderStage;
  cellId: string; // "Célula que Participa"
  leadingCellIds?: string[]; // "Células que Lidera" (Multiple allowed)
  disciplerId?: string;
  avatar: string;
  stageHistory: StageHistory[];
  completedMilestones?: string[];
  origin?: string;
  joinedDate: string;
  cpf?: string;
  userId?: string;

  sex?: 'MASCULINO' | 'FEMININO';
  hasChildren?: boolean;
  children?: Child[];

  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  maritalStatus?: string;
  spouseId?: string | null;
  pastorId?: string;
  login?: string;
  password?: string;
  birthDate: string; // Now mandatory
  conversionDate?: string;
  firstAccessCompleted?: boolean;
  milestoneValues?: { [key: string]: any };
}

export interface MeetingReport {
  id: string;
  cellId: string;
  date: string;
  presentMemberIds: string[];
  visitorCount: number;
  childrenCount: number;
  visitors?: Visitor[]; // Repeater for visitors in report
  children?: Child[]; // Repeater for children in report
  photoUrl?: string;
  offeringAmount: number;
  report: string;
  recordedBy: string;
}

export interface Cell {
  id: string;
  churchId?: string;
  name: string;
  leaderId: string; // Primary leader or legacy
  leaderIds?: string[]; // Multiple leaders support
  supervisorId?: string;
  pastorId?: string;
  hostId?: string;
  hostName: string;
  address: string;
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  meetingDay: string;
  meetingTime: string;
  membersCount: number;
  status: 'ACTIVE' | 'MULTIPLYING' | 'INACTIVE';
  averageAttendance?: number;
  logo?: string;
}

export interface CellMeetingException {
  id: string;
  cell_id: string;
  original_date: string;
  new_date?: string;
  new_time?: string;
  status: 'CANCELLED' | 'RESCHEDULED';
  reason?: string;
  church_id: string;
  created_at?: string;
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
  isAnonymous: boolean; // Legacy
  allowScreenBroadcast: boolean; // "Transmitir no telão?"
  targetPerson: 'SELF' | 'OTHER';
  targetName?: string;
  requestPastoralCall: boolean; // Rename label in UI to "Acompanhamento Pastoral"
  addressDetails?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
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

export interface ChurchEvent {
  id: string;
  church_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  image_url?: string;
  created_by: string;
  responsible_pastor_id?: string;
  coordinator_id?: string;
  assistant_ids?: string[];
  cell_ids?: string[];
  created_at: string;
}

// ═══════════════════════════════════════════════════════
// Módulo: Eventos Pagos
// ═══════════════════════════════════════════════════════

export enum PaidEventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  AWAITING_PROOF = 'aguardando_comprovante',
  PROOF_SENT = 'comprovante_enviado',
  UNDER_REVIEW = 'em_analise',
  CONFIRMED = 'pago_confirmado',
  REJECTED = 'recusado',
  CANCELLED = 'cancelado'
}

export interface PaidEvent {
  id: string;
  church_id: string;
  created_by: string;
  title: string;
  slug: string;
  description?: string;
  banner_url?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  price: number;
  max_participants?: number;
  pix_key?: string;
  pix_receiver_name?: string;
  pix_receiver_city?: string;
  pix_qrcode_payload?: string;
  confirmation_message?: string;
  payment_instructions?: string;
  status: PaidEventStatus;
  is_featured: boolean;
  public_link?: string;
  coordenador_id?: string;
  auxiliares_ids?: string[];
  created_at: string;
  updated_at: string;
  // Campos calculados (não no DB)
  registrations_count?: number;
  confirmed_count?: number;
}

export interface PaidEventRegistration {
  id: string;
  church_id: string;
  event_id: string;
  member_id?: string;
  photo_url?: string;
  full_name: string;
  email?: string;
  age?: number;
  gender?: 'Masculino' | 'Feminino';
  discipler_name?: string;
  phone?: string;
  pastor_name?: string;
  shirt_size?: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG';
  transport_type?: 'Carro' | 'Ônibus';
  has_allergy: boolean;
  allergy_description?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  prayer_request?: string;
  observations?: string;
  payment_proof_url?: string;
  payment_status: PaymentStatus;
  payment_confirmed_by?: string;
  payment_confirmed_at?: string;
  pdf_url?: string;
  registration_code: string;
  created_at: string;
  updated_at: string;
}

export interface PaidEventPaymentLog {
  id: string;
  church_id: string;
  event_id: string;
  registration_id: string;
  previous_status?: string;
  new_status: string;
  changed_by: string;
  note?: string;
  created_at: string;
}
