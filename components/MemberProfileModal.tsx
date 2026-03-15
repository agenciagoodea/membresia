
import React from 'react';
import { X, User, Mail, Phone, MapPin, Target, Calendar, CheckCircle2, TrendingUp, Award, Briefcase, Heart, Users, Zap } from 'lucide-react';
import { Member, MeetingReport, LadderStage, UserRole, M12Checkpoint } from '../types';
import { m12Service } from '../services/m12Service';
import { MOCK_TENANT } from '../constants';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  cellReports: MeetingReport[];
  allMembers: Member[];
  cellName?: string;
  ledCellName?: string;
}

const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ isOpen, onClose, member, cellReports, allMembers, cellName, ledCellName }) => {
  if (!isOpen || !member) return null;

  // Cálculo de Frequência (últimos 10 relatórios ou todos se < 10)
  const relevantReports = cellReports.slice(0, 10);
  const presentCount = relevantReports.filter(r => r.presentMemberIds?.includes(member.id)).length;
  const frequency = relevantReports.length > 0 ? (presentCount / relevantReports.length) * 100 : 0;

  const spouse = member.spouseId ? allMembers.find(m => m.id === member.spouseId) : null;

  const [checkpoints, setCheckpoints] = React.useState<M12Checkpoint[]>([]);
  
  React.useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        const data = await m12Service.getCheckpoints(MOCK_TENANT.id);
        setCheckpoints(data);
      } catch (error) {
        console.error('Error fetching checkpoints:', error);
      }
    };
    if (isOpen) fetchCheckpoints();
  }, [isOpen]);

  const getPerformanceData = () => {
    const stageCheckpoints = checkpoints.filter(c => c.stage === member.stage);
    const total = stageCheckpoints.length;
    const completed = (member.completedMilestones || []).filter(m => 
      stageCheckpoints.some(cp => cp.label === m)
    ).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    // Calcular tempo no estágio atual
    const lastStageChange = member.stageHistory?.filter(h => h.stage === member.stage).sort((a,b) => b.date.localeCompare(a.date))[0];
    const daysInStage = lastStageChange ? Math.floor((new Date().getTime() - new Date(lastStageChange.date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return { total, completed, percentage, daysInStage };
  };

  const performance = getPerformanceData();

  const getStageColor = (stage: LadderStage) => {
    switch (stage) {
      case LadderStage.WIN: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case LadderStage.CONSOLIDATE: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case LadderStage.DISCIPLE: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case LadderStage.SEND: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-xl">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-zinc-950 w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        {/* Header/Banner */}
        <div className="relative h-48 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-zinc-900 to-zinc-950" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-black/40 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all z-20 border border-white/10"
          >
            <X size={20} />
          </button>
          
          <div className="absolute -bottom-16 left-10 flex items-end gap-6">
            <div className="relative">
              <img 
                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                className="w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-zinc-950 shadow-2xl"
                alt={member.name}
              />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-zinc-950 text-white shadow-lg">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">{member.name}</h3>
              <div className="flex gap-2">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStageColor(member.stage)}`}>
                  {member.stage}
                </span>
                <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-white/5">
                  {member.role === UserRole.MEMBER_VISITOR ? 'Membro' : member.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-20 p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <TrendingUp size={24} className="text-blue-500 mb-2" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Presença</p>
              <h4 className="text-xl font-black text-white">{Math.round(frequency)}%</h4>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <Calendar size={24} className="text-emerald-500 mb-2" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Engajamento</p>
              <h4 className="text-xl font-black text-white">{frequency > 80 ? 'ALTO' : frequency > 50 ? 'MÉDIO' : 'BAIXO'}</h4>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <Target size={24} className="text-amber-500 mb-2" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Crescimento</p>
              <h4 className="text-xl font-black text-white">Nível {member.stageHistory?.length || 1}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Info Section */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <User size={14} /> Informações Básicas
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-zinc-400">
                  <Mail size={18} className="text-zinc-600" />
                  <span className="text-sm font-medium">{member.email || 'Nenhum e-mail'}</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <Phone size={18} className="text-zinc-600" />
                  <span className="text-sm font-medium">{member.phone || 'Nenhum telefone'}</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <MapPin size={18} className="text-zinc-600" />
                  <span className="text-sm font-medium break-words leading-relaxed">
                    {member.street ? `${member.street}, ${member.number}` : 'Endereço não informado'}
                    {member.neighborhood && <div className="text-[10px] uppercase font-black text-zinc-700 mt-1">{member.neighborhood} - {member.city}/{member.state}</div>}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <Heart size={18} className="text-zinc-600" />
                  <span className="text-sm font-medium">
                    {member.maritalStatus} {spouse ? `(${spouse.name})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* ministerial Section */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Briefcase size={14} /> Jornada Ministerial
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Estágio Atual</p>
                    <p className="text-sm font-black text-white uppercase">{member.stage}</p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Célula Membro</p>
                    <p className="text-sm font-black text-white uppercase">{cellName || 'Sem Célula'}</p>
                  </div>
                </div>
                {ledCellName && (
                  <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Célula Liderada</p>
                      <p className="text-sm font-black text-white uppercase">{ledCellName}</p>
                    </div>
                  </div>
                )}
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Origem</p>
                    <p className="text-sm font-black text-white uppercase">{member.origin}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Section & Performance Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Award size={14} /> Conquistas na Visão M12
              </h4>
              <div className="flex flex-wrap gap-2">
                {(member.completedMilestones || []).length > 0 ? (
                  member.completedMilestones?.map((milestone, i) => {
                    const cp = checkpoints.find(c => c.label === milestone);
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <CheckCircle2 size={12} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{milestone}</span>
                        {cp?.isRequired && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" title="Obrigatório" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-zinc-600 uppercase font-black italic">Nenhuma conquista registrada ainda.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Zap size={14} /> Análise de Performance
              </h4>
              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Conclusão do Nível</span>
                    <span className="text-xs font-black text-white">{Math.round(performance.percentage)}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${performance.percentage}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Tempo no Nível</p>
                    <p className="text-sm font-black text-white">{performance.daysInStage} dias</p>
                  </div>
                  <div className="bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Checkpoints</p>
                    <p className="text-sm font-black text-white">{performance.completed}/{performance.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline - Simplified Presence */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <TrendingUp size={14} /> Histórico de Presença (Últimos Encontros)
            </h4>
            <div className="flex gap-2">
              {relevantReports.map((r, i) => {
                const isPresent = r.presentMemberIds?.includes(member.id);
                return (
                  <div 
                    key={i} 
                    className={`flex-1 h-3 rounded-full transition-all duration-500 border ${
                      isPresent ? 'bg-emerald-500 border-emerald-400/30' : 'bg-zinc-800 border-white/5'
                    }`}
                    title={`${new Date(r.date).toLocaleDateString('pt-BR')}: ${isPresent ? 'Presente' : 'Faltou'}`}
                  />
                )
              })}
              {relevantReports.length === 0 && (
                <p className="text-[10px] text-zinc-600 uppercase font-black italic">Nenhum relatório processado ainda.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-zinc-950/50 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl"
          >
            Fechar Perfil
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;
