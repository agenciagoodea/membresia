import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  TrendingUp,
  Calendar,
  Target,
  Heart,
  Activity,
  Zap,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell as RechartsCell
} from 'recharts';
import { useChurch } from '../contexts/ChurchContext';
import { UserRole, LadderStage, PrayerStatus, Member, Cell, PrayerRequest } from '../types';
import { PLAN_CONFIGS, PlanType } from '../constants';
import { memberService } from '../services/memberService';
import { useLocation, useNavigate } from 'react-router-dom';
import PrayerForm from './Prayer/PrayerForm';
import MyProgress from './Member/MyProgress';
import MyCellDetail from './Member/MyCellDetail';
import PrayerHistory from './Member/PrayerHistory';
import MonthlyAgenda from './Member/MonthlyAgenda';
import ActivityManager from './Ladder/ActivityManager';
import { mergeAgendaItems } from '../utils/agendaUtils';
import MemberProfileModal from './MemberProfileModal';
import { supabase } from '../services/supabaseClient';
import { getAvatarUrl } from '../utils/avatarUtils';
import { getRoleLabel } from '../utils/roleUtils';

// Componentes Auxiliares
const PageHeader = React.memo(({ title, subtitle, actions }: { title: string, subtitle: string, actions?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
    <div>
      <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-3">
        {title}
      </h1>
      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-xs italic">
        {subtitle}
      </p>
    </div>
    {actions}
  </div>
));

const StatCard = React.memo(({ title, value, trend, subValue, icon, color }: { title: string, value: string | number, trend?: number, subValue?: string, icon: React.ReactNode, color: string }) => (
  <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
    <div className={`absolute -right-4 -top-4 w-24 h-24 ${color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
    <div className="flex justify-between items-start mb-6 relative">
      <div className={`p-4 rounded-2xl ${color} text-white`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} uppercase tracking-widest`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="relative">
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
        {subValue && <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{subValue}</span>}
      </div>
    </div>
  </div>
));

const MasterDashboard = () => (
  <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
    <PageHeader
      title="Global Overview"
      subtitle="Ecossistema completo de gestão eclesiástica."
      actions={
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-white text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-xl shadow-white/5">
            Relatório Consolidado
          </div>
        </div>
      }
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard title="Igrejas Ativas" value="124" trend={15} icon={<Layers size={24} />} color="bg-blue-600/20" />
      <StatCard title="Total Membros" value="12.4k" trend={8} icon={<Users size={24} />} color="bg-indigo-600/20" />
      <StatCard title="Assinaturas Ativas" value="98" trend={12} icon={<Zap size={24} />} color="bg-amber-600/20" />
      <StatCard title="Receita Global" value="R$ 45k" trend={22} icon={<Activity size={24} />} color="bg-emerald-600/20" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-12">
          <h4 className="font-black text-white text-xl flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Crescimento da Rede
          </h4>
          <select className="bg-zinc-950 text-white border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none">
            <option>Últimos 12 Meses</option>
            <option>Este Ano</option>
          </select>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'Jan', val: 400 }, { name: 'Fev', val: 300 }, { name: 'Mar', val: 600 },
              { name: 'Abr', val: 800 }, { name: 'Mai', val: 500 }, { name: 'Jun', val: 900 },
              { name: 'Jul', val: 1100 }, { name: 'Ago', val: 1300 }, { name: 'Set', val: 1200 },
              { name: 'Out', val: 1500 }, { name: 'Nov', val: 1800 }, { name: 'Dez', val: 2100 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 11, fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px' }} />
              <Bar dataKey="val" fill="#2563eb" radius={[12, 12, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-10">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-black p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full flex flex-col justify-between group">
          <div className="absolute -top-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Zap size={250} /></div>
          <div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
              <Sparkles size={32} className="text-indigo-300" />
            </div>
            <h4 className="text-4xl font-black mb-4 tracking-tighter uppercase leading-[0.9]">Upgrade <br />Enterprise</h4>
            <p className="text-indigo-200 text-sm mb-12 font-bold uppercase tracking-widest italic leading-relaxed opacity-60">Implementando IA para detecção de tendências de evasão e engajamento.</p>
          </div>
          <button className="w-full py-5 bg-white text-zinc-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5">
            Configurar Módulos
          </button>
        </div>
      </div>
    </div>
  </div>
);

const DashboardEventsWidget = ({ events }: { events: any[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const upcoming = events
    .filter(e => e.date >= new Date().toISOString().split('T')[0])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl h-full flex flex-col">
      <h4 className="font-black text-white text-xl mb-8 flex items-center gap-4 uppercase tracking-tighter shrink-0">
        <div className="w-1.5 h-6 bg-amber-500 rounded-full" /> Próximos Eventos
      </h4>
      <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
        {upcoming.map(evt => (
          <div
            key={evt.id}
            onClick={() => setSelectedEvent(evt)}
            className="flex items-center gap-4 p-4 bg-zinc-950 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
          >
            {evt.image_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/5 shrink-0">
                <img src={evt.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center shrink-0">
                <span className="text-sm font-black text-amber-500 leading-none">{(evt.date || '').split('-')[2] || '--'}</span>
                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{new Date(evt.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate uppercase tracking-tight">{evt.title}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-amber-500/50" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">
                    {new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}, {new Date(evt.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} className="text-amber-500/50" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">{evt.time || '00:00'}</span>
                </div>
              </div>
              {evt.location && (
                <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
                  <MapPin size={10} className="text-zinc-600" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase truncate">{evt.location}</span>
                </div>
              )}
            </div>
            <ChevronRight size={14} className="text-zinc-800 group-hover:text-amber-500 transition-colors shrink-0" />
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-lg bg-zinc-950 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 z-10 p-3 text-zinc-500 hover:text-white bg-black/40 backdrop-blur-md rounded-2xl transition-all border border-white/5">
              <X size={20} />
            </button>

            {selectedEvent.image_url && (
              <div className="w-full aspect-video overflow-hidden">
                <img src={selectedEvent.image_url} className="w-full h-full object-cover" alt="" />
              </div>
            )}

            <div className="p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  Evento da Agenda
                </div>
              </div>

              <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-8 leading-none">
                {selectedEvent.title}
              </h3>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Calendar size={12} className="text-amber-500" /> Data do Evento
                  </p>
                  <p className="text-lg font-black text-white">
                    {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}, {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock size={12} className="text-amber-500" /> Horário
                  </p>
                  <p className="text-lg font-black text-white">{selectedEvent.time || '00:00'}</p>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 mb-10">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MapPin size={14} className="text-rose-500" /> Localização
                  </p>
                  <p className="text-sm font-bold text-zinc-300 uppercase leading-relaxed">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div className="border-t border-white/5 pt-8">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Sobre o Evento</p>
                  <p className="text-sm text-zinc-400 font-medium leading-relaxed italic">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChurchAdminDashboard = ({ user, members, cells, prayers, events, activeTab }: { user: any, members: Member[], cells: Cell[], prayers: PrayerRequest[], events: any[], activeTab?: string }) => {
  if (activeTab === 'm12-config') {
    return <ActivityManager user={user} />;
  }
  const planLimits = PLAN_CONFIGS[PlanType.PRO];
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Membros Cadastrados" value={totalMembers} subValue={`/ ${planLimits.maxMembers}`} icon={<Users className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard title="Células Ativas" value={activeCells} subValue={`/ ${planLimits.maxCells}`} icon={<Layers className="text-indigo-400" />} color="bg-indigo-500/10" />
        <StatCard title="Orações Pendentes" value={prayers.filter(p => p.status === PrayerStatus.PENDING).length} subValue="pedidos" icon={<Clock className="text-amber-400" />} color="bg-amber-500/10" />
        <StatCard title="Eventos na Agenda" value={events.length} subValue="Totais" icon={<Calendar className="text-emerald-400" />} color="bg-emerald-500/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden h-full">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={100} /></div>
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Metas de Crescimento
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
        </div>

        <DashboardEventsWidget events={events} />

        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl h-full">
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
                    src={getAvatarUrl(m.fullName || m.name, m.avatarUrl || m.avatar)}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(m.fullName || m.name, null); }}
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

const PastorDashboard = ({ user, members, cells, prayers, events, activeTab }: { user: any, members: Member[], cells: Cell[], prayers: PrayerRequest[], events: any[], activeTab?: string }) => {
  if (activeTab === 'm12-config') {
    return <ActivityManager user={user} />;
  }
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
            <Calendar size={14} className="text-blue-500" /> {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
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
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Visão Celular M12
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

        <DashboardEventsWidget events={events} />

        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-black p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 opacity-10"><Zap size={200} /></div>
          <div>
            <Zap size={48} className="mb-8 text-indigo-400 animate-pulse" />
            <h4 className="text-4xl font-black mb-2 tracking-tighter uppercase">Visão 2024</h4>
            <p className="text-indigo-300 text-sm mb-12 font-bold uppercase tracking-widest italic leading-relaxed">Meta: 100 células ativas e 1.200 discípulos em envio.</p>
            <div className="space-y-8">
              {[
                { label: 'DISCÍPULOS', val: Math.round((members.length / 1200) * 100) },
                { label: 'ESTRUTURA', val: Math.round((cells.length / 100) * 100) },
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

const LeaderDashboard = ({ user, members, cells, events }: { user: any, members: Member[], cells: Cell[], events: any[] }) => {
  const [selectedDisciple, setSelectedDisciple] = React.useState<Member | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  // Célula que o usuário PARTICIPA (para o Cabeçalho)
  const participatingCell = cells.find(c => c.id === user.cellId);

  // Célula(s) que o usuário LIDERA (para o painel de discípulos e relatórios)
  const leadingCells = cells.filter(c => c.leaderId === user.id || c.leaderIds?.includes(user.id));
  const primaryLeadingCell = leadingCells.length > 0 ? leadingCells[0] : null;

  if (!participatingCell && !primaryLeadingCell) return (
    <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
      Nenhuma célula vinculada ou encontrada.
    </div>
  );

  const getMemberName = (id?: string) => {
    if (!id) return '';
    const m = members.find(member => member.id === id);
    return m ? m.name : '';
  };

  const headerTitle = participatingCell ? participatingCell.name : 'Painel do Líder';
  const headerSubtitle = participatingCell
    ? `Discipulador(a): ${getMemberName(user.disciplerId) || 'Não definido'} | Pastor(a): ${getMemberName(user.pastorId) || 'Não definido'}`
    : 'Líder de Célula Ativo.';

  const leadingCellIds = leadingCells.map(c => c.id);

  // Considera discípulo quem estiver nas células LIDERADAS
  // Excluindo os próprios líderes
  const cellMembers = members.filter(m =>
    m.cellId && leadingCellIds.includes(m.cellId) &&
    m.id !== user.id &&
    !leadingCells.some(c => c.leaderId === m.id || c.leaderIds?.includes(m.id))
  );

  // Encontrar a próxima ocorrência real da reunião da primeira célula liderada
  const cellMeetings = primaryLeadingCell ? events.filter(e => e.id.startsWith(`cell-${primaryLeadingCell.id}`)) : [];
  const nextMeeting = cellMeetings.length > 0 ? cellMeetings[0] : null;

  const handleWhatsAppNotify = (cellToNotify: Cell, meeting: any) => {
    if (!meeting || !cellToNotify) return;
    const dateObj = new Date(meeting.date + 'T12:00:00');
    const dayName = dateObj.toLocaleString('pt-BR', { weekday: 'long' });
    const dayNum = dateObj.getDate();
    const monthName = dateObj.toLocaleString('pt-BR', { month: 'long' });
    const yearName = dateObj.getFullYear();
    const formattedDate = `${dayNum.toString().padStart(2, '0')} de ${monthName} de ${yearName}`;

    const message = `\uD83D\uDC4B Olá! Passando para lembrar da nossa próxima reunião da *Célula ${cellToNotify.name}*!
    
\uD83D\uDCC5 *Data:* ${dayName}, ${formattedDate}
\u23F0 *Horário:* ${cellToNotify.meetingTime}
\uD83C\uDFE0 *Local:* Casa do(a) ${cellToNotify.hostName}
\uD83D\uDCCD *Endereço:* ${cellToNotify.address}

Esperamos por você! Vai ser um tempo precioso! \uD83D\uDD25`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const CellEventWidget = ({ title, cell, eventsList, onNotify, theme }: { title: string, cell: Cell | undefined, eventsList: any[], onNotify?: () => void, theme: { dot: string, bg: string, text: string } }) => {
    if (!cell) return null;
    const meetings = eventsList.filter(e => e.id.startsWith(`cell-${cell.id}`));
    const meeting = meetings.length > 0 ? meetings[0] : null;

    if (!meeting) return null;

    return (
      <div className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem] relative group overflow-hidden shadow-2xl">
        <div className="absolute -right-5 -top-5 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={80} /></div>
        <h4 className="font-black text-white text-sm mb-6 flex items-center gap-3 uppercase tracking-tighter">
          <div className={`w-1.5 h-4 ${theme.dot} rounded-full`} /> {title}
        </h4>
        <div className="flex items-center gap-4 mb-6">
          <div className={`${theme.bg} ${theme.text} w-16 h-20 rounded-[1.25rem] font-black flex flex-col items-center justify-center p-2 text-center border border-white/5`}>
            <p className="text-[8px] uppercase tracking-widest mb-1 border-b border-current/20 pb-1 w-full text-center">
              {new Date(meeting.date + 'T12:00:00').toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}
            </p>
            <p className="text-2xl tracking-tighter leading-none mt-1">
              {(meeting.date || '').split('-')[2] || '--'}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-white uppercase tracking-tight truncate">{cell.name}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{cell.meetingTime} • {cell.hostName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
          <MapPin size={12} className={theme.text} /> <span className="truncate">{cell.address}</span>
        </div>
        {onNotify && (
          <button
            onClick={onNotify}
            className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5 text-center flex items-center justify-center gap-2"
          >
            <MessageSquare size={14} /> Notificar Discipulos
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        actions={
          <button className="w-full md:w-auto px-8 py-3 md:py-4 bg-blue-600 text-white rounded-2xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
            Lançar Relatório
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Presença Média" value="88%" trend={2} icon={<Users className="text-emerald-400" />} color="bg-emerald-500/10" />
        <StatCard title="Visitantes" value="3" trend={50} icon={<TrendingUp className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard title="Transições" value="2" subValue="estágios" icon={<Target className="text-amber-400" />} color="bg-amber-500/10" />

        {primaryLeadingCell ? (
          <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="flex justify-between items-start mb-4 relative">
              <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500">
                <Activity size={24} />
              </div>
              <span className="text-[9px] font-black px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-500 uppercase tracking-widest flex-shrink-0 border border-rose-500/20">
                Liderança
              </span>
            </div>
            <div className="relative">
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Célula Liderada</p>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-4 truncate leading-none">
                {primaryLeadingCell.name}
              </h3>
              <div className="bg-black/20 p-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Líderes Atuais</p>
                <p className="text-zinc-300 text-[10px] font-bold uppercase tracking-widest leading-relaxed line-clamp-2">
                  {getMemberName(primaryLeadingCell.leaderId)}
                  {primaryLeadingCell.leaderIds?.filter(id => id !== primaryLeadingCell.leaderId).map(id => ` & ${getMemberName(id)}`).join('')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <StatCard title="Células Lideradas" value="0" subValue="" icon={<Activity className="text-zinc-400" />} color="bg-zinc-800" />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl h-full flex flex-col">
          <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 uppercase tracking-tighter shrink-0">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Meus Discípulos
          </h4>
          <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide">
            {cellMembers.length === 0 ? (
              <div className="py-20 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">Nenhum discípulo vinculado às suas células</div>
            ) : cellMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between p-5 bg-white/5 rounded-[1.5rem] transition-all border border-white/5 hover:border-white/10 group">
                <div className="flex items-center gap-4">
                  <img src={getAvatarUrl(m.fullName, m.avatarUrl)} className="w-12 h-12 rounded-full ring-2 ring-white/10 group-hover:ring-blue-500 transition-all object-cover aspect-square" alt="" />
                  <div>
                    <p className="text-sm font-black text-white uppercase">{m.fullName}</p>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">{m.stage} • {getRoleLabel(m)}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedDisciple(m); setIsProfileModalOpen(true); }}
                  className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors bg-zinc-950 px-4 py-2 rounded-xl border border-white/5">Ver Perfil</button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <CellEventWidget
            title="Próxima Reunião"
            cell={participatingCell}
            eventsList={events}
            theme={{ dot: 'bg-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-500' }}
          />

          <CellEventWidget
            title="Próximo Encontro"
            cell={primaryLeadingCell}
            eventsList={events}
            onNotify={nextMeeting && primaryLeadingCell ? () => handleWhatsAppNotify(primaryLeadingCell, nextMeeting) : undefined}
            theme={{ dot: 'bg-blue-600', bg: 'bg-blue-500/20', text: 'text-blue-500' }}
          />

          <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
            <h4 className="font-black text-white text-sm mb-6 flex items-center gap-3 uppercase tracking-tighter">
              <div className="w-1.5 h-4 bg-emerald-500 rounded-full" /> Eventos Gerais
            </h4>
            <div className="scale-[0.9] origin-top-left w-[111%] -mb-4">
              <DashboardEventsWidget events={events.filter(e => !e.id.startsWith('cell-'))} />
            </div>
          </div>
        </div>
      </div>

      <MemberProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => { setIsProfileModalOpen(false); setSelectedDisciple(null); }}
        member={selectedDisciple}
        cellReports={[]}
        allMembers={members}
        cellName={primaryLeadingCell?.name}
      />
    </div>
  );
};

const MemberDashboard = ({ user, prayers, events, cells, activeTab = 'JOURNEY' }: { user: any, prayers: PrayerRequest[], events: any[], cells: Cell[], activeTab?: string }) => {
  const [mentors, setMentors] = useState<{ leader?: Member, pastor?: Member }>({});
  const [showWelcome, setShowWelcome] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Exibir popup se for o primeiro acesso
    if (user.role === UserRole.MEMBER_VISITOR && user.firstAccessCompleted === false) {
      setShowWelcome(true);
    }
  }, [user]);

  const handleContinue = async () => {
    try {
      // 1. Atualizar no banco de dados (tabela members)
      await memberService.update(user.id, { firstAccessCompleted: true });

      // 2. Importante: Atualizar metadados do Auth para refletir imediatamente no App.tsx
      // Isso disparará o evento USER_UPDATED no onAuthStateChange do App.tsx
      await supabase.auth.updateUser({
        data: { profile: { ...user, firstAccessCompleted: true } }
      });

      setShowWelcome(false);
      navigate('/app/my-activities');
    } catch (e) {
      console.error("Erro ao atualizar primeiro acesso:", e);
      // Mesmo com erro no update, redirecionar para não travar o usuário
      navigate('/app/my-activities');
    }
  };

  const myCellId = user.cellId || user.profile?.cellId;
  const myCell = cells.find(c => c.id === myCellId);
  const myNextMeeting = events.find(e => e.id.startsWith(`cell-${myCellId}`));

  useEffect(() => {
    const loadMentors = async () => {
      if (user.disciplerId || user.pastorId) {
        try {
          const fetchMentorWithGenderLogic = async (mentorId: string) => {
            const primaryMentor = await memberService.getById(mentorId);
            if (!primaryMentor) return undefined;

            // Se o gênero do mentor for diferente do usuário e ele tiver um cônjuge, tenta buscar o cônjuge
            const userGender = user.gender || (user as any).sex;
            const primaryGender = primaryMentor.gender || (primaryMentor as any).sex;
            if (userGender && primaryGender && userGender !== primaryGender && primaryMentor.spouseId) {
              const spouseMentor = await memberService.getById(primaryMentor.spouseId);
              if (spouseMentor && (spouseMentor.gender || (spouseMentor as any).sex) === userGender) {
                return spouseMentor;
              }
            }
            return primaryMentor;
          };

          const [leader, pastor] = await Promise.all([
            user.disciplerId ? fetchMentorWithGenderLogic(user.disciplerId) : Promise.resolve(undefined),
            user.pastorId ? fetchMentorWithGenderLogic(user.pastorId) : Promise.resolve(undefined)
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
      case 'prayer-request-new':
        return <PrayerForm isInline={true} user={user} />;
      case 'm12-config':
        return <ActivityManager user={user} />;
      default:
        return (
          <div className="space-y-10">
            <div className="bg-zinc-100 p-12 md:p-16 rounded-[3.5rem] text-zinc-950 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-5"><Zap size={300} /></div>
              <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase leading-[0.9]">Shalom <br />Graça e Paz, <br />{(user.fullName || user.name || 'Usuário').split(' ')[0]}!</h2>
              <p className="text-zinc-600 max-w-lg mb-12 font-bold text-lg leading-relaxed italic">Sua caminhada é preciosa para nós. <br />Veja sua evolução espiritual em Minhas Atividades M12.</p>

              <div className="flex items-center gap-6 md:gap-10 overflow-x-auto pb-4 scrollbar-hide">
                {[
                  { stage: LadderStage.WIN, icon: <CheckCircle2 size={40} />, color: 'bg-emerald-600' },
                  { stage: LadderStage.CONSOLIDATE, icon: <Clock size={40} />, color: 'bg-blue-600' },
                  { stage: LadderStage.DISCIPLE, icon: <Target size={40} />, color: 'bg-amber-500' },
                  { stage: LadderStage.SEND, icon: <Zap size={40} />, color: 'bg-indigo-600' },
                ].map((s, i) => {
                  const stages_arr = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                  const currentStageIndex = stages_arr.indexOf(user.stage || LadderStage.WIN);
                  const stepIndex = stages_arr.indexOf(s.stage);
                  const isActive = stepIndex <= currentStageIndex;
                  const isCurrent = stepIndex === currentStageIndex;

                  return (
                    <React.Fragment key={s.stage}>
                      <div className={`flex flex-col items-center shrink-0 ${!isActive ? 'opacity-30' : ''}`}>
                        <div className={`w-20 h-20 ${s.color} text-white rounded-[1.5rem] flex items-center justify-center mb-4 shadow-xl ${isCurrent ? 'ring-4 ring-white animate-pulse' : ''}`}>
                          {s.icon}
                        </div>
                        <span className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.3em]">{s.stage}</span>
                      </div>
                      {i < 3 && <div className={`h-0.5 w-16 shrink-0 ${isActive && i < currentStageIndex ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* BARRA DE MENTORES */}
            <div className="bg-white p-4 rounded-[2rem] shadow-xl flex flex-wrap items-center gap-8 px-8">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-r border-zinc-100 pr-8 hidden md:block">Meus Mentores</div>

              <div className="flex items-center gap-4">
                <img src={mentors.pastor?.avatar || 'https://i.pravatar.cc/150?u=pastor'} className="w-10 h-10 rounded-full ring-2 ring-zinc-100" />
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Meu Pastor</p>
                  <p className="text-xs font-bold text-zinc-950 uppercase">{mentors.pastor?.fullName || mentors.pastor?.name || 'Carregando...'}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-zinc-100 hidden sm:block" />

              <div className="flex items-center gap-4">
                <img src={mentors.leader?.avatar || 'https://i.pravatar.cc/150?u=leader'} className="w-10 h-10 rounded-full ring-2 ring-zinc-100" />
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Meu Discipulador</p>
                  <p className="text-xs font-bold text-zinc-950 uppercase">{mentors.leader?.fullName || mentors.leader?.name || 'Aguardando Direcionamento'}</p>
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
                  onClick={() => navigate('/app/prayer-request-new')}
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
                    <p className="text-xl font-black uppercase tracking-tight leading-none truncate">{myCell?.name || 'Vínculo Pendente'}</p>
                    <p className="text-[10px] text-blue-100 font-black uppercase tracking-[0.1em] mt-1 truncate">Líder: {mentors.leader?.fullName || mentors.leader?.name || 'Aguardando'}</p>
                  </div>
                </div>
                <div className="space-y-5 px-4 mb-10 flex-1">
                  <div className="flex items-center gap-4 text-zinc-300 text-sm font-bold uppercase tracking-widest">
                    <Calendar size={18} className="text-zinc-600" /> {myCell?.meetingDay || 'A definir'} {myCell?.meetingTime ? `às ${myCell.meetingTime}` : ''}
                  </div>
                  <div className="flex items-center gap-4 text-zinc-300 text-sm font-bold uppercase tracking-widest overflow-hidden">
                    <MapPin size={18} className="text-zinc-600 shrink-0" /> <span className="truncate">{myCell?.address || 'Consulte seu líder'}</span>
                  </div>
                </div>
                {myCell?.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(myCell.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-5 bg-white text-zinc-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-105 transition-all text-center block"
                  >
                    Como Chegar
                  </a>
                )}
              </div>

              <DashboardEventsWidget events={events} />
            </div>

            {/* Popup de Boas-vindas (Primeiro Acesso) */}
            {showWelcome && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500" />
                <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl p-10 text-center overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px]" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px]" />

                  <div className="w-24 h-24 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-blue-500 shadow-inner relative z-10">
                    <Sparkles size={48} className="animate-pulse" />
                  </div>

                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 relative z-10 leading-none">Seja bem-vindo!</h3>
                  <p className="text-zinc-400 text-sm font-medium mb-10 leading-relaxed relative z-10 italic">
                    Continue o seu cadastro nos informando todas as atividades que você já fez na igreja.
                  </p>

                  <button
                    onClick={handleContinue}
                    className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5 relative z-10 group"
                  >
                    Clique aqui para Continuar
                    <ChevronRight size={16} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
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
  const { members, cells, prayers, events, meetingExceptions, loading, refreshData } = useChurch();

  if (loading && user.role !== UserRole.MASTER_ADMIN) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Ecossistema...
      </div>
    );
  }

  const role = user.role;
  const mergedEvents = mergeAgendaItems(events, cells, meetingExceptions, [], user);

  switch (role) {
    case UserRole.MASTER_ADMIN:
      return <MasterDashboard />;
    case UserRole.CHURCH_ADMIN:
      return <ChurchAdminDashboard user={user} members={members} cells={cells} prayers={prayers} events={mergedEvents} activeTab={activeTab} />;
    case UserRole.PASTOR:
      return <PastorDashboard user={user} members={members} cells={cells} prayers={prayers} events={mergedEvents} activeTab={activeTab} />;
    case UserRole.CELL_LEADER_DISCIPLE:
      return <LeaderDashboard user={user} members={members} cells={cells} events={mergedEvents} />;
    case UserRole.MEMBER_VISITOR:
      return <MemberDashboard user={user} prayers={prayers.filter(p => p.email === user.email)} events={mergedEvents} cells={cells} activeTab={activeTab} />;
    default:
      return <div className="p-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">Acesso Restrito</div>;
  }
};

export default Dashboard;
