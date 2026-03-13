
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Target, 
  Zap, 
  ChevronRight,
  Star,
  BookOpen,
  Users,
  MessageSquare
} from 'lucide-react';
import { LadderStage } from '../../types';

const MyProgress: React.FC<{ user: any }> = ({ user }) => {
  const stages = [
    { 
      id: LadderStage.WIN, 
      label: 'Ganhar', 
      icon: <CheckCircle2 size={32} />, 
      color: 'bg-emerald-600', 
      description: 'Você aceitou a Jesus e iniciou sua jornada na fé.',
      tasks: [
        { label: 'Aceitar Jesus como Salvador', done: true },
        { label: 'Primeira Visita à Célula', done: true },
        { label: 'Consolidar decisão no altar', done: true }
      ]
    },
    { 
      id: LadderStage.CONSOLIDATE, 
      label: 'Consolidar', 
      icon: <Clock size={32} />, 
      color: 'bg-blue-600', 
      description: 'Momento de firmar seus passos e participar do Pré-Encontro.',
      tasks: [
        { label: 'Frequência regular na Célula', done: true },
        { label: 'Cursar o Pré-Encontro', done: false },
        { label: 'Ir ao Encontro com Deus', done: false }
      ]
    },
    { 
      id: LadderStage.DISCIPLE, 
      label: 'Discipular', 
      icon: <Target size={32} />, 
      color: 'bg-amber-500', 
      description: 'Crescendo no conhecimento através do CTL e discipulado.',
      tasks: [
        { label: 'Cursar o Pós-Encontro', done: false },
        { label: 'Iniciar o CTL (Centro de Treinamento)', done: false },
        { label: 'Ter um discipulador fixo', done: false }
      ]
    },
    { 
      id: LadderStage.SEND, 
      label: 'Enviar', 
      icon: <Zap size={32} />, 
      color: 'bg-indigo-600', 
      description: 'Pronto para liderar sua própria célula e expandir o Reino.',
      tasks: [
        { label: 'Liderar uma Célula', done: false },
        { label: 'Enviar novos discípulos', done: false },
        { label: 'Cursar Escola de Líderes', done: false }
      ]
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === user.stage);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-zinc-900/50 p-10 md:p-16 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 opacity-5 bg-blue-600 w-96 h-96 rounded-full blur-[100px]" />
        
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-6 flex items-center gap-4">
            <Star className="text-amber-500" fill="currentColor" /> Meu Crescimento
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-12">
            Cada degrau na Escada do Sucesso é uma oportunidade de aprofundar seu relacionamento com Deus e servir ao próximo. Confira o que você já conquistou e o que vem pela frente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-950 p-8 rounded-3xl border border-white/5 flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                <BookOpen size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Cursos Concluídos</p>
                <p className="text-xl font-black text-white">02 de 12</p>
              </div>
            </div>
            <div className="bg-zinc-950 p-8 rounded-3xl border border-white/5 flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <Users size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Frequência Mês</p>
                <p className="text-xl font-black text-white">100% (4 de 4)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {stages.map((stage, idx) => {
          const isCurrent = user.stage === stage.id;
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
                {stage.tasks.map((task, tidx) => (
                  <div key={tidx} className="flex items-start gap-3">
                    <div className={`mt-1 shrink-0 w-4 h-4 rounded-full border ${task.done ? 'bg-blue-500 border-blue-500 flex items-center justify-center' : 'border-zinc-700'}`}>
                      {task.done && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${task.done ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {task.label}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrent && (
                <div className="mt-10 pt-6 border-t border-white/5">
                  <button className="w-full flex items-center justify-between text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] group/btn">
                    Ver detalhes do estágio <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
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
            <h4 className="text-xl font-black text-white uppercase tracking-tighter">Dúvidas sobre seu progresso?</h4>
            <p className="text-zinc-500 text-sm font-medium">Fale com seu discipulador para entender como avançar.</p>
          </div>
        </div>
        <button className="px-10 py-5 bg-white text-zinc-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
          Mandar Mensagem
        </button>
      </div>
    </div>
  );
};

export default MyProgress;
