
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
import { Cell, MeetingReport, Member } from '../../types';
import { cellService } from '../../services/cellService';

const MyCellDetail: React.FC<{ user: any }> = ({ user }) => {
  const [cell, setCell] = useState<Cell | null>(null);
  const [lastReport, setLastReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (user.cellId) {
          const cells = await cellService.getAll(user.church_id || 'mircentrosul');
          const myCell = cells.find(c => c.id === user.cellId);
          if (myCell) {
            setCell(myCell);
            // Simular busca de relatório
            const reports = await cellService.getReports(myCell.id);
            if (reports && reports.length > 0) {
              setLastReport(reports[0]);
            }
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados da célula:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
          <div className="w-40 h-40 bg-white/20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-md shadow-2xl ring-4 ring-white/10 shrink-0">
            {cell.logo ? (
              <img src={cell.logo} className="w-full h-full object-contain p-4" alt="Cell Logo" />
            ) : (
              <Users size={80} className="text-white" />
            )}
          </div>
          
          <div className="text-center md:text-left">
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none mb-4">{cell.name}</h2>
            <p className="text-blue-100 text-lg font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-3">
              <UserCheck size={20} /> Líder: {cell.hostName}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4">
               <span className="px-5 py-2.5 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/5">
                 {cell.meetingDay} às {cell.meetingTime}
               </span>
               <span className="px-5 py-2.5 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/5">
                 {cell.membersCount} Discípulos
               </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
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
        </div>

        <div className="space-y-10">
          <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity"><MapPin size={200} /></div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Informações de Local</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-zinc-950 rounded-xl text-zinc-500"><Calendar size={18} /></div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Dia e Hora</p>
                   <p className="text-sm font-bold text-white">{cell.meetingDay} às {cell.meetingTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-zinc-950 rounded-xl text-zinc-500"><MapPin size={18} /></div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Endereço da Reunião</p>
                   <p className="text-sm font-bold text-white mb-2">{cell.address}</p>
                   <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-all">Ver no Google Maps</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20">
             <MessageSquare size={32} className="mb-6 opacity-50" />
             <h4 className="text-2xl font-black uppercase tracking-tighter mb-4">Mural de Clamor</h4>
             <p className="text-indigo-100 text-sm leading-relaxed mb-8">Deixe um pedido de oração específico para os irmãos da sua célula clamarem por você.</p>
             <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Escrever no Mural</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCellDetail;
