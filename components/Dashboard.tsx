
import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  TrendingUp,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Globe,
  DollarSign,
  PieChart,
  ShieldAlert,
  Zap,
  Target,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Map,
  X,
  Bell,
  Activity,
  ChevronRight,
  Mail,
  Phone,
  Lock
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell as RechartsCell
} from 'recharts';
import { PLAN_CONFIGS } from '../constants';
import { LadderStage, UserRole, PrayerStatus, Member, Cell, PrayerRequest, PlanType } from '../types';
import { memberService } from '../services/memberService';
import { cellService } from '../services/cellService';
import { prayerService } from '../services/prayerService';
import { churchService } from '../services/churchService';
import PageHeader from './Shared/PageHeader';
import MyProgress from './Member/MyProgress';
import MyCellDetail from './Member/MyCellDetail';
import PrayerHistory from './Member/PrayerHistory';
import PrayerForm from './Prayer/PrayerForm';
import { useChurch } from '../contexts/ChurchContext';


const dataGrowth = [
  { name: 'Jan', members: 380, revenue: 12000 },
  { name: 'Fev', members: 395, revenue: 13500 },
  { name: 'Mar', members: 410, revenue: 14200 },
  { name: 'Abr', members: 405, revenue: 13800 },
  { name: 'Mai', members: 425, revenue: 15500 },
  { name: 'Jun', members: 450, revenue: 18000 },
];


