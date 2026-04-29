
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Camera, 
  MessageSquare,
  TrendingUp,
  Heart,
  Baby,
  Activity,
  UserCheck
} from 'lucide-react';
import { Cell, MeetingReport, Member, UserRole } from '../../types';
import { cellService } from '../../services/cellService';
import { memberService } from '../../services/memberService';

const MyCellDetail: React.FC<{ user: any }> = ({ user }) => {
  const [cell, setCell] = useState<Cell | null>(null);
  const [leaders, setLeaders] = useState<Member[]>([]);
  const [membersCount, setMembersCount] = useState(0);
  const [lastReport, setLastReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const churchId = user?.churchId || user?.church_id;
    if (!churchId) return;
    const cellId = user?.cellId;
    if (!churchId || !cellId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const cells = await cellService.getAll(churchId, user);
        const myCell = cells.find(c => c.id === cellId);
        if (myCell && !cancelled) {
          setCell(myCell);
          const reports = await cellService.getReports(myCell.id);
          if (reports?.length > 0 && !cancelled) {
            setLastReport(reports[0]);
          }

          // Buscar Membros da Célula & Líderes
          const membersData = await memberService.getAll(churchId, undefined, user);
          const cellMembers = membersData.filter(m => m.cellId === cellId);
          if (!cancelled) setMembersCount(cellMembers.length);

          const leaderIds = Array.from(new Set([myCell.leaderId, ...(myCell.leaderIds || [])].filter(Boolean)));
          const cellLeaders = membersData.filter(m => leaderIds.includes(m.id || ''));
          if (!cancelled) setLeaders(cellLeaders);
        }
      } catch (e) {
        if (!cancelled) console.error("Erro ao carregar dados da célula:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user?.church_id, user?.cellId]);

  if (loading) {
    return <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando com sua Célula...</div>;
  }

  if (!cell) {
    return (
      <div className="bg-zinc-900 shadow-2xl rounded-[3rem] p-16 text-center border border-white/5">
        <Users size={64} className="mx-auto text-zinc-800 mb-8" />
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Você ainda não está em uma célula</h3>
        <p className="text-zinc-500 max-w-md mx-auto">Procure um líder ou pastor para ser inserido em uma comunidade e crescer na fé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-blue-600 p-12 md:p-16 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10"><Users size={300} /></div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl ring-4 ring-white/10 shrink-0 overflow-hidden">
            {cell.logo ? (
              <img src={cell.logo} className="w-full h-full object-cover" alt="Cell Logo" />
            ) : (
              <Users size={80} className="text-white/20" />
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none mb-6">{cell.name}</h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mb-10">
              {leaders.map(leader => (
                <div key={leader.id} className="flex items-center gap-4 bg-white/10 p-4 pr-6 rounded-[2rem] border border-white/10 hover:bg-white/20 transition-all group backdrop-blur-md">
                  <div className="relative">
                    <img src={leader.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.name)}`} className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-xl object-cover" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white border-2 border-blue-600 shadow-lg">
                      <Heart size={12} fill="currentColor" />
                    </div>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest leading-none mb-2">
                       {leader.role === UserRole.PASTOR ? 'Pastor' : 'Líder de Célula'}
                    </p>
                    <p className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-3 truncate max-w-[150px]">{leader.name}</p>
                    {leader.phone && (
                      <a 
                        href={`https://wa.me/55${leader.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all w-fit"
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <span className="px-5 py-2.5 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/5 flex items-center gap-2">
                 <Calendar size={14} className="text-blue-200" /> {cell.meetingDay} às {cell.meetingTime}
               </span>
               <span className="px-5 py-2.5 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/5 flex items-center gap-2">
                 <Users size={14} className="text-blue-200" /> {membersCount} Discípulos
               </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="bg-zinc-900 p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Último Relatório da Reunião
           </h3>

           {lastReport ? (
             <div className="space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 text-center">
                     <Activity size={24} className="mx-auto text-blue-500 mb-2" />
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Presentes</p>
                     <p className="text-xl font-black text-white">{lastReport.presentMemberIds.length}</p>
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 text-center">
                     <Heart size={24} className="mx-auto text-rose-500 mb-2" />
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Visitantes</p>
                     <p className="text-xl font-black text-white">{lastReport.visitorCount}</p>
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 text-center">
                     <Baby size={24} className="mx-auto text-amber-500 mb-2" />
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Crianças</p>
                     <p className="text-xl font-black text-white">{lastReport.childrenCount}</p>
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-white/5 text-center">
                     <div className="mx-auto text-emerald-500 mb-2 font-black text-lg">R$</div>
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ofertado</p>
                     <p className="text-xl font-black text-white">R$ {lastReport.offeringAmount}</p>
                  </div>
                </div>

                <div className="p-8 bg-zinc-950 rounded-[2rem] border border-white/5 italic text-zinc-300 leading-relaxed text-lg">
                  "{lastReport.report}"
                </div>

                {lastReport.photoUrl && (
                  <div className="rounded-[2rem] overflow-hidden border border-white/5">
                    <img src={lastReport.photoUrl} className="w-full h-96 object-cover" alt="Foto da Célula" />
                  </div>
                )}
             </div>
           ) : (
             <div className="py-12 bg-zinc-950/50 rounded-[2rem] border border-dashed border-white/10 text-center">
               <p className="text-zinc-500 font-black uppercase tracking-widest">Aguardando novo relatório do líder</p>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity"><MapPin size={200} /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
              <MapPin size={24} className="text-blue-500" /> Informações de Local
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-zinc-950 rounded-xl text-zinc-500 shrink-0"><Calendar size={20} /></div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Dia e Hora</p>
                   <p className="text-base font-bold text-white">{cell.meetingDay} às {cell.meetingTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-4 bg-zinc-950 rounded-xl text-zinc-500 shrink-0"><MapPin size={20} /></div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Endereço da Reunião</p>
                   <p className="text-base font-bold text-white mb-2 leading-relaxed">{cell.address}</p>
                   <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-all">Ver no Google Maps</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-500/20 flex flex-col justify-between">
             <div className="mb-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 shadow-lg">
                <Heart size={32} className="text-white" />
              </div>
              <h4 className="text-3xl font-black uppercase tracking-tighter mb-4">Pedidos de Oração</h4>
              <p className="text-blue-100 text-base leading-relaxed font-medium">Deixe sua solicitação para que os irmãos da sua célula e pastores possam interceder por você hoje.</p>
             </div>
             <button 
              onClick={() => window.location.hash = '/app/prayer-request-new'}
              className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
              Solicitar Oração
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCellDetail;
