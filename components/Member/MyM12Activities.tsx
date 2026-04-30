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
import { motion, AnimatePresence } from 'framer-motion';
import { LadderStage, Member, M12Activity, UserRole } from '../../types';
import { memberService } from '../../services/memberService';
import { m12Service } from '../../services/m12Service';
import { cellService } from '../../services/cellService';
import DynamicForm from '../Shared/DynamicForm';

const MyM12Activities: React.FC<{ user: any }> = ({ user }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activities, setActivities] = useState<M12Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState<LadderStage | null>(null);

  const isAdmin = user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.MASTER_ADMIN || user.role === UserRole.PASTOR;

  const loadData = async () => {
    try {
      setLoading(true);
      const churchId = user.churchId || user.church_id;
      if (!churchId) {
        setLoading(false);
        return;
      }

      const [membersData, activitiesData] = await Promise.all([
        memberService.getAll(churchId, undefined, user),
        m12Service.getActivities(churchId)
      ]);

      const cells = await cellService.getAll(churchId, user);
      
      const filtered = membersData.filter(m => {
        const isSelf = m.id === user.id;
        const isSpouse = m.id === user.spouseId || user.id === m.spouseId;
        const memberCell = cells.find(c => c.id === m.cellId);
        const isCellLeaderOrHost = memberCell && (memberCell.leaderId === user.id || memberCell.hostId === user.id || (memberCell.leaderIds || []).includes(user.id));
        return isSelf || isSpouse || isCellLeaderOrHost;
      });

      setMembers(filtered);
      setActivities(activitiesData.filter(a => a.isActive));
      
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

  const handleUpdateActivity = async (fieldId: string, value: any) => {
    if (!selectedMember || !activeStage) return;

    const isSelf = selectedMember.id === user.id;

    if (!isSelf && !isAdmin) {
      alert('Você não tem permissão para editar as atividades de outras pessoas. Esta função é restrita a Pastores e Administradores.');
      return;
    }

    const field = activities.find(f => f.id === fieldId);
    if (!field) return;

    // Bloquear edição do nível 'GANHAR' (Travar para membros)
    if (activeStage === LadderStage.WIN && !(user.role === UserRole.PASTOR || user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.MASTER_ADMIN)) {
      if (field.label === selectedMember.origin) {
        alert('A sua "Origem / Indicação" foi definida no cadastro e não pode ser alterada. Caso precise de correção, procure seu líder ou pastor.');
        return; 
      }
    }

    setUpdating(fieldId);
    
    // Lógica para determinar se a atividade está "Concluída" para fins de progresso (escada)
    const isNowDone = 
      (field.logicType === 'BOOLEAN' && value === true) ||
      (field.logicType === 'STATUS' && value === 'Concluído') ||
      (['SELECT', 'MULTI_SELECT', 'DATE', 'TEXT', 'NUMBER', 'UPLOAD', 'RELATIONAL'].includes(field.logicType) && !!value && (Array.isArray(value) ? value.length > 0 : value !== ''));

    const currentMilestones = selectedMember.completedMilestones || [];
    const currentValues = selectedMember.milestoneValues || {};
    
    let newMilestones = isNowDone 
      ? Array.from(new Set([...currentMilestones, field.label]))
      : currentMilestones.filter(m => m !== field.label);

    const newValues = { ...currentValues, [field.label]: value };

    try {
      let updateData: Partial<Member> = {
        completedMilestones: newMilestones,
        milestoneValues: newValues
      };

      // Se for do estágio GANHAR e for o campo de origem, sincroniza
      if (activeStage === LadderStage.WIN && field.label.toLowerCase().includes('origem')) {
        updateData.origin = value;
      }

      const currentStageActivities = activities.filter(a => a.stage === selectedMember.stage && a.isActive);
      const isFinishingCurrentStage = activeStage === selectedMember.stage;

      if (isFinishingCurrentStage) {
        const mandatoryCompleted = currentStageActivities
          .filter(a => a.isRequired)
          .every(a => {
            const val = a.id === fieldId ? value : (newValues[a.label]);
            const logic = a.logicType;
            
            if (logic === 'BOOLEAN') return val === true;
            if (logic === 'STATUS') return val === 'Concluído';
            return !!val && (Array.isArray(val) ? val.length > 0 : val !== '');
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
          }
        }
      }

      // Salvar na tabela de respostas estruturadas e no perfil do membro (retrocompatibilidade)
      await Promise.all([
        memberService.update(selectedMember.id, updateData),
        m12Service.saveMemberResponse(selectedMember.id, field.id, value)
      ]);

      const updated = { ...selectedMember, ...updateData };
      setSelectedMember(updated);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      
      if (updateData.stage) {
        setActiveStage(updateData.stage);
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    } finally {
      setUpdating(null);
    }
  };

  const stagesOptions = [
    { id: LadderStage.WIN, label: 'Ganhar', icon: <Target size={24} />, color: 'bg-blue-600' },
    { id: LadderStage.CONSOLIDATE, label: 'Consolidar', icon: <Clock size={24} />, color: 'bg-emerald-600' },
    { id: LadderStage.DISCIPLE, label: 'Discipular', icon: <Zap size={24} />, color: 'bg-amber-600' },
    { id: LadderStage.SEND, label: 'Enviar', icon: <UserCheck size={24} />, color: 'bg-rose-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Atividades Dinâmicas...
      </div>
    );
  }

  const filteredMembers = members.filter(m => (m.fullName || m.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Ficha Ministerial M12</h2>
          </div>
          <p className="text-zinc-500 font-medium italic">Acompanhe e valide o progresso espiritual dos seus discípulos.</p>
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

      <div className="grid grid-cols-1 gap-10">
        <div className="lg:col-span-12">
          <AnimatePresence mode="wait">
            {selectedMember ? (
              <motion.div 
                key={selectedMember.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900 p-10 md:p-14 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 opacity-5 bg-blue-600 w-96 h-96 rounded-full blur-[100px]" />
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 relative z-10">
                    <div className="relative">
                      <img src={selectedMember.avatar} className="w-28 h-28 rounded-[2.5rem] ring-4 ring-white/5 shadow-2xl object-cover" alt="" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-zinc-900 shadow-lg">
                        <Target size={18} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-3">{selectedMember.name}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-5 py-2 bg-zinc-950 border border-white/5 rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={12} className="text-blue-500" /> Nível {selectedMember.stage}
                        </span>
                        <span className="px-5 py-2 bg-blue-600/10 border border-blue-600/20 rounded-full text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          {Math.round(((selectedMember.completedMilestones || []).length / activities.filter(a => a.isActive).length) * 100) || 0}% Progresso Geral 
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {stagesOptions.map((stage) => {
                      const isCurrent = selectedMember.stage === stage.id;
                      const isViewing = activeStage === stage.id;
                      const stageActivities = activities.filter(a => a.stage === stage.id);
                      const completedInStage = (selectedMember.completedMilestones || []).filter(m => stageActivities.some(sa => sa.label === m)).length;
                      
                      return (
                        <button 
                          key={stage.id} 
                          onClick={() => setActiveStage(stage.id)}
                          className={`p-6 rounded-[2rem] border transition-all text-left group relative overflow-hidden ${isViewing ? 'bg-zinc-950 border-blue-500/50 shadow-2xl' : 'bg-zinc-950/40 border-white/5 hover:border-white/20'} ${!isCurrent && !isViewing ? 'opacity-50' : ''}`}
                        >
                          <div className={`w-10 h-10 ${stage.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform relative z-10`}>
                            {stage.icon}
                          </div>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 relative z-10">{stage.label}</p>
                          <p className="text-sm font-black text-white relative z-10">{completedInStage} / {stageActivities.length}</p>
                          {isCurrent && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 p-10 rounded-[3.5rem] space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em]">Atividades de {activeStage}</h4>
                    {updating && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />}
                  </div>

                  <DynamicForm
                    fields={activities.filter(a => a.stage === activeStage)}
                    values={selectedMember.milestoneValues || {}}
                    onChange={handleUpdateActivity}
                    members={members}
                    currentUser={user}
                    isAdmin={isAdmin}
                    isReadOnly={selectedMember.id !== user.id && !isAdmin}
                  />

                  {activities.filter(a => a.stage === activeStage && a.isActive).length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-700">
                      <BookOpen size={48} className="mb-6 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhuma atividade definida para este nível</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[500px] flex items-center justify-center bg-zinc-900/30 rounded-[3.5rem] border border-white/5 border-dashed">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users2 size={40} className="text-zinc-800" />
                  </div>
                  <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Selecione um discípulo para ver a ficha ministerial</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MyM12Activities;
