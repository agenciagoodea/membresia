import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Users, DollarSign, Eye, Edit2, Trash2, Link2, Copy, Check, Ticket, Search, Filter } from 'lucide-react';
import { paidEventService } from '../../services/paidEventService';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { PaidEvent, PaidEventStatus, UserRole } from '../../types';
import { canEditPaidEvent, canDeletePaidEvent, canSharePaidEvent } from '../../utils/roleUtils';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Rascunho', color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' },
  published: { label: 'Publicado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  closed: { label: 'Encerrado', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
};

interface PaidEventsListProps {
  user: any;
  onCreateNew: () => void;
  onEdit: (event: PaidEvent) => void;
  onViewRegistrations: (event: PaidEvent) => void;
}

const PaidEventsList: React.FC<PaidEventsListProps> = ({ user, onCreateNew, onEdit, onViewRegistrations }) => {
  const [events, setEvents] = useState<(PaidEvent & { stats?: { total: number; confirmed: number; pending: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const churchId = user.churchId || user.church_id;

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await paidEventService.getAll(churchId, user);
      // Carregar stats de inscrição para cada evento
      const withStats = await Promise.all(
        data.map(async (evt) => {
          try {
            const stats = await paidEventService.getRegistrationStats(evt.id);
            return { ...evt, stats: { total: stats.total, confirmed: stats.confirmed, pending: stats.pending } };
          } catch {
            return { ...evt, stats: { total: 0, confirmed: 0, pending: 0 } };
          }
        })
      );
      setEvents(withStats);
    } catch (error) {
      console.error('Erro ao carregar eventos pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [churchId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento pago? Todas as inscrições serão perdidas.')) return;
    try {
      await paidEventService.delete(id);
      loadEvents();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir evento.');
    }
  };

  const handleCopyLink = (event: PaidEvent) => {
    const link = event.public_link || `${window.location.origin}/#/evento/${event.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Ticket size={20} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Eventos Pagos</h2>
          </div>
          <p className="text-zinc-500 font-medium text-sm ml-[52px]">Gerencie eventos com inscrição e pagamento Pix.</p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:from-violet-700 hover:to-indigo-700 transition-all shadow-xl shadow-violet-500/20"
        >
          <Plus size={18} /> Novo Evento Pago
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3 bg-zinc-900 px-5 py-3 rounded-2xl border border-white/5 flex-1 focus-within:ring-2 focus-within:ring-violet-600 transition-all">
          <Search size={16} className="text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-zinc-200 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-zinc-600" />
          {['all', 'draft', 'published', 'closed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {f === 'all' ? 'Todos' : STATUS_LABELS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-black tracking-[0.5em] animate-pulse text-xs">
          Carregando Eventos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 bg-zinc-900 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center">
          <Ticket size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 font-black tracking-widest uppercase text-sm">Nenhum evento pago encontrado</p>
          <p className="text-zinc-600 text-xs mt-2">Clique em "Novo Evento Pago" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((evt) => {
            const statusInfo = STATUS_LABELS[evt.status] || STATUS_LABELS.draft;
            const canEdit = canEditPaidEvent(user, evt);
            const canDelete = canDeletePaidEvent(user, evt);
            const canShare = canSharePaidEvent(user, evt);
            const canViewRegistrations = canEdit; // Por enquanto, quem edita vê inscritos
            return (
              <div key={evt.id} className="group bg-zinc-900 border border-white/5 hover:border-violet-500/30 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-violet-500/5">
                {/* Banner */}
                <div className="h-40 overflow-hidden relative">
                  <img 
                    src={paidEventRegistrationService.getFileUrl('paid-event-banners', evt.banner_url || '')} 
                    className="w-full h-full object-cover" 
                    alt={evt.title} 
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'; // Fallback
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                  <span className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusInfo.bg} ${statusInfo.color} shadow-lg backdrop-blur-md`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Info */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{evt.title}</h3>

                  <div className="flex flex-wrap gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5">
                      <Calendar size={11} className="text-zinc-400" /> {paidEventRegistrationService.formatEventPeriod(evt.start_date, evt.end_date)}
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5 max-w-[180px] truncate">
                        <MapPin size={11} className="text-zinc-400" /> <span className="truncate">{evt.location}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/20 text-violet-400">
                      <DollarSign size={11} /> {formatCurrency(evt.price)}
                    </span>
                  </div>

                    <div className="flex gap-4">
                      <div className="flex-1 bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                        <p className="text-lg font-black text-white">{evt.stats?.total || 0}</p>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Total</p>
                      </div>
                      <div className="flex-1 bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                        <p className="text-lg font-black text-emerald-400">{evt.stats?.confirmed || 0}</p>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Confirmados</p>
                      </div>
                      <div className="flex-1 bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                        <p className={`text-lg font-black ${evt.max_participants && (evt.max_participants - (evt.stats?.total || 0)) <= 5 ? 'text-rose-400' : 'text-blue-400'}`}>
                          {evt.max_participants ? Math.max(0, evt.max_participants - (evt.stats?.total || 0)) : '∞'}
                        </p>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vagas Livres</p>
                      </div>
                    </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    {canViewRegistrations && (
                      <button onClick={() => onViewRegistrations(evt)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600/20 transition-all">
                        <Users size={14} /> Inscritos
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => onEdit(evt)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-white/5" title="Editar">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canShare && (
                      <>
                        <button onClick={() => {
                          const link = evt.public_link || `${window.location.origin}/#/evento/${evt.slug}`;
                          const text = `Inscreva-se no evento: ${evt.title}\n\nGaranta sua vaga aqui:\n${link}`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }} className={canEdit ? "p-3 bg-zinc-800 hover:bg-emerald-600/20 text-emerald-400 rounded-xl transition-all border border-white/5 hover:border-emerald-500/20" : "flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all"} title="Compartilhar WhatsApp">
                          {canEdit ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp</>}
                        </button>
                        <button onClick={() => handleCopyLink(evt)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-white/5" title="Copiar link">
                          {copiedId === evt.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(evt.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all border border-rose-500/10" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaidEventsList;
