
import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  MoreVertical,
  X,
  Plus
} from 'lucide-react';
import { PrayerRequest, PrayerStatus } from '../../types';
import { prayerService } from '../../services/prayerService';

const PrayerHistory: React.FC<{ user: any }> = ({ user }) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PrayerStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadPrayers = async () => {
      try {
        setLoading(true);
        const data = await prayerService.getAll(user.church_id || 'mircentrosul');
        setPrayers(data.filter(p => p.email === user.email));
      } catch (e) {
        console.error("Erro ao carregar orações:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPrayers();
  }, [user]);

  const filteredPrayers = prayers.filter(p => {
    const matchesFilter = filter === 'ALL' || p.status === filter;
    const matchesSearch = p.request.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: PrayerStatus) => {
    switch (status) {
      case PrayerStatus.APPROVED: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case PrayerStatus.IN_PRAYER: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case PrayerStatus.ANSWERED: return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case PrayerStatus.REJECTED: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando seus Clamores...</div>;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Histórico de Pedidos</h2>
          <p className="text-zinc-500 font-medium text-lg italic">Acompanhe suas orações e as vitórias alcançadas.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar em meus pedidos..." 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
              />
           </div>
           <button className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400 hover:text-white transition-all">
              <Filter size={20} />
           </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', ...Object.values(PrayerStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${filter === s ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
          >
            {s === 'ALL' ? 'Todos' : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPrayers.length > 0 ? filteredPrayers.map((p) => (
          <div key={p.id} className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10`}><Heart size={120} /></div>
            
            <div className="flex justify-between items-start mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(p.status)}`}>
                {p.status}
              </span>
              <button className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <MoreVertical size={18} />
              </button>
            </div>

            <p className="text-zinc-300 font-medium italic leading-relaxed text-lg mb-10 min-h-[100px]">
              "{p.request}"
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
               <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <Calendar size={14} className="text-zinc-700" /> {new Date(p.createdAt).toLocaleDateString()}
               </div>
               
               <button className="flex items-center gap-2 text-blue-500 hover:text-white transition-colors">
                  <MessageCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ver Resposta</span>
               </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 bg-zinc-900/50 rounded-[3rem] border border-dashed border-white/10 text-center flex flex-col items-center">
            <Heart size={48} className="text-zinc-800 mb-6" />
            <p className="text-zinc-500 font-black uppercase tracking-[0.2em]">Nenhum pedido de oração encontrado</p>
            <button className="mt-8 flex items-center gap-3 px-8 py-4 bg-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all">
              <Plus size={16} /> Criar Primeiro Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrayerHistory;
