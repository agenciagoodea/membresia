
import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ChevronRight,
  History,
  MessageSquare,
  MoreVertical,
  UserCheck,
  Zap,
  Send,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Filter,
  Search as SearchIcon,
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PLAN_CONFIGS } from '../../constants';
import { Member, Cell, LadderStage, M12Activity, MemberOrigin, UserRole, PlanType } from '../../types';
import { memberService } from '../../services/memberService';
import { cellService } from '../../services/cellService';
import { m12Service } from '../../services/m12Service';
import MemberModal from '../MemberModal';
import UpgradeModal from '../Shared/UpgradeModal';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { formatRoleLabel } from '../../utils/formatUtils';

const DEFAULT_STAGE_ACTIVITIES: Record<LadderStage, string[]> = {
  [LadderStage.WIN]: ['Sistema de Oração', 'Consolidação Inicial', 'Visita à Célula', 'Pré-Encontro'],
  [LadderStage.CONSOLIDATE]: ['Encontro com Deus', 'Batismo', 'Pós-Encontro', 'Curso de Maturidade'],
  [LadderStage.DISCIPLE]: ['Escola de Líderes (N1)', 'CTL', 'Frequência na Célula', 'Discipulado Fixo'],
  [LadderStage.SEND]: ['Escola de Líderes (Conclusão)', 'Timóteo (Treinamento)', 'Multiplicar Célula', 'Enviar Discípulos']
};

interface LadderColumnProps {
  title: string;
  stage: LadderStage;
  icon: React.ReactNode;
  color: string;
  accentColor: string;
  description: string;
  members: Member[];
  onSelectMember: (member: Member) => void;
  onAdvance: (member: Member) => void;
  onRegress: (member: Member) => void;
  isStageComplete: (member: Member) => boolean;
  getActivitiesForStage: (stage: LadderStage) => string[];
}

