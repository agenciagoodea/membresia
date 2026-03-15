
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Target, 
  Zap, 
  ChevronRight,
  Star,
  BookOpen,
  Users,
  MessageSquare,
  Lock,
  UserCheck,
  Heart,
  Calendar,
  Search,
  Users2
} from 'lucide-react';
import { LadderStage, Member, M12Checkpoint, UserRole } from '../../types';
import { memberService } from '../../services/memberService';
import { m12Service } from '../../services/m12Service';
import { cellService } from '../../services/cellService';
import { MOCK_TENANT } from '../../constants';

const MyM12Activities: React.FC<{ user: any }> = ({ user }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<M12Checkpoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState<LadderStage | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, checkpointsData] = await Promise.all([
        memberService.getAll(MOCK_TENANT.id),
        m12Service.getCheckpoints(MOCK_TENANT.id)
      ]);

      // Filter members: self, spouse, and disciples of led/hosted cells
      const cells = await cellService.getAll(MOCK_TENANT.id);
      
      const filtered = membersData.filter(m => {
        const isSelf = m.id === user.id;
        const isSpouse = m.id === user.spouseId || user.id === m.spouseId;
        const memberCell = cells.find(c => c.id === m.cellId);
        const isCellLeaderOrHost = memberCell && (memberCell.leaderId === user.id || memberCell.hostId === user.id);
        return isSelf || isSpouse || isCellLeaderOrHost;
      });

      setMembers(filtered);
      setCheckpoints(checkpointsData);
      
      // Select self by default
      const self = filtered.find(m => m.id === user.id);
      if (self) {
        setSelectedMember(self);
        setActiveStage(self.stage);
      } else if (filtered.length > 0) {
        setSelectedMember(filtered[0]);
        setActiveStage(filtered[0].stage);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActivity = async (activity: string) => {
    if (!selectedMember || !activeStage) return;

    // Check dependencies
    const cp = checkpoints.find(c => c.label === activity && c.stage === activeStage);
    if (cp?.dependsOnId) {
      const dependency = checkpoints.find(c => c.id === cp.dependsOnId);
      if (dependency && !(selectedMember.completedMilestones || []).includes(dependency.label)) {
        alert(`Esta atividade depende de "${dependency.label}". Complete-a primeiro.`);
        return;
      }
    }

    setUpdating(activity);
    const currentMilestones = selectedMember.completedMilestones || [];
    const isDone = currentMilestones.includes(activity);
    let newMilestones: string[];
    
    if (activeStage === LadderStage.WIN) {
      // 1/1 logic for WIN stage: only one can be active
      newMilestones = isDone ? [] : [activity];
    } else {
      newMilestones = isDone 
        ? currentMilestones.filter(m => m !== activity)
        : [...currentMilestones, activity];
    }

    try {
      let updateData: Partial<Member> = {
        completedMilestones: newMilestones
      };

      // Sync origin if in WIN stage
      if (activeStage === LadderStage.WIN) {
        updateData.origin = newMilestones[0] || '';
      }

      // Auto-advance logic if all mandatory checkpoints for current stage are done
      const currentStageCPs = checkpoints.filter(c => c.stage === selectedMember.stage && c.isActive);
      const isFinishingCurrentStage = activeStage === selectedMember.stage;

      if (isFinishingCurrentStage) {
        const mandatoryCompleted = currentStageCPs
          .filter(c => c.isRequired)
          .every(c => {
            const label = c.label;
            const willBeDone = label === activity ? !isDone : newMilestones.includes(label);
            return willBeDone;
          });

        if (mandatoryCompleted) {
          const stages_arr = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
          const currentIndex = stages_arr.indexOf(selectedMember.stage);
          if (currentIndex < stages_arr.length - 1) {
            const nextStage = stages_arr[currentIndex + 1];
            updateData.stage = nextStage;
            updateData.stageHistory = [
              ...(selectedMember.stageHistory || []),
              {
                stage: selectedMember.stage,
                date: new Date().toISOString(),
                recordedBy: user.name,
                notes: `Avançou automaticamente ao concluir atividades de ${selectedMember.stage}.`,
                milestones: newMilestones
              }
            ];
            // When advancing, usually milestones are cleared or moved to history
            // But system seems to keep them in completedMilestones. 
            // The prompt says "concluiu tudo ele automaticamente vai para o próximo nível"
          }
        }
      }

      const updated = await memberService.update(selectedMember.id, updateData);
      setSelectedMember(updated);
      setMembers(members.map(m => m.id === updated.id ? updated : m));
      if (updateData.stage) {
        setActiveStage(updateData.stage);
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    } finally {
      setUpdating(null);
    }
  };

  const stages = [
    { id: LadderStage.WIN, label: 'Ganhar', icon: <Target size={24} />, color: 'bg-blue-600' },
    { id: LadderStage.CONSOLIDATE, label: 'Consolidar', icon: <Clock size={24} />, color: 'bg-emerald-600' },
    { id: LadderStage.DISCIPLE, label: 'Discipular', icon: <Zap size={24} />, color: 'bg-amber-600' },
    { id: LadderStage.SEND, label: 'Enviar', icon: <UserCheck size={24} />, color: 'bg-rose-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Atividades M12...
      </div>
    );
  }

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Minhas Atividades M12</h2>
          </div>
          <p className="text-zinc-500 font-medium italic">Gerencie seu progresso e de seus liderados na visão celular.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar integrante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Member List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 px-4">Integrantes Vinculados</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide pr-2">
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMember(m);
                    setActiveStage(m.stage);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${selectedMember?.id === m.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}
                >
                  <img src={m.avatar} className="w-10 h-10 rounded-full ring-2 ring-white/10" alt="" />
                  <div className="text-left flex-1 min-w-0">
                    <p className={`text-sm font-black truncate uppercase ${selectedMember?.id === m.id ? 'text-white' : 'text-zinc-200'}`}>{m.name}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${selectedMember?.id === m.id ? 'text-blue-100' : 'text-zinc-500'}`}>
                      {m.id === user.id ? 'Você' : m.id === user.spouseId ? 'Cônjuge' : 'Discípulo'}
                    </p>
                  </div>
                  {selectedMember?.id === m.id && <ChevronRight size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-black p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <Star size={180} fill="currentColor" />
            </div>
            <div className="relative z-10">
              <Zap size={32} className="text-indigo-400 mb-6" />
              <h4 className="text-2xl font-black tracking-tighter uppercase mb-2">Visão 2026</h4>
              <p className="text-indigo-200 text-xs font-bold italic leading-relaxed opacity-60">Sua dedicação hoje constrói o Reino de amanhã.</p>
            </div>
          </div>
        </div>

        {/* Main Content: Progress activities */}
        <div className="lg:col-span-8">
          {selectedMember ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900 p-8 md:p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 opacity-5 bg-blue-600 w-96 h-96 rounded-full blur-[100px]" />
                
                <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 relative z-10">
                  <div className="relative">
                    <img src={selectedMember.avatar} className="w-24 h-24 rounded-[2rem] ring-4 ring-white/5 shadow-2xl object-cover" alt="" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white border-2 border-zinc-900 shadow-lg">
                      <Target size={14} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">{selectedMember.name}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-4 py-1.5 bg-zinc-950 border border-white/5 rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={12} className="text-blue-500" /> {selectedMember.stage}
                      </span>
                      <span className="px-4 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-full text-[10px] font-black text-blue-500 uppercase tracking-widest">
                        {Math.round(((selectedMember.completedMilestones || []).length / checkpoints.length) * 100) || 0}% de Evolução
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {stages.map((stage) => {
                    const isCurrent = selectedMember.stage === stage.id;
                    const isViewing = activeStage === stage.id;
                    const stageActivities = checkpoints.filter(c => c.stage === stage.id);
                    const completedInStage = (selectedMember.completedMilestones || []).filter(m => stageActivities.some(sa => sa.label === m)).length;
                    
                    return (
                      <button 
                        key={stage.id} 
                        onClick={() => setActiveStage(stage.id)}
                        className={`p-6 rounded-3xl border transition-all text-left group ${isViewing ? 'bg-zinc-950 border-blue-500/50 shadow-xl' : 'bg-zinc-950/40 border-white/5 hover:border-white/20'} ${!isCurrent && !isViewing ? 'opacity-60' : ''}`}
                      >
                        <div className={`w-10 h-10 ${stage.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                          {stage.icon}
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{stage.label}</p>
                        <p className="text-sm font-black text-white">{completedInStage} / {stageActivities.length}</p>
                        {isCurrent && <div className="mt-2 w-full h-1 bg-blue-600/20 rounded-full overflow-hidden"><div className="w-full h-full bg-blue-600" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {checkpoints.filter(c => c.stage === activeStage && c.isActive).map((cp) => {
                  const isDone = (selectedMember.completedMilestones || []).includes(cp.label);
                  const isUpdating = updating === cp.label;
                  const isLocked = cp.dependsOnId && !(selectedMember.completedMilestones || []).includes(checkpoints.find(c => c.id === cp.dependsOnId)?.label || '');

                  return (
                    <div 
                      key={cp.id}
                      onClick={() => !isLocked && !isUpdating && handleToggleActivity(cp.label)}
                      className={`bg-zinc-900/40 border ${isDone ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : isLocked ? 'border-white/5 opacity-40 grayscale pointer-events-none' : 'border-white/5'} py-4 px-6 rounded-2xl transition-all cursor-pointer group hover:border-blue-500/30 flex items-center justify-between gap-6`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-950 text-zinc-600 group-hover:bg-blue-600/10 group-hover:text-blue-500'} transition-all`}>
                          {isDone ? <CheckCircle2 size={18} /> : <Zap size={18} />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-white uppercase tracking-tight truncate">{cp.label}</p>
                            {cp.isRequired && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] px-1 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 font-black uppercase tracking-tighter shrink-0">Obrigat.</span>
                                {cp.dependsOnId && (
                                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                                    (Fazer antes: {checkpoints.find(c => c.id === cp.dependsOnId)?.label})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {isLocked ? (
                            <div className="flex items-center gap-1 text-zinc-600">
                              <Lock size={8} />
                              <span className="text-[9px] font-bold uppercase italic tracking-tighter truncate max-w-[150px]">Depende de {checkpoints.find(c => c.id === cp.dependsOnId)?.label}</span>
                            </div>
                          ) : (
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
                              {isDone ? 'Concluído' : 'Pendente'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className={`w-10 h-5 rounded-full relative transition-all duration-300 shrink-0 ${isDone ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isDone ? 'left-6' : 'left-1'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {checkpoints.filter(c => c.stage === selectedMember.stage && c.isActive).length === 0 && (
                <div className="py-20 bg-zinc-900/50 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-600">
                  <BookOpen size={48} className="mb-6 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhuma atividade cadastrada neste nível</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-zinc-900/30 rounded-[3.5rem] border border-white/5 border-dashed">
              <div className="text-center space-y-4">
                <Users2 size={48} className="mx-auto text-zinc-800" />
                <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Selecione um integrante para gerenciar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyM12Activities;
