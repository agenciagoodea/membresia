import React, { useState } from 'react';
import { CheckCircle2, Circle, Trophy, Sparkles } from 'lucide-react';
import { memberService } from '../../services/memberService';

const MILESTONES = [
  { id: 'ACCEPT_JESUS', label: 'Aceitar Jesus como Salvador', stage: 'GANHAR' },
  { id: 'CELL_VISIT', label: 'Primeira Visita à Célula', stage: 'GANHAR' },
  { id: 'ALTAR_DECISION', label: 'Consolidar decisão no altar', stage: 'GANHAR' },
  { id: 'REGULAR_CELL', label: 'Frequência regular na Célula', stage: 'CONSOLIDAR' },
  { id: 'PRE_ENCOUNTER', label: 'Cursar o Pré-Encontro', stage: 'CONSOLIDAR' },
  { id: 'ENCOUNTER', label: 'Ir ao Encontro com Deus', stage: 'CONSOLIDAR' },
  { id: 'POST_ENCOUNTER', label: 'Cursar o Pós-Encontro', stage: 'DISCIPULAR' },
  { id: 'CTL_START', label: 'Iniciar o CTL', stage: 'DISCIPULAR' },
  { id: 'LEAD_CELL', label: 'Liderar uma Célula', stage: 'ENVIAR' }
];

const SuccessMarkers: React.FC<{ user: any }> = ({ user }) => {
  const [completed, setCompleted] = useState<string[]>(user.completedMilestones || []);
  const [saving, setSaving] = useState(false);

  const toggleMilestone = async (id: string) => {
    const newCompleted = completed.includes(id)
      ? completed.filter(m => m !== id)
      : [...completed, id];
    
    setCompleted(newCompleted);
    setSaving(true);
    try {
      await memberService.update(user.id, { completedMilestones: newCompleted });
    } catch (error) {
      console.error('Erro ao salvar milestone:', error);
      // Revert on error
      setCompleted(completed);
    } finally {
      setSaving(false);
    }
  };

  const currentCount = completed.length;
  const totalCount = MILESTONES.length;
  const progressPercent = Math.round((currentCount / totalCount) * 100);

  return (
    <div className="bg-zinc-900 border border-blue-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in fade-in duration-1000">
      <div className="absolute top-0 right-0 p-10 opacity-5">
        <Trophy size={120} className="text-blue-500" />
      </div>

      <div className="relative mb-10">
        <div className="flex items-center gap-3 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
          <Sparkles size={16} /> Indicadores de Progresso
        </div>
        <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Sua Escada do Sucesso</h3>
        <p className="text-zinc-500 text-sm font-medium">Marque abaixo os passos que você já realizou para acompanhar seu crescimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MILESTONES.map((m) => {
          const isDone = completed.includes(m.id);
          return (
            <button
              key={m.id}
              disabled={saving}
              onClick={() => toggleMilestone(m.id)}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${
                isDone 
                  ? 'bg-blue-600/10 border-blue-600/30 text-white' 
                  : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-blue-500/30 hover:bg-zinc-900'
              }`}
            >
              <div className={`shrink-0 transition-transform group-hover:scale-110 ${isDone ? 'text-blue-500' : 'text-zinc-700'}`}>
                {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1.5 ${isDone ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {m.stage}
                </p>
                <p className="text-xs font-bold truncate">{m.label}</p>
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
                <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
             </div>
          </div>
        </div>
        <div className="hidden sm:block ml-8">
           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">
             {currentCount} de {totalCount} Concluídos
           </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessMarkers;