const LadderColumn: React.FC<LadderColumnProps> = ({
  title, stage, icon, color, accentColor, description, members, onSelectMember, onAdvance, onRegress, isStageComplete, getActivitiesForStage
}) => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-4 transition-all hover:border-white/10">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-${accentColor}/20`}>
            {icon}
          </div>
          <div>
            <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
              {title}
              <span className="text-[10px] bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full border border-white/5 font-bold">
                {members.length}
              </span>
            </h3>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">{description}</p>
          </div>
        </div>
        <button className="p-2 text-zinc-600 hover:text-white transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-800/50 p-3 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-zinc-800 transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => onSelectMember(member)}
            >
              {/* Progress Bar Background */}
              <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full" />
              <div
                className={`absolute bottom-0 left-0 h-1 ${color} opacity-50`}
                style={{
                  width: `${(() => {
                    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                    const currentIndex = stages.indexOf(member.stage);
                    const baseProgress = (currentIndex / stages.length) * 100;

                    const required = getActivitiesForStage(member.stage);
                    const completed = (member.completedMilestones || []).filter(m => required.includes(m)).length;
                    const stageProgress = required.length > 0 ? (completed / required.length) * (100 / stages.length) : 0;

                    return Math.min(100, baseProgress + stageProgress);
                  })()}%`
                }}
              />

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img 
                      src={getAvatarUrl(member.fullName || member.name, member.avatarUrl || member.avatar)} 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(member.fullName || member.name, null); }}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover aspect-square" 
                      alt="" 
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${color} flex items-center justify-center`}>
                      <CheckCircle2 size={8} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{member.fullName || member.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock size={10} className="text-zinc-500" />
                      <p className="text-[10px] text-zinc-500 font-medium">Há {Math.floor(Math.random() * 30)} dias nesta etapa</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Score</span>
                  <span className="text-xs font-bold text-white">
                    {(() => {
                      const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                      const currentIndex = stages.indexOf(member.stage);
                      const baseScore = (currentIndex / stages.length) * 100;

                      const required = getActivitiesForStage(member.stage);
                      const completed = member.completedMilestones || [];

                      // Lógica especial para WIN
                      if (member.stage === LadderStage.WIN && isStageComplete(member)) {
                        return Math.round(baseScore + (100 / stages.length));
                      }

                      // Lógica especial para CONSOLIDAR (Batismo OU Aclamado)
                      if (member.stage === LadderStage.CONSOLIDATE) {
                        const hasBaptismOrAcquired = (completed.includes('Batismo') || completed.includes('Aclamado')) ? 1 : 0;
                        const otherRequired = required.filter(act => act !== 'Batismo' && act !== 'Aclamado');
                        const otherCompleted = otherRequired.filter(act => {
                          if (act === 'Célula' && member.cellId) return true;
                          return completed.includes(act);
                        }).length;

                        const totalSlots = otherRequired.length + 1;
                        const filledSlots = otherCompleted + hasBaptismOrAcquired;

                        const stageScore = (filledSlots / totalSlots) * (100 / stages.length);
                        return Math.round(baseScore + stageScore);
                      }

                      // Para outros estágios
                      const completedCount = completed.filter(act => {
                        if (act === 'Célula' && member.cellId) return true;
                        return required.includes(act);
                      }).length;

                      const stageScore = required.length > 0 ? (completedCount / required.length) * (100 / stages.length) : 0;
                      return Math.round(baseScore + stageScore);
                    })()}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {Object.values(LadderStage).map((s) => {
                    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                    const currentIndex = stages.indexOf(stage);
                    const sIndex = stages.indexOf(s);

                    if (sIndex > currentIndex) return null;

                    const sColor = s === LadderStage.WIN ? 'blue' :
                      s === LadderStage.CONSOLIDATE ? 'emerald' :
                        s === LadderStage.DISCIPLE ? 'amber' : 'rose';

                    if (s === LadderStage.WIN) {
                      const required = getActivitiesForStage(LadderStage.WIN);
                      const hasValidOrigin = required.includes(member.origin || '');
                      if (!hasValidOrigin) return null;
                      return (
                        <div key={`win-icon-${member.id}`} className="w-6 h-6 rounded-full bg-blue-600/20 border-2 border-zinc-800 flex items-center justify-center" title={`Origem: ${member.origin}`}>
                          <CheckCircle2 size={10} className="text-blue-400" />
                        </div>
                      );
                    }

                    const activities = getActivitiesForStage(s);
                    const completed = activities.filter(act => {
                      if (act === 'Célula' && member.cellId) return true;
                      return (member.completedMilestones || []).includes(act);
                    });

                    return completed.map((act, i) => (
                      <div key={`${s}-${i}-${member.id}`} className={`w-5 h-5 rounded-full bg-${sColor}-600/20 border border-zinc-800 flex items-center justify-center`} title={act}>
                        <CheckCircle2 size={8} className={`text-${sColor}-400`} />
                      </div>
                    ));
                  })}

                  {member.stage !== LadderStage.WIN && (member.completedMilestones || []).length === 0 && !member.cellId && (
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Iniciando etapa</span>
                  )}
                </div>

              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <AlertCircle size={20} className="text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Sem registros</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SuccessLadder: React.FC<{ user: any }> = ({ user }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activities, setActivities] = useState<M12Activity[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const churchId = user.churchId || user.church_id;
      if (!churchId) {
        setLoading(false);
        return;
      }

      const [membersData, cellsData, activitiesData] = await Promise.all([
        memberService.getAll(churchId, undefined, user).catch(() => []),
        cellService.getAll(churchId, user).catch(() => []),
        m12Service.getActivities(churchId).catch(() => [])
      ]);
      setMembers(membersData);
      setCells(cellsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredMembers = () => {
    const isAdmin = user.role === UserRole.MASTER_ADMIN || user.role === UserRole.CHURCH_ADMIN;
    
    return members.filter(m => {
      // 1. Search Filter
      const matchesSearch = (m.fullName || m.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Visibility Bypass for Admins
      if (isAdmin) return true;

      // 3. Visibility for Regular Users/Leaders/Pastors (Eco-system)
      const isSelf = m.id === user.id;
      const isSpouse = m.id === user.spouseId || user.id === m.spouseId;
      
      // Check if user is the pastor or discipler
      const isMyDisciple = m.pastorId === user.id || m.disciplerId === user.id;

      // Check if user is leader or host of the member's cell
      const memberCell = cells.find(c => c.id === m.cellId);
      const isCellLeaderOrHost = memberCell && (memberCell.leaderId === user.id || memberCell.hostId === user.id);

      return isSelf || isSpouse || isMyDisciple || isCellLeaderOrHost;
    });
  };

  const filteredMembers = getFilteredMembers();

  const getStageMembers = (stage: LadderStage) => {
    return filteredMembers.filter(m => m.stage === stage);
  };

  const planLimit = PLAN_CONFIGS[user.plan || PlanType.BASIC]?.maxMembers || 50;
  const isLimitReached = members.length >= planLimit;

  const handleAddVisitor = () => {
    if (isLimitReached) {
      setIsUpgradeModalOpen(true);
    } else {
      setIsMemberModalOpen(true);
    }
  };

  const handleSaveMember = async (formData: Partial<Member>) => {
    try {
      const churchId = user.churchId || user.church_id;
      const created = await memberService.create({
        ...formData,
        church_id: churchId,
        joinedDate: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '')}&background=random`,
        origin: formData.origin || '',
        completedMilestones: formData.origin ? [formData.origin] : [],
        stageHistory: [{
          stage: formData.stage || LadderStage.WIN,
          date: new Date().toISOString(),
          recordedBy: user.name,
          notes: 'Visitante registrado via Escada do Sucesso'
        }]
      } as any);
      setMembers([...members, created]);
    } catch (error) {
      throw error;
    }
  };

  const getActivitiesForStage = (stage: LadderStage) => {
    const stageActivities = activities.filter(c => c.stage === stage);
    if (stageActivities.length > 0) return stageActivities.map(c => c.label);
    return DEFAULT_STAGE_ACTIVITIES[stage] || [];
  };

  const isStageComplete = (member: Member) => {
    if (member.stage === LadderStage.WIN) {
      const winActivities = getActivitiesForStage(LadderStage.WIN);
      const completed = member.completedMilestones || [];
      return winActivities.some(cp => completed.includes(cp));
    }

    const completed = member.completedMilestones || [];
    
    // Check dynamic activities first
    const stageActivities = activities.filter(c => c.stage === member.stage && c.isActive);
    if (stageActivities.length > 0) {
      return stageActivities.filter(c => c.isRequired).every(cp => {
        if (cp.label === 'Célula' && member.cellId) return true;
        return completed.includes(cp.label);
      });
    }

    // Fallback to defaults
    const required = DEFAULT_STAGE_ACTIVITIES[member.stage] || [];
    if (member.stage === LadderStage.CONSOLIDATE) {
      const hasBaptismOrAcquired = completed.includes('Batismo') || completed.includes('Aclamado');
      const otherRequired = required.filter(act => act !== 'Batismo' && act !== 'Aclamado');

      return hasBaptismOrAcquired && otherRequired.every(activity => {
        if (activity === 'Célula' && member.cellId) return true;
        return completed.includes(activity);
      });
    }

    return required.every(activity => {
      if (activity === 'Célula' && member.cellId) return true;
      return completed.includes(activity);
    });
  };

  const handleAdvance = async (member: Member) => {
    if (!isStageComplete(member)) {
      if (member.stage === LadderStage.WIN) {
        alert("Para avançar de nível, informe pelo menos uma opção de como o discípulo foi ganho.");
      } else {
        const required = getActivitiesForStage(member.stage);
        const completed = member.completedMilestones || [];

        let missing = required.filter(activity => {
          if (activity === 'Célula' && member.cellId) return false;
          return !completed.includes(activity);
        });

        if (member.stage === LadderStage.CONSOLIDATE) {
          const hasOne = completed.includes('Batismo') || completed.includes('Aclamado');
          if (hasOne) {
            missing = missing.filter(m => m !== 'Batismo' && m !== 'Aclamado');
          }
        }

        alert(`Para avançar de nível, complete primeiro:\n\n• ${missing.join('\n• ')}`);
      }
      return;
    }

    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
    const currentIndex = stages.indexOf(member.stage);

    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        const updated = await memberService.update(member.id, {
          stage: nextStage,
          stageHistory: [
            ...member.stageHistory,
            {
              stage: member.stage,
              date: new Date().toISOString(),
              recordedBy: user.name,
              notes: `Concluiu a etapa de ${(member.stage || '').toLowerCase()} e avançou via Escada do Sucesso.`,
              milestones: member.completedMilestones || []
            }
          ]
        });
        setMembers(members.map(m => m.id === member.id ? updated : m));
        if (selectedMember?.id === member.id) setSelectedMember(updated);
      } catch (error) {
        console.error('Erro ao avançar estágio:', error);
        alert('Erro ao avançar estágio do discípulo.');
      }
    }
  };

  const handleRegress = async (member: Member) => {
    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
    const currentIndex = stages.indexOf(member.stage);

    if (currentIndex > 0) {
      const prevStage = stages[currentIndex - 1];
      try {
        const updated = await memberService.update(member.id, {
          stage: prevStage,
          stageHistory: [
            ...member.stageHistory,
            {
              stage: prevStage,
              date: new Date().toISOString(),
              recordedBy: user.name,
              notes: `Retornou da etapa de ${(member.stage || '').toLowerCase()} para ${(prevStage || '').toLowerCase()}.`,
              milestones: []
            }
          ]
        });
        setMembers(members.map(m => m.id === member.id ? updated : m));
        if (selectedMember?.id === member.id) setSelectedMember(updated);
      } catch (error) {
        console.error('Erro ao regredir estágio:', error);
        alert('Erro ao retornar estágio do discípulo.');
      }
    }
  };


  const stats = [
    { label: 'Discípulos Ativos', value: filteredMembers.length.toString().padStart(2, '0'), trend: '+12%', icon: <Target className="text-blue-500" /> },
    { label: 'Em Consolidação', value: getStageMembers(LadderStage.CONSOLIDATE).length.toString().padStart(2, '0'), trend: '+5%', icon: <UserCheck className="text-emerald-500" /> },
    { label: 'Novos Líderes', value: getStageMembers(LadderStage.SEND).length.toString().padStart(2, '0'), trend: '+2%', icon: <Zap className="text-amber-500" /> },
    { label: 'Taxa Retenção', value: '92%', trend: '+8%', icon: <TrendingUp className="text-rose-500" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Visão M12...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Header & Stats */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <TrendingUp size={20} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter">Visão Celular M12</h2>
            </div>
            <p className="text-zinc-500 font-medium max-w-xl">
              Gerenciamento estratégico de cada nível da visão. Acompanhe a evolução de cada discípulo de forma detalhada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar discípulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all w-full sm:w-64"
              />
            </div>
            <button className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400 hover:text-white hover:border-white/10 transition-all">
              <Filter size={20} />
            </button>
            <button
              onClick={handleAddVisitor}
              className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Novo Visitante</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group hover:border-white/10 transition-all">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <h4 className="text-2xl font-black text-white">{stat.value}</h4>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ladder Grid */}
      <div className="flex-1 pb-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
          <LadderColumn
            title="Ganhar"
            stage={LadderStage.WIN}
            icon={<Target size={24} />}
            color="bg-blue-600"
            accentColor="blue"
            description="Novas Decisões"
            members={getStageMembers(LadderStage.WIN)}
            onSelectMember={setSelectedMember}
            onAdvance={handleAdvance}
            onRegress={handleRegress}
            isStageComplete={isStageComplete}
            getActivitiesForStage={getActivitiesForStage}
          />
          <LadderColumn
            title="Consolidar"
            stage={LadderStage.CONSOLIDATE}
            icon={<UserCheck size={24} />}
            color="bg-emerald-600"
            accentColor="emerald"
            description="Integração"
            members={getStageMembers(LadderStage.CONSOLIDATE)}
            onSelectMember={setSelectedMember}
            onAdvance={handleAdvance}
            onRegress={handleRegress}
            isStageComplete={isStageComplete}
            getActivitiesForStage={getActivitiesForStage}
          />
          <LadderColumn
            title="Discipular"
            stage={LadderStage.DISCIPLE}
            icon={<Zap size={24} />}
            color="bg-amber-600"
            accentColor="amber"
            description="Treinamento"
            members={getStageMembers(LadderStage.DISCIPLE)}
            onSelectMember={setSelectedMember}
            onAdvance={handleAdvance}
            onRegress={handleRegress}
            isStageComplete={isStageComplete}
            getActivitiesForStage={getActivitiesForStage}
          />
          <LadderColumn
            title="Enviar"
            stage={LadderStage.SEND}
            icon={<Send size={24} />}
            color="bg-rose-600"
            accentColor="rose"
            description="Multiplicação"
            members={getStageMembers(LadderStage.SEND)}
            onSelectMember={setSelectedMember}
            onAdvance={handleAdvance}
            onRegress={handleRegress}
            isStageComplete={isStageComplete}
            getActivitiesForStage={getActivitiesForStage}
          />
        </div>
      </div>

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-zinc-950 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-8 md:p-10 border-b border-white/5 bg-zinc-900/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Dossiê do Discípulo</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Visão Celular M12 - Evolução</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center transition-all border border-white/5 hover:border-white/10"
                >
                  <ChevronRight size={24} className="rotate-90 md:rotate-0" />
                </button>
              </div>

              <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1">
                {/* Top Section with Performance and Main Info */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
                  {/* Left Column: Profile and Badges */}
                  <div className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                      <div className="relative shrink-0">
                        <img 
                          src={getAvatarUrl(selectedMember.fullName || selectedMember.name, selectedMember.avatarUrl || selectedMember.avatar)} 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(selectedMember.fullName || selectedMember.name, null); }}
                          className="w-32 h-32 rounded-full border-4 border-white/5 shadow-2xl object-cover" 
                          alt="" 
                        />
                        <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white border-4 border-zinc-950 shadow-xl">
                          <Zap size={24} />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left pt-2">
                        <h4 className="text-4xl font-black text-white tracking-tighter uppercase mb-4 leading-none">{selectedMember.fullName || selectedMember.name}</h4>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                          <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                            Fase: {selectedMember.stage}
                          </span>
                          {selectedMember.origin && (
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                              ORIGEM: {selectedMember.origin}
                            </span>
                          )}
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 bg-zinc-900 rounded-full border border-white/5 flex items-center gap-2">
                            <Calendar size={12} className="text-zinc-700" /> Ativo desde {new Date(selectedMember.joinedDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Performance Mini-Card */}
                  <div className="lg:col-span-4">
                    {(() => {
                      const stageActivities = getActivitiesForStage(selectedMember.stage);
                      const total = stageActivities.length;
                      const completed = (selectedMember.completedMilestones || []).filter(m => 
                        stageActivities.includes(m)
                      ).length;
                      const percentage = total > 0 ? (completed / total) * 100 : 0;
                      
                      return (
                        <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border border-blue-500/20 p-8 rounded-[2.5rem] h-full flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-6">
                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Performance M12</p>
                            <span className="text-2xl font-black text-white">{Math.round(percentage)}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-3 rounded-full border border-white/5 overflow-hidden mb-4 shadow-inner">
                            <div className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all duration-1000" style={{ width: `${percentage}%` }} />
                          </div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
                            {completed} de {total} Atividades
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Left Column: Info Cards and Activities */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="space-y-4">
                      {/* Cell Card */}
                      <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 group hover:border-blue-500/30 transition-all">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Célula Atual</p>
                        <div className="flex items-center gap-4 text-white">
                          <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform overflow-hidden border border-white/10">
                            {(() => {
                              const cell = cells.find(c => c.id === selectedMember.cellId);
                              return cell?.logo ? (
                                <img src={cell.logo} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Layers size={24} />
                              );
                            })()}
                          </div>
                          <span className="text-sm font-black uppercase truncate">
                            {cells.find(c => c.id === selectedMember.cellId)?.name || 'Sem Célula'}
                          </span>
                        </div>
                      </div>

                      {/* Discipler Card */}
                      <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 group hover:border-amber-500/30 transition-all">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Discipulador</p>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const discipler = members.find(m => m.id === selectedMember.disciplerId);
                            return (
                              <>
                                <img 
                                  src={getAvatarUrl(discipler?.fullName || discipler?.name || 'D', discipler?.avatarUrl || discipler?.avatar)}
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(discipler?.fullName || discipler?.name || 'D', null); }}
                                  className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:scale-110 transition-transform"
                                  alt=""
                                />
                                <span className="text-sm font-black text-white uppercase truncate">
                                  {discipler?.fullName || discipler?.name || 'Não atribuído'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Pastor Card */}
                      <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 group hover:border-emerald-500/30 transition-all">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Pastor Direto</p>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const pastor = members.find(m => m.id === selectedMember.pastorId);
                            return (
                              <>
                                <img 
                                  src={getAvatarUrl(pastor?.fullName || pastor?.name || 'P', pastor?.avatarUrl || pastor?.avatar)}
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(pastor?.fullName || pastor?.name || 'P', null); }}
                                  className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:scale-110 transition-transform"
                                  alt=""
                                />
                                <span className="text-sm font-black text-white uppercase truncate">
                                  {pastor?.fullName || pastor?.name || 'Não atribuído'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                        <AlertCircle size={14} /> Atividades ({selectedMember.stage})
                      </h4>
                      <div className="space-y-3">
                        {getActivitiesForStage(selectedMember.stage).map((activity) => {
                          const isChecked = selectedMember.completedMilestones?.includes(activity) || false;
                          return (
                            <div
                              key={activity}
                              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isChecked
                                ? 'bg-blue-600/10 border-blue-500/20 text-white'
                                : 'bg-zinc-950 border-white/5 text-zinc-500'
                                }`}
                            >
                              {isChecked ? <CheckCircle2 size={14} className="text-blue-500" /> : <div className="w-3.5 h-3.5 border-2 border-zinc-800 rounded-full" />}
                              <span className="text-[11px] font-bold uppercase tracking-tight">{activity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Evolution Journey with own scroll */}
                  <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="flex-1 flex flex-col min-h-0">
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                        <History size={14} /> Jornada de Evolução
                      </h4>
                      <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar max-h-[500px]">
                        {(selectedMember.stageHistory || []).slice().reverse().map((history, i) => (
                          <div key={i} className="relative pl-10 pb-8 last:pb-0">
                            {/* Timeline Line */}
                            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/5" />
                            {/* Timeline Node */}
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 z-10 group-hover:scale-110 transition-transform">
                              <Zap size={14} />
                            </div>
                            
                            <div className="bg-zinc-900/30 p-6 rounded-[2rem] border border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 bg-blue-600/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                  Nível: {history.stage}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(history.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="text-sm text-zinc-300 font-medium mb-4 leading-relaxed">{history.notes}</p>
                              <div className="flex flex-wrap gap-2">
                                {(history.milestones || []).map((ms, j) => (
                                  <span key={j} className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2 py-1 bg-zinc-950 rounded-lg border border-white/5">
                                    {ms}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                                <UserCheck size={12} className="text-zinc-700" />
                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Registrado por: {history.recordedBy}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-12 pt-10 border-t border-white/5 flex flex-wrap gap-4 justify-between items-center">
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleRegress(selectedMember)}
                      className="flex items-center gap-3 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 transition-all"
                    >
                      <History size={18} />
                      Regredir Nível
                    </button>
                    <button
                      onClick={() => handleAdvance(selectedMember)}
                      className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all"
                    >
                      <ArrowUpRight size={18} />
                      Avançar para {(() => {
                        const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                        const currentIndex = stages.indexOf(selectedMember.stage);
                        return stages[currentIndex + 1] || 'Fim';
                      })()}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-6 py-3 bg-zinc-950 rounded-2xl border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Sincronizado em tempo real</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        user={user}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        plan={user.plan}
      />
    </div>
  );
};

export default SuccessLadder;