const StatCard = ({ title, value, trend, icon, color, subValue }: any) => (
  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl hover:bg-zinc-800 transition-all group overflow-hidden relative">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-black/20`}>
        {icon}
      </div>
      <button className="text-zinc-600 hover:text-zinc-300">
        <MoreVertical size={20} />
      </button>
    </div>
    <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.15em] mb-2">{title}</p>
    <div className="flex items-baseline gap-3">
      <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
      {subValue && <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{subValue}</span>}
    </div>
    {trend !== undefined && (
      <div className="flex items-center gap-2 mt-4">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {Math.abs(trend)}%
        </div>
        <span className="text-zinc-600 text-[10px] font-bold uppercase">vs mês passado</span>
      </div>
    )}
  </div>
);
const MasterDashboard = () => {
  const [churches, setChurches] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    churchService.list().then((data: any[]) => {
      if (!cancelled) { setChurches(data || []); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalMembers = churches.reduce((s, c) => s + (c.stats?.totalMembers || 0), 0);
  const totalCells   = churches.reduce((s, c) => s + (c.stats?.activeCells   || 0), 0);

  // Distribuição de planos
  const planCount: Record<string, number> = {};
  churches.forEach(c => { planCount[c.plan] = (planCount[c.plan] || 0) + 1; });
  const planColors: Record<string, string> = { enterprise: 'bg-indigo-600', pro: 'bg-blue-600', basic: 'bg-zinc-400' };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title="Global Control"
        subtitle="Visão estratégica e saúde do ecossistema SaaS."
        actions={
          <div className="flex w-full md:w-auto items-center justify-center gap-3 text-[10px] font-black text-zinc-400 bg-zinc-900 border border-white/5 px-5 py-3 rounded-2xl shadow-2xl">
            <Activity size={14} className="text-emerald-500 animate-pulse" /> INFRA ESTRUTURA ONLINE
          </div>
        }
      />

      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard title="Total de Igr. / Clientes" value={churches.length} icon={<Globe className="text-blue-400" />} color="bg-blue-500/10" />
            <StatCard title="Total de Membros" value={totalMembers} icon={<Users className="text-emerald-400" />} color="bg-emerald-500/10" />
            <StatCard title="Células Ativas" value={totalCells} icon={<Layers className="text-amber-400" />} color="bg-amber-500/10" />
            <StatCard title="Planos Ativos" value={Object.values(planCount).reduce((a, b) => a + b, 0)} icon={<Zap className="text-rose-400" />} color="bg-rose-500/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Lista de Igrejas */}
            <div className="lg:col-span-2 bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h4 className="font-black text-white text-xl mb-8 flex items-center gap-4 uppercase tracking-tighter">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Igrejas Cadastradas
              </h4>
              {churches.length === 0 ? (
                <p className="text-zinc-600 text-center py-10 font-black uppercase tracking-widest text-[10px]">Nenhuma igreja cadastrada ainda</p>
              ) : (
                <div className="space-y-4">
                  {churches.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        {c.logo ? (
                          <img src={c.logo} className="w-10 h-10 rounded-xl object-cover" alt={c.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                            {c.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white">{c.name}</p>
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">{c.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 text-right">
                        <div>
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Membros</p>
                          <p className="text-sm font-black text-white">{c.stats?.totalMembers || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Células</p>
                          <p className="text-sm font-black text-white">{c.stats?.activeCells || 0}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          c.plan === 'enterprise' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : c.plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/20'
                        }`}>{c.plan || 'basic'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SaaS Health */}
            <div className="bg-zinc-100 p-10 rounded-[3rem] text-zinc-950 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-5"><PieChart size={180} /></div>
              <div>
                <Zap size={48} className="mb-8 text-blue-600 fill-blue-600/20" />
                <h4 className="text-3xl font-black mb-2 tracking-tighter">SaaS Health</h4>
                <p className="text-zinc-500 text-sm mb-12 font-bold uppercase tracking-widest">Carga por Plano</p>
                <div className="space-y-8">
                  {Object.keys(planColors).map(plan => {
                    const count = planCount[plan] || 0;
                    const total = churches.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                          <span>{plan}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-zinc-950/5 h-2 rounded-full overflow-hidden">
                          <div className={`${planColors[plan]} h-full rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button className="mt-12 w-full py-5 bg-zinc-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Rel. Completo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ChurchAdminDashboard = ({ members, cells, prayers }: { members: Member[], cells: Cell[], prayers: PrayerRequest[] }) => {
  const planLimits = PLAN_CONFIGS[PlanType.PRO]; // Fallback para PRO enquanto não carregamos detalhes da igreja
  const totalMembers = members.length;
  const activeCells = cells.length;
  const memberPercent = (totalMembers / planLimits.maxMembers) * 100;
  const cellPercent = (activeCells / planLimits.maxCells) * 100;

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title="Painel Administrativo"
        subtitle="Gerenciamento operacional e supervisão."
        actions={
          <span className="w-full md:w-auto text-center px-5 py-2.5 bg-blue-600/10 text-blue-500 rounded-2xl text-[10px] font-black border border-blue-500/20 uppercase tracking-widest">
            ACESSO ADMINISTRATIVO
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Membros Cadastrados" value={totalMembers} subValue={`/ ${planLimits.maxMembers}`} trend={totalMembers > 0 ? 100 : 0} icon={<Users className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard title="Células Ativas" value={activeCells} subValue={`/ ${planLimits.maxCells}`} trend={activeCells > 0 ? 100 : 0} icon={<Layers className="text-indigo-400" />} color="bg-indigo-500/10" />
        <StatCard title="Orações Pendentes" value={prayers.filter(p => p.status === PrayerStatus.PENDING).length} subValue="pedidos" icon={<Clock className="text-amber-400" />} color="bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={100} /></div>
          <h4 className="font-black text-white text-xl mb-12 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Limites de Escala
          </h4>
          <div className="space-y-12">
            <div>
              <div className="flex justify-between mb-3 items-end">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Membros Ativos</span>
                <span className="text-xs font-black text-white">{totalMembers} / {planLimits.maxMembers}</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full rounded-full ${memberPercent > 90 ? 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]'} transition-all duration-1000`} style={{ width: `${memberPercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-3 items-end">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Células Ativas</span>
                <span className="text-xs font-black text-white">{activeCells} / {planLimits.maxCells}</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full rounded-full ${cellPercent > 90 ? 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]'} transition-all duration-1000`} style={{ width: `${cellPercent}%` }}></div>
              </div>
            </div>
          </div>
          <button className="mt-12 w-full py-4 bg-zinc-800 text-zinc-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:bg-zinc-700 transition-all flex items-center justify-center gap-3">
            UPGRADE DISPONÍVEL <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full" /> Últimos Membros
          </h4>
          <div className="space-y-6">
            {members.length === 0 ? (
              <p className="text-zinc-600 text-center py-10 font-black uppercase tracking-widest text-[10px]">Nenhum membro cadastrado ainda</p>
            ) : (members.slice(0, 5).map((m, i) => (
              <div key={m.id || i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0">
                <div className="flex items-center gap-4">
                  <img
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=2563eb&color=fff&size=80`}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'User')}&background=2563eb&color=fff&size=80`; }}
                    className="w-12 h-12 rounded-full border border-white/10"
                    alt=""
                  />
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{m.name}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">{m.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">{m.joinedDate ? new Date(m.joinedDate).toLocaleDateString('pt-BR') : ''}</span>
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PastorDashboard = ({ members, cells, prayers }: { members: Member[], cells: Cell[], prayers: PrayerRequest[] }) => {
  const ladderDist = [
    { stage: 'Ganhar', count: members.filter(m => m.stage === LadderStage.WIN).length, color: '#3b82f6' },
    { stage: 'Consolidar', count: members.filter(m => m.stage === LadderStage.CONSOLIDATE).length, color: '#10b981' },
    { stage: 'Discipular', count: members.filter(m => m.stage === LadderStage.DISCIPLE).length, color: '#f59e0b' },
    { stage: 'Enviar', count: members.filter(m => m.stage === LadderStage.SEND).length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title="Pastoral Insights"
        subtitle="Indicadores de saúde espiritual e crescimento."
        actions={
          <div className="flex w-full md:w-auto items-center justify-center gap-3 text-[10px] font-black text-zinc-400 bg-zinc-900 border border-white/5 px-5 py-3 rounded-2xl">
            <Calendar size={14} className="text-blue-500" /> JUNHO 2024
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Total Membros" value={members.length} trend={12} icon={<Users className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard title="Células Ativas" value={cells.length} trend={8} icon={<Layers className="text-purple-400" />} color="bg-purple-500/10" />
        <StatCard title="Pedidos de Clamor" value={prayers.filter(r => r.status === PrayerStatus.PENDING).length} icon={<Heart className="text-rose-400" />} color="bg-rose-500/10" />
        <StatCard title="Alvos de Batismo" value="45" trend={15} icon={<Target className="text-indigo-400" />} color="bg-indigo-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h4 className="font-black text-white text-xl mb-12 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Pipeline da Escada do Sucesso
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ladderDist}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="count" radius={[12, 12, 4, 4]}>
                  {ladderDist.map((entry, index) => (
                    <RechartsCell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-black p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 opacity-10"><Zap size={200} /></div>
          <div>
            <Zap size={48} className="mb-8 text-indigo-400 animate-pulse" />
            <h4 className="text-4xl font-black mb-2 tracking-tighter uppercase">Visão 2024</h4>
            <p className="text-indigo-300 text-sm mb-12 font-bold uppercase tracking-widest italic leading-relaxed">Meta: 100 células ativas e 1.200 discípulos em envio.</p>
            <div className="space-y-8">
              {[
                { label: 'DISCÍPULOS', val: 45 },
                { label: 'ESTRUTURA', val: 42 },
              ].map(meta => (
                <div key={meta.label}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">
                    <span>{meta.label}</span>
                    <span>{meta.val}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-indigo-500 h-full rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${meta.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaderDashboard = ({ user, members, cells }: { user: any, members: Member[], cells: Cell[] }) => {
  const myChurchId = user?.churchId || user?.church_id;
  const myCell = cells.find(c => c.leaderId === user.id) || (cells.length > 0 ? cells[0] : null);
  
  if (!myCell) return (
    <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
      Nenhuma célula vinculada ou encontrada.
    </div>
  );

  const cellMembers = members.filter(m => m.cellId === myCell.id);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title={myCell.name}
        subtitle="Cuidado e pastoreio local."
        actions={
          <button className="w-full md:w-auto px-8 py-3 md:py-4 bg-blue-600 text-white rounded-2xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
            Lançar Relatório
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Presença Média" value="88%" trend={2} icon={<Users className="text-emerald-400" />} color="bg-emerald-500/10" />
        <StatCard title="Visitantes" value="3" trend={50} icon={<TrendingUp className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard title="Transições" value="2" subValue="estágios" icon={<Target className="text-amber-400" />} color="bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Meus Discípulos
          </h4>
          <div className="space-y-5">
            {cellMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-[1.5rem] transition-all border border-transparent hover:border-white/5 group">
                <div className="flex items-center gap-4">
                  <img src={m.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'} className="w-12 h-12 rounded-full ring-2 ring-white/10 group-hover:ring-blue-500 transition-all object-cover aspect-square" alt="" />
                  <div>
                    <p className="text-sm font-black text-white uppercase">{m.name}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">{m.stage}</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors">Ver Perfil</button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-zinc-950 p-10 rounded-[3rem] border border-white/5 border-dashed relative">
          <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Próxima Reunião
          </h4>
          <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute -right-5 -top-5 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={120} /></div>
            <div className="flex items-center gap-6 mb-8">
              <div className="bg-blue-600 text-white w-20 h-20 rounded-[1.5rem] font-black flex flex-col items-center justify-center shadow-xl shadow-blue-500/20">
                <p className="text-[10px] uppercase tracking-widest">Ter</p>
                <p className="text-3xl tracking-tighter leading-none mt-1">11</p>
              </div>
              <div>
                <p className="text-xl font-black text-white uppercase tracking-tight">{myCell.name}</p>
                <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">{myCell.meetingTime} • {myCell.hostName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mb-10 font-black uppercase tracking-widest">
              <MapPin size={16} className="text-rose-500" /> {myCell.address}
            </div>
            <button className="w-full py-5 bg-white text-zinc-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5 text-center">
              Notificar via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemberDashboard = ({ user, prayers, activeTab = 'JOURNEY' }: { user: any, prayers: PrayerRequest[], activeTab?: string }) => {
  const [mentors, setMentors] = useState<{ leader?: Member, pastor?: Member }>({});
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'new-prayer') {
      setIsPrayerModalOpen(true);
    }
  }, [location]);

  useEffect(() => {
    const loadMentors = async () => {
      if (user.disciplerId || user.pastorId) {
        try {
          const [leader, pastor] = await Promise.all([
            user.disciplerId ? memberService.getById(user.disciplerId) : Promise.resolve(undefined),
            user.pastorId ? memberService.getById(user.pastorId) : Promise.resolve(undefined)
          ]);
          setMentors({ leader: leader as any, pastor: pastor as any });
        } catch (e) {
          console.error("Erro ao carregar mentores:", e);
        }
      }
    };
    loadMentors();
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'PROGRESS':
        return <MyProgress user={user} />;
      case 'CELL':
        return <MyCellDetail user={user} />;
      case 'PRAYERS':
        return <PrayerHistory user={user} />;
      default:
        return (
          <div className="space-y-10">
            <div className="bg-zinc-100 p-12 md:p-16 rounded-[3.5rem] text-zinc-950 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-5"><Zap size={300} /></div>
              <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase leading-[0.9]">Paz do Senhor, <br />{user.name.split(' ')[0]}!</h2>
              <p className="text-zinc-600 max-w-lg mb-12 font-bold text-lg leading-relaxed italic">Sua caminhada é preciosa para nós. <br />Veja seu progresso na Escada do Sucesso.</p>

              <div className="flex items-center gap-6 md:gap-10 overflow-x-auto pb-4 scrollbar-hide">
                {[
                  { stage: LadderStage.WIN, icon: <CheckCircle2 size={40} />, color: 'bg-emerald-600', active: user.stage === LadderStage.WIN || true },
                  { stage: LadderStage.CONSOLIDATE, icon: <Clock size={40} />, color: 'bg-blue-600', active: user.stage === LadderStage.CONSOLIDATE },
                  { stage: LadderStage.DISCIPLE, icon: <Target size={40} />, color: 'bg-amber-500', active: user.stage === LadderStage.DISCIPLE },
                  { stage: LadderStage.SEND, icon: <Zap size={40} />, color: 'bg-indigo-600', active: user.stage === LadderStage.SEND },
                ].map((s, i) => (
                  <React.Fragment key={s.stage}>
                    <div className={`flex flex-col items-center shrink-0 ${!s.active ? 'opacity-30' : ''}`}>
                      <div className={`w-20 h-20 ${s.color} text-white rounded-[1.5rem] flex items-center justify-center mb-4 shadow-xl ${s.active ? 'ring-4 ring-white animate-pulse' : ''}`}>
                        {s.icon}
                      </div>
                      <span className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.3em]">{s.stage}</span>
                    </div>
                    {i < 3 && <div className="h-0.5 w-16 bg-zinc-300 shrink-0"></div>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* BARRA DE MENTORES */}
            <div className="bg-white p-4 rounded-[2rem] shadow-xl flex flex-wrap items-center gap-8 px-8">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-r border-zinc-100 pr-8 hidden md:block">Meus Mentores</div>
              
              <div className="flex items-center gap-4">
                <img src={mentors.pastor?.avatar || 'https://i.pravatar.cc/150?u=pastor'} className="w-10 h-10 rounded-full ring-2 ring-zinc-100" />
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Meu Pastor</p>
                  <p className="text-xs font-bold text-zinc-950 uppercase">{mentors.pastor?.name || 'Carregando...'}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-zinc-100 hidden sm:block" />

              <div className="flex items-center gap-4">
                <img src={mentors.leader?.avatar || 'https://i.pravatar.cc/150?u=leader'} className="w-10 h-10 rounded-full ring-2 ring-zinc-100" />
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Meu Discipulador</p>
                  <p className="text-xs font-bold text-zinc-950 uppercase">{mentors.leader?.name || 'Aguardando Direcionamento'}</p>
                </div>
              </div>

              <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100 italic text-[10px] font-medium text-zinc-500">
                <Activity size={12} className="text-emerald-500" /> Cobertura Espiritual Ativa
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
                <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full" /> Minhas Orações
                </h4>
                <div className="space-y-5 flex-1">
                  {prayers.length > 0 ? prayers.slice(0, 2).map(r => (
                    <div key={r.id} className="p-6 bg-zinc-950 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{new Date(r.createdAt).toLocaleDateString()}</span>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${r.status === PrayerStatus.IN_PRAYER ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 font-medium italic leading-relaxed line-clamp-2">"{r.request}"</p>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">Nenhum pedido recente</div>
                  )}
                </div>
                <button 
                  onClick={() => setIsPrayerModalOpen(true)}
                  className="w-full py-5 bg-zinc-800 border border-white/5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-zinc-700 transition-all mt-4"
                >
                  Novo Pedido de Fé
                </button>
              </div>

              <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
                <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" /> Minha Célula
                </h4>
                <div className="flex items-center gap-5 p-6 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 mb-8">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Layers size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-black uppercase tracking-tight leading-none truncate">Célula Renovo</p>
                    <p className="text-[10px] text-blue-100 font-black uppercase tracking-[0.1em] mt-1 truncate">Líder: Pr. João Silva</p>
                  </div>
                </div>
                <div className="space-y-5 px-4 mb-10 flex-1">
                  <div className="flex items-center gap-4 text-zinc-300 text-sm font-bold uppercase tracking-widest">
                    <Calendar size={18} className="text-zinc-600" /> Terça-feira às 20h
                  </div>
                  <div className="flex items-center gap-4 text-zinc-300 text-sm font-bold uppercase tracking-widest">
                    <MapPin size={18} className="text-zinc-600" /> Rua das Flores, 123
                  </div>
                </div>
                <button className="w-full py-5 bg-white text-zinc-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-105 transition-all text-center">
                  Como Chegar
                </button>
              </div>

              {/* CARD DE NOTÍCIAS (TERCEIRO CAMPO) */}
              <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity"><Bell size={200} /></div>
                <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" /> Notícias & Eventos
                </h4>
                <div className="space-y-6 flex-1">
                  <div className="p-5 bg-zinc-950 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded-full uppercase tracking-widest">Destaque</span>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase">15 Jun</span>
                    </div>
                    <p className="text-sm font-black text-white uppercase leading-tight mb-2">Conferência de Células: Frutos do Espírito</p>
                    <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">Prepare-se para um tempo sobrenatural com toda a nossa liderança...</p>
                  </div>
                  <div className="p-5 bg-zinc-950 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all cursor-pointer">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Aviso Ministerial</p>
                    <p className="text-sm font-bold text-zinc-200 leading-tight">Batismo nas Águas em Agosto. Inscrições abertas no site.</p>
                  </div>
                </div>
                <button className="w-full py-5 bg-zinc-950 border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 hover:text-white transition-all mt-4">
                  Ver Todas
                </button>
              </div>
            </div>

            {/* Modal de Oração Inline */}
            {isPrayerModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsPrayerModalOpen(false)} />
                <div className="relative w-full max-w-4xl bg-zinc-950 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                   <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Enviar Pedido de Oração</h3>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Conecte seu clamor ao altar da igreja.</p>
                      </div>
                      <button onClick={() => setIsPrayerModalOpen(false)} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl">
                        <X size={20} />
                      </button>
                   </div>
                   <div className="max-h-[80vh] overflow-y-auto p-4 scrollbar-hide">
                      <PrayerForm isInline onComplete={() => setIsPrayerModalOpen(false)} />
                   </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in duration-700">
      {renderContent()}
    </div>
  );
};

const Dashboard: React.FC<{ user: any, activeTab?: string }> = ({ user, activeTab }) => {
  const { members, cells, prayers, loading } = useChurch();

  if (loading && user.role !== UserRole.MASTER_ADMIN) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Ecossistema...
      </div>
    );
  }

  const role = user.role;

  switch (role) {
    case UserRole.MASTER_ADMIN:
      return <MasterDashboard />;
    case UserRole.CHURCH_ADMIN:
      return <ChurchAdminDashboard members={members} cells={cells} prayers={prayers} />;
    case UserRole.PASTOR:
      return <PastorDashboard members={members} cells={cells} prayers={prayers} />;
    case UserRole.CELL_LEADER_DISCIPLE:
      return <LeaderDashboard user={user} members={members} cells={cells} />;
    case UserRole.MEMBER_VISITOR:
      return <MemberDashboard user={user} prayers={prayers.filter(p => p.email === user.email)} activeTab={activeTab} />;
    default:
      return <div className="p-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">Acesso Restrito</div>;
  }
};

export default Dashboard;
