
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
  Lock
} from 'lucide-react';
import { LadderStage, Member, M12Checkpoint } from '../../types';
import { memberService } from '../../services/memberService';
import { m12Service } from '../../services/m12Service';
import { MOCK_TENANT } from '../../constants';

const DEFAULT_STAGE_ACTIVITIES: Record<LadderStage, string[]> = {
  [LadderStage.WIN]: ['Sistema de Oração', 'Consolidação Inicial', 'Visita à Célula', 'Pré-Encontro'],
  [LadderStage.CONSOLIDATE]: ['Encontro com Deus', 'Batismo', 'Pós-Encontro', 'Curso de Maturidade'],
  [LadderStage.DISCIPLE]: ['Escola de Líderes (N1)', 'CTL', 'Frequência na Célula', 'Discipulado Fixo'],
  [LadderStage.SEND]: ['Escola de Líderes (Conclusão)', 'Timóteo (Treinamento)', 'Multiplicar Célula', 'Enviar Discípulos']
};

const MyProgress: React.FC<{ user: any }> = ({ user }) => {
  const [currentUser, setCurrentUser] = useState<Member>(user);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<M12Checkpoint[]>([]);

  useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        const data = await m12Service.getCheckpoints(MOCK_TENANT.id);
        setCheckpoints(data);
      } catch (error) {
        console.error('Erro ao buscar checkpoints:', error);
      }
    };
    fetchCheckpoints();
  }, []);

  const getActivitiesForStage = (stage: LadderStage) => {
    const stageCheckpoints = checkpoints.filter(c => c.stage === stage);
    if (stageCheckpoints.length > 0) return stageCheckpoints.map(c => c.label);
    return DEFAULT_STAGE_ACTIVITIES[stage] || [];
  };

  const stages = [
    { 
      id: LadderStage.WIN, 
      label: 'Ganhar', 
      icon: <Target size={32} />, 
      color: 'bg-blue-600', 
      description: 'O início de tudo. O momento da sua decisão e integração inicial.',
      activities: getActivitiesForStage(LadderStage.WIN)
    },
    { 
      id: LadderStage.CONSOLIDATE, 
      label: 'Consolidar', 
      icon: <Clock size={32} />, 
      color: 'bg-emerald-600', 
      description: 'Firmando seus passos e mergulhando na vida da igreja.',
      activities: getActivitiesForStage(LadderStage.CONSOLIDATE)
    },
    { 
      id: LadderStage.DISCIPLE, 
      label: 'Discipular', 
      icon: <Zap size={32} />, 
      color: 'bg-amber-600', 
      description: 'Crescendo no conhecimento e preparando seu coração para servir.',
      activities: getActivitiesForStage(LadderStage.DISCIPLE)
    },
    { 
      id: LadderStage.SEND, 
      label: 'Enviar', 
      icon: <CheckCircle2 size={32} />, 
      color: 'bg-rose-600', 
      description: 'Pronto para frutificar e liderar outros discípulos no Reino.',
      activities: getActivitiesForStage(LadderStage.SEND)
    }
  ];

  const handleToggleActivity = async (activity: string) => {
    // Check dependencies
    const cp = checkpoints.find(c => c.label === activity && c.stage === currentUser.stage);
    if (cp?.dependsOnId) {
      const dependency = checkpoints.find(c => c.id === cp?.dependsOnId);
      if (dependency && !(currentUser.completedMilestones || []).includes(dependency.label)) {
        alert(`Esta atividade depende de "${dependency.label}". Complete-a primeiro.`);
        return;
      }
    }

    setUpdating(activity);
    const currentMilestones = currentUser.completedMilestones || [];
    const isDone = currentMilestones.includes(activity);
    
    const newMilestones = isDone 
      ? currentMilestones.filter(m => m !== activity)
      : [...currentMilestones, activity];

    try {
      const updated = await memberService.update(currentUser.id, {
        completedMilestones: newMilestones
      });
      setCurrentUser(updated);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    } finally {
      setUpdating(null);
    }
  };

  const currentStageIndex = stages.findIndex(s => s.id === currentUser.stage);
  const totalActivities = stages.reduce((acc, s) => acc + s.activities.length, 0);
  const completedTotal = (currentUser.completedMilestones || []).length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-zinc-900/50 p-10 md:p-16 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 opacity-5 bg-blue-600 w-96 h-96 rounded-full blur-[100px]" />
        
        <div className="max-w-3xl relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-6 flex items-center gap-4">
            <Star className="text-amber-500" fill="currentColor" /> Visão Celular M12
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-12">
            O M12 não é apenas uma estratégia, é o modelo de Jesus para o discipulado. Acompanhe seu progresso e ative cada passo da sua jornada ministerial.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-950 p-8 rounded-3xl border border-white/5 flex items-center gap-6 group hover:border-blue-500/30 transition-all">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <BookOpen size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Passos Concluídos</p>
                <p className="text-xl font-black text-white">{completedTotal} de {totalActivities}</p>
              </div>
            </div>
            <div className="bg-zinc-950 p-8 rounded-3xl border border-white/5 flex items-center gap-6 group hover:border-emerald-500/30 transition-all">
              <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Target size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Nível de Visão</p>
                <p className="text-xl font-black text-white uppercase tracking-tighter">{currentUser.stage}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {stages.map((stage, idx) => {
          const isCurrent = currentUser.stage === stage.id;
          const isPast = idx < currentStageIndex;
          const isFuture = idx > currentStageIndex;

          return (
            <div 
              key={stage.id} 
              className={`bg-zinc-900 border ${isCurrent ? 'border-blue-500/50 shadow-2xl shadow-blue-500/10' : 'border-white/5'} p-8 rounded-[2.5rem] transition-all relative overflow-hidden group`}
            >
              <div className={`w-14 h-14 ${isPast ? 'bg-emerald-500' : isCurrent ? stage.color : 'bg-zinc-800'} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110`}>
                {isPast ? <CheckCircle2 size={28} /> : stage.icon}
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{stage.label}</h3>
              <p className="text-zinc-500 text-xs font-medium leading-relaxed mb-8">{stage.description}</p>

              <div className="space-y-4">
                {stage.activities.map((activity, tidx) => {
                  const isDone = (currentUser.completedMilestones || []).includes(activity);
                  const isPending = updating === activity;
                  const cp = checkpoints.find(c => c.label === activity && c.stage === stage.id);
                  const isLocked = cp?.dependsOnId && !(currentUser.completedMilestones || []).includes(checkpoints.find(c => c.id === cp.dependsOnId)?.label || '');

                  return (
                    <div key={tidx} className={`flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border ${isLocked ? 'border-white/5 opacity-50' : 'border-white/5'}`}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${isDone ? 'text-zinc-300' : 'text-zinc-600'}`}>
                            {activity}
                          </span>
                          {cp?.isRequired && (
                            <span className="text-[7px] px-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md font-black uppercase tracking-widest">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-zinc-600">
                            <Lock size={8} />
                            <span className="text-[8px] font-bold uppercase italic tracking-tighter">Depende de {checkpoints.find(c => c.id === cp?.dependsOnId)?.label}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActivity(activity)}
                        disabled={isPending || isLocked}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isDone ? 'bg-blue-600' : 'bg-zinc-800'} ${isPending ? 'opacity-50 cursor-wait' : ''} ${isLocked ? 'cursor-not-allowed opacity-30 shadow-inner' : ''}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isDone ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {isCurrent && (
                <div className="mt-10 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] group/btn">
                    Estágio Ativo <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-zinc-950 p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-2xl">
            <MessageSquare size={32} className="text-amber-500" />
          </div>
          <div>
            <h4 className="text-xl font-black text-white uppercase tracking-tighter">Dúvidas sobre o M12?</h4>
            <p className="text-zinc-500 text-sm font-medium">Sua jornada é acompanhada por líderes que se importam com você.</p>
          </div>
        </div>
        <button className="px-10 py-5 bg-white text-zinc-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
          Falar com Líder
        </button>
      </div>
    </div>
  );
};

export default MyProgress;
