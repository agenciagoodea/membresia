
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
  Search as SearchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_TENANT, PLAN_CONFIGS } from '../../constants';
import { LadderStage, Member, Cell, MemberOrigin } from '../../types';
import { memberService } from '../../services/memberService';
import { cellService } from '../../services/cellService';
import MemberModal from '../MemberModal';
import UpgradeModal from '../Shared/UpgradeModal';

const STAGE_ACTIVITIES: Record<LadderStage, string[]> = {
  [LadderStage.WIN]: ['Sistema de Oração', 'Evangelismo', 'Visita de Célula', 'Outra Igreja'],
  [LadderStage.CONSOLIDATE]: ['Batismo', 'Aclamado', 'Célula', 'Encontro com Deus'],
  [LadderStage.DISCIPLE]: ['Serviços Eclesiásticos', 'Escola de Líderes', 'Escola Bíblica do Reino', 'Cosmo Visões', 'Guerra Espiritual'],
  [LadderStage.SEND]: ['Multiplicação', 'Mentoria']
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
}

const LadderColumn: React.FC<LadderColumnProps> = ({
  title, stage, icon, color, accentColor, description, members, onSelectMember, onAdvance, onRegress, isStageComplete
}) => {
  return (
    <div className="flex flex-col h-full min-w-[320px] bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-5 transition-all hover:border-white/10">
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
              className="bg-zinc-800/50 p-4 rounded-3xl border border-white/5 hover:border-white/20 hover:bg-zinc-800 transition-all cursor-pointer group relative overflow-hidden"
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

                    const required = STAGE_ACTIVITIES[member.stage] || [];
                    const completed = (member.completedMilestones || []).filter(m => required.includes(m)).length;
                    const stageProgress = required.length > 0 ? (completed / required.length) * (100 / stages.length) : 0;

                    return Math.min(100, baseProgress + stageProgress);
                  })()}%`
                }}
              />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} className="w-10 h-10 rounded-full border border-white/10 object-cover aspect-square" alt="" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${color} flex items-center justify-center`}>
                      <CheckCircle2 size={8} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{member.name}</p>
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

                      const required = STAGE_ACTIVITIES[member.stage] || [];
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
                      const validOrigins = [MemberOrigin.PRAYER_REQUEST, MemberOrigin.EVANGELISM, MemberOrigin.CELL_VISIT, MemberOrigin.OTHER_CHURCH];
                      const hasValidOrigin = validOrigins.includes(member.origin as any);
                      if (!hasValidOrigin) return null;
                      return (
                        <div key={`win-icon-${member.id}`} className="w-6 h-6 rounded-full bg-blue-600/20 border-2 border-zinc-800 flex items-center justify-center" title={`Origem: ${member.origin}`}>
                          <CheckCircle2 size={10} className="text-blue-400" />
                        </div>
                      );
                    }

                    const activities = STAGE_ACTIVITIES[s] || [];
                    const completed = activities.filter(act => {
                      if (act === 'Célula' && member.cellId) return true;
                      return (member.completedMilestones || []).includes(act);
                    });

                    return completed.map((act, i) => (
                      <div key={`${s}-${i}-${member.id}`} className={`w-6 h-6 rounded-full bg-${sColor}-600/20 border-2 border-zinc-800 flex items-center justify-center`} title={act}>
                        <CheckCircle2 size={10} className={`text-${sColor}-400`} />
                      </div>
                    ));
                  })}

                  {member.stage !== LadderStage.WIN && (member.completedMilestones || []).length === 0 && !member.cellId && (
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Iniciando etapa</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {stage !== LadderStage.WIN && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegress(member);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 rounded-xl transition-all"
                      title="Voltar Estágio"
                    >
                      <ArrowUpRight size={12} className="rotate-180" />
                    </button>
                  )}

                  {stage !== LadderStage.SEND && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdvance(member);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isStageComplete(member)
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 text-zinc-500 hover:bg-white/10'
                        }`}
                    >
                      Avançar <ArrowUpRight size={12} />
                    </button>
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, cellsData] = await Promise.all([
        memberService.getAll(MOCK_TENANT.id),
        cellService.getAll(MOCK_TENANT.id)
      ]);
      setMembers(membersData);
      setCells(cellsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStageMembers = (stage: LadderStage) =>
    members.filter(m => m.stage === stage && m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const planLimit = PLAN_CONFIGS[MOCK_TENANT.plan].maxMembers;
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
      const created = await memberService.create({
        ...formData,
        church_id: MOCK_TENANT.id,
        joinedDate: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '')}&background=random`,
        origin: formData.origin || MemberOrigin.OTHER_CHURCH,
        completedMilestones: formData.origin === MemberOrigin.PRAYER_REQUEST ? ['Sistema de Oração'] :
          formData.origin === MemberOrigin.EVANGELISM ? ['Evangelismo'] :
            formData.origin === MemberOrigin.CELL_VISIT ? ['Visita de Célula'] :
              formData.origin === MemberOrigin.OTHER_CHURCH ? ['Outra Igreja'] : [],
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

  const isStageComplete = (member: Member) => {
    if (member.stage === LadderStage.WIN) {
      const validOrigins = [MemberOrigin.PRAYER_REQUEST, MemberOrigin.EVANGELISM, MemberOrigin.CELL_VISIT, MemberOrigin.OTHER_CHURCH];
      return validOrigins.includes(member.origin as any);
    }

    const required = STAGE_ACTIVITIES[member.stage] || [];
    const completed = member.completedMilestones || [];

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
        const required = STAGE_ACTIVITIES[member.stage] || [];
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
              notes: `Concluiu a etapa de ${member.stage.toLowerCase()} e avançou via Escada do Sucesso.`,
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
              notes: `Retornou da etapa de ${member.stage.toLowerCase()} para ${prevStage.toLowerCase()}.`,
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

  const handleToggleMilestone = async (member: Member, milestone: string) => {
    if (member.stage === LadderStage.WIN && member.origin === MemberOrigin.PRAYER_REQUEST) {
      if (milestone !== 'Sistema de Oração') return;
      if ((member.completedMilestones || []).includes('Sistema de Oração')) return;
    }

    const current = member.completedMilestones || [];
    let updatedMilestones: string[];

    if (member.stage === LadderStage.WIN) {
      updatedMilestones = current.includes(milestone) ? [] : [milestone];
    } else {
      updatedMilestones = current.includes(milestone)
        ? current.filter(m => m !== milestone)
        : [...current, milestone];
    }

    try {
      const updated = await memberService.update(member.id, {
        completedMilestones: updatedMilestones
      });
      setMembers(members.map(m => m.id === member.id ? updated : m));
      if (selectedMember?.id === member.id) setSelectedMember(updated);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  };

  const stats = [
    { label: 'Discípulos Ativos', value: members.length.toString().padStart(2, '0'), trend: '+12%', icon: <Target className="text-blue-500" /> },
    { label: 'Em Consolidação', value: getStageMembers(LadderStage.CONSOLIDATE).length.toString().padStart(2, '0'), trend: '+5%', icon: <UserCheck className="text-emerald-500" /> },
    { label: 'Novos Líderes', value: getStageMembers(LadderStage.SEND).length.toString().padStart(2, '0'), trend: '+2%', icon: <Zap className="text-amber-500" /> },
    { label: 'Taxa Retenção', value: '92%', trend: '+8%', icon: <TrendingUp className="text-rose-500" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Escada...
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
              <h2 className="text-3xl font-black text-white tracking-tighter">Escada do Sucesso</h2>
            </div>
            <p className="text-zinc-500 font-medium max-w-xl">
              Gestão estratégica do crescimento espiritual. Acompanhe cada discípulo desde a conversão até a liderança reprodutora.
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

      {/* Ladder Columns */}
      <div className="flex-1 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-6 h-full min-w-max">
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
          />
        </div>
      </div>

      {/* Member Details Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-zinc-950 h-full shadow-2xl border-l border-white/10 overflow-y-auto scrollbar-hide"
            >
              <div className="sticky top-0 z-10 p-8 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Dossiê do Discípulo</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Histórico de Evolução</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-6 mb-12">
                  <div className="relative">
                    <img src={selectedMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMember.name)}&background=random`} className="w-24 h-24 rounded-full border-4 border-white/5 shadow-2xl object-cover aspect-square" alt="" />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-zinc-950">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-white tracking-tighter mb-1">{selectedMember.name}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                        {selectedMember.stage}
                      </span>
                      <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">
                        Origem: {selectedMember.origin || 'Outros'}
                      </span>
                      {selectedMember.maritalStatus === 'Casado(a)' && selectedMember.spouseId && members.find(m => m.id === selectedMember.spouseId) && (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-1.5">
                          Cônjuge: {members.find(m => m.id === selectedMember.spouseId)?.name}
                        </span>
                      )}
                      {cells.find(c => c.leaderId === selectedMember.id) && (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1.5">
                          <Target size={10} /> Líder: {cells.find(c => c.leaderId === selectedMember.id)?.name}
                        </span>
                      )}
                      <span className="text-zinc-500 text-xs font-medium w-full mt-1">Desde {new Date(selectedMember.joinedDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  <div className="bg-zinc-900 border border-white/5 p-5 rounded-3xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Célula Atual</p>
                    <p className="text-sm font-bold text-white">
                      {cells.find(c => c.id === selectedMember.cellId)?.name || 'Sem Célula'}
                    </p>
                  </div>
                  <div className="bg-zinc-900 border border-white/5 p-5 rounded-3xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Discipulador</p>
                    <p className="text-sm font-bold text-white">
                      {members.find(m => m.id === selectedMember.disciplerId)?.name || 'Não atribuído'}
                    </p>
                  </div>
                </div>

                {/* Checkpoints Section */}
                <div className="mb-12">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Checkpoints do Estágio ({selectedMember.stage})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STAGE_ACTIVITIES[selectedMember.stage]?.map((activity) => {
                      const isWinStage = selectedMember.stage === LadderStage.WIN;
                      let isChecked = false;

                      if (isWinStage) {
                        if (activity === 'Sistema de Oração') isChecked = selectedMember.origin === MemberOrigin.PRAYER_REQUEST;
                        if (activity === 'Evangelismo') isChecked = selectedMember.origin === MemberOrigin.EVANGELISM;
                        if (activity === 'Visita de Célula') isChecked = selectedMember.origin === MemberOrigin.CELL_VISIT;
                        if (activity === 'Outra Igreja') isChecked = selectedMember.origin === MemberOrigin.OTHER_CHURCH;
                      } else if (activity === 'Célula' && selectedMember.cellId) {
                        isChecked = true;
                      } else {
                        isChecked = selectedMember.completedMilestones?.includes(activity) || false;
                      }

                      return (
                        <button
                          key={activity}
                          disabled={isWinStage || (activity === 'Célula' && selectedMember.cellId)}
                          onClick={() => !isWinStage && !(activity === 'Célula' && selectedMember.cellId) && handleToggleMilestone(selectedMember, activity)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isChecked
                            ? 'bg-blue-600/10 border-blue-500/30 text-white'
                            : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10'
                            } ${isWinStage || (activity === 'Célula' && selectedMember.cellId) ? 'cursor-default' : ''}`}
                        >
                          <span className="text-xs font-bold">{activity}</span>
                          {isChecked ? (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-white/5">
                  {selectedMember.stageHistory.map((entry, i) => (
                    <div key={i} className="relative flex gap-8 pl-12">
                      <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl border-4 border-zinc-950 shadow-xl flex items-center justify-center z-10 ${entry.stage === LadderStage.SEND ? 'bg-rose-600' :
                        entry.stage === LadderStage.DISCIPLE ? 'bg-amber-600' :
                          entry.stage === LadderStage.CONSOLIDATE ? 'bg-emerald-600' :
                            'bg-blue-600'
                        }`}>
                        {entry.stage === LadderStage.SEND ? <Send size={16} className="text-white" /> :
                          entry.stage === LadderStage.DISCIPLE ? <Zap size={16} className="text-white" /> :
                            entry.stage === LadderStage.CONSOLIDATE ? <UserCheck size={16} className="text-white" /> :
                              <Target size={16} className="text-white" />}
                      </div>
                      <div className="flex-1 bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-black text-white uppercase tracking-wider">{entry.stage}</span>
                          <span className="text-[10px] text-zinc-500 font-bold">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{entry.notes || 'Progresso registrado automaticamente pelo sistema de visão celular.'}</p>

                        {entry.milestones && entry.milestones.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {entry.milestones.map((m, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-bold border border-blue-500/20 flex items-center gap-1">
                                <CheckCircle2 size={10} /> {m}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-white/5 w-fit px-3 py-1.5 rounded-xl font-bold uppercase tracking-widest">
                          <UserCheck size={12} className="text-blue-500" /> {entry.recordedBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                    <Zap size={120} />
                  </div>
                  <div className="relative z-10">
                    <h5 className="text-lg font-black text-white mb-2 flex items-center gap-3">
                      <Zap size={24} /> Próximo Nível
                    </h5>
                    <p className="text-sm text-blue-100/80 mb-8 font-medium leading-relaxed">
                      {selectedMember.stage === LadderStage.WIN ? 'O discípulo está pronto para iniciar o processo de consolidação e integração na vida da igreja.' :
                        selectedMember.stage === LadderStage.CONSOLIDATE ? 'Maturidade identificada. Recomendado para o próximo ciclo da Escola de Líderes.' :
                          selectedMember.stage === LadderStage.DISCIPLE ? 'Potencial de liderança confirmado. Preparar para o envio e multiplicação da célula.' :
                            'Líder em plena operação. Focar em mentoria para formação de novos discipuladores.'}
                    </p>
                    <div className="flex gap-4">
                      {selectedMember.stage !== LadderStage.WIN && (
                        <button
                          onClick={() => handleRegress(selectedMember)}
                          className="flex-1 py-4 bg-white/5 text-zinc-400 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
                        >
                          Voltar Nível
                        </button>
                      )}
                      <button
                        onClick={() => handleAdvance(selectedMember)}
                        className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isStageComplete(selectedMember)
                          ? 'bg-white text-blue-600 hover:bg-zinc-100 shadow-blue-500/10'
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                          }`}
                      >
                        {isStageComplete(selectedMember) ? 'Efetivar Transição' : 'Conclua os Itens do Nível'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        member={null}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        limitType="MEMBERS"
        currentLimit={planLimit}
      />
    </div>
  );
};

export default SuccessLadder;
