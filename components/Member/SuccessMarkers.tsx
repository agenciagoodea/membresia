import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trophy, Sparkles, Lock } from 'lucide-react';
import { memberService } from '../../services/memberService';
import { m12Service } from '../../services/m12Service';
import { LadderStage, M12Activity } from '../../types';

const DEFAULT_STAGE_ACTIVITIES: Record<LadderStage, string[]> = {
  [LadderStage.WIN]: ['Sistema de Oração', 'Consolidação Inicial', 'Visita à Célula', 'Pré-Encontro'],
  [LadderStage.CONSOLIDATE]: ['Encontro com Deus', 'Batismo', 'Pós-Encontro', 'Curso de Maturidade'],
  [LadderStage.DISCIPLE]: ['Escola de Líderes (N1)', 'CTL', 'Frequência na Célula', 'Discipulado Fixo'],
  [LadderStage.SEND]: ['Escola de Líderes (Conclusão)', 'Timóteo (Treinamento)', 'Multiplicar Célula', 'Enviar Discípulos']
};

const SuccessMarkers: React.FC<{ user: any }> = ({ user }) => {
  const [completed, setCompleted] = useState<string[]>(user.completedMilestones || []);
  const [saving, setSaving] = useState<string | null>(null);
  const [activities, setActivities] = useState<M12Activity[]>([]);

  useEffect(() => {
    setCompleted(user.completedMilestones || []);
  }, [user.completedMilestones]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const churchId = user.churchId || user.church_id;
        if (!churchId) return;
        const data = await m12Service.getActivities(churchId);
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };
    fetchActivities();
  }, [user.churchId, user.church_id]);

  const getActivitiesForStage = (stage: LadderStage) => {
    const stageActivities = activities.filter(a => a.stage === stage);
    if (stageActivities.length > 0) return stageActivities.map(a => ({ label: a.label, stage }));
    return (DEFAULT_STAGE_ACTIVITIES[stage] || []).map(label => ({ label, stage }));
  };

  const toggleMilestone = async (activity: string) => {
    const act = activities.find(a => a.label === activity);
    if (act?.dependsOnId) {
      const dependency = activities.find(a => a.id === act.dependsOnId);
      if (dependency && !completed.includes(dependency.label)) {
        alert(`Esta atividade depende de "${dependency.label}". Complete-a primeiro.`);
        return;
      }
    }

    const isDone = completed.includes(activity);
    const newCompleted = isDone
      ? completed.filter(m => m !== activity)
      : [...completed, activity];
    
    setCompleted(newCompleted);
    setSaving(activity);
    try {
      await memberService.update(user.id, { completedMilestones: newCompleted });
    } catch (error) {
      console.error('Erro ao salvar milestone:', error);
      setCompleted(completed);
    } finally {
      setSaving(null);
    }
  };

  const allActivities = Object.values(LadderStage).flatMap(stage => getActivitiesForStage(stage));
  const currentCount = completed.length;
  const totalCount = allActivities.length;
  const progressPercent = totalCount > 0 ? Math.round((currentCount / totalCount) * 100) : 0;

  return (
    <div className="bg-zinc-900 border border-blue-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in duration-1000">
      <div className="absolute top-0 right-0 p-10 opacity-5">
        <Trophy size={120} className="text-blue-500" />
      </div>

      <div className="relative mb-10">
        <div className="flex items-center gap-3 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
          <Sparkles size={16} /> Indicadores de Progresso
        </div>
        <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Visão Celular M12</h3>
        <p className="text-zinc-500 text-sm font-medium">Ative cada passo para acompanhar sua evolução ministerial.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allActivities.map((m, idx) => {
          const isDone = completed.includes(m.label);
          const isSaving = saving === m.label;
          const act = activities.find(a => a.label === m.label && a.stage === m.stage);
          const isLocked = act?.dependsOnId && !completed.includes(activities.find(a => a.id === act.dependsOnId)?.label || '');
          
          return (
            <button
              key={idx}
              disabled={!!saving || isLocked}
              onClick={() => toggleMilestone(m.label)}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${
                isDone 
                  ? 'bg-blue-600/10 border-blue-600/30 text-white' 
                   : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-blue-500/30 hover:bg-zinc-900'
              } ${isSaving ? 'opacity-50 cursor-wait' : ''} ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <div className={`shrink-0 transition-transform group-hover:scale-110 ${isDone ? 'text-blue-500' : 'text-zinc-700'}`}>
                {isLocked ? <Lock size={24} /> : isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 ">
                  <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDone ? 'text-blue-400' : 'text-zinc-600'}`}>
                    {m.stage}
                  </p>
                  {act?.isRequired && (
                    <span className="text-[7px] px-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md font-black uppercase tracking-widest">
                      Obrigatório
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold truncate">{m.label}</p>
                {isLocked && (
                   <p className="text-[8px] text-zinc-600 mt-1 font-bold italic truncate">Bloqueado por {activities.find(a => a.id === act?.dependsOnId)?.label}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 flex-1 max-w-md">
          <div className="flex-1">
             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                <span>Progresso Total</span>
                <span>{progressPercent}%</span>
             </div>
             <div className="w-full bg-zinc-950 h-2 rounded-full border border-white/5 overflow-hidden">
                <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` || '0%' }} />
             </div>
          </div>
        </div>
        <div className="hidden sm:block ml-8">
           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">
             {currentCount} de {totalCount} Passos
           </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessMarkers;
