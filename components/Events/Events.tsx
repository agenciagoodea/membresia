import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, AlignLeft, CalendarCheck2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { cellService } from '../../services/cellService';
import { ChurchEvent, UserRole, Cell, CellMeetingException } from '../../types';
import { mergeAgendaItems } from '../../utils/agendaUtils';
import { cellMeetingService } from '../../services/cellMeetingService';
import EventModal from './EventModal';
import MonthlyAgenda from '../Member/MonthlyAgenda';
import { memberService } from '../../services/memberService';

const Events = ({ user }: { user: any }) => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [cellAnniversaries, setCellAnniversaries] = useState<any[]>([]);

  const canEdit = [UserRole.MASTER_ADMIN, UserRole.CHURCH_ADMIN, UserRole.PASTOR, UserRole.CELL_LEADER_DISCIPLE].includes(user.role);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const churchId = user.churchId || user.church_id;
      
      const [eventsData, cellsData, exceptionsData, allMembers] = await Promise.all([
        eventService.getAll(churchId),
        cellService.getAll(churchId),
        cellMeetingService.getExceptions(churchId),
        memberService.getAll(churchId)
      ]);

      // Lógica de Aniversariantes da Célula
      const currentYear = new Date().getFullYear();
      const myCellId = user.cellId || user.profile?.cellId;
      const cellBdays: any[] = [];

      if (myCellId) {
        const cellMembers = allMembers.filter(m => m.cellId === myCellId);
        cellMembers.forEach(m => {
          // Membro
          if (m.birthDate) {
            const [bYear, bMonth, bDay] = m.birthDate.split('-');
            cellBdays.push({
              id: `bday-${m.id}`,
              title: `Aniversário: ${m.name.split(' ')[0]}`,
              date: `${currentYear}-${bMonth}-${bDay}`,
              time: '00:00',
              location: 'Célula',
              description: `Aniversário de ${m.name}.`,
              type: 'BIRTHDAY',
              isBirthday: true
            });
          }
          // Filhos do Membro
          if (m.children && Array.isArray(m.children)) {
            m.children.forEach((c: any) => {
              if (c.birthDate) {
                const [cbYear, cbMonth, cbDay] = c.birthDate.split('-');
                cellBdays.push({
                  id: `child-bday-${c.id}`,
                  title: `Aniversário: ${c.name.split(' ')[0]} (Filho(a) de ${m.name.split(' ')[0]})`,
                  date: `${currentYear}-${cbMonth}-${cbDay}`,
                  time: '00:00',
                  location: 'Célula',
                  description: `Aniversário de ${c.name}, dependente de ${m.name}.`,
                  type: 'BIRTHDAY',
                  isBirthday: true
                });
              }
            });
          }
        });
      }
      setCellAnniversaries(cellBdays);

      const merged = mergeAgendaItems(eventsData, cellsData, exceptionsData, user);
      // Incluir aniversários no set de eventos para a listagem se necessário, 
      // mas a MonthlyAgenda cuida de mostrar no calendário.
      setEvents([...merged, ...cellBdays]);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user.churchId, user.church_id]);

  const handleSaveEvent = async (eventData: Partial<ChurchEvent>) => {
    if (selectedEvent) {
      await eventService.update(selectedEvent.id, eventData);
    } else {
      await eventService.create(eventData as any);
    }
    loadEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await eventService.delete(id);
        loadEvents();
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento.');
      }
    }
  };

  const openNewEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const openEditEvent = (evt: ChurchEvent) => {
    setSelectedEvent(evt);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T12:00:00');
    const dayName = date.toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    const [year, month, day] = dateString.split('-');
    return `${dayName}, ${day}/${month}/${year}`;
  };

  // Separa eventos futuros (ou hoje) dos passados
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.date >= todayStr);
  const pastEvents = events.filter(e => e.date < todayStr).reverse(); // Mais recentes primeiro

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Agenda</h2>
          <p className="text-zinc-500 font-medium text-lg italic">Programação e Eventos Ministeriais.</p>
        </div>
        
        {canEdit && (
          <button
            onClick={openNewEvent}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
          >
            <Plus size={18} /> Novo Evento
          </button>
        )}
      </div>

      {user.role === UserRole.MEMBER_VISITOR && (
        <div className="mb-10">
          <MonthlyAgenda events={events} user={user} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <Calendar size={20} className="text-blue-500" />
            <h3 className="text-lg font-black text-white tracking-widest uppercase">Próximos Eventos</h3>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-black tracking-[0.5em] animate-pulse">
              Carregando Agenda...
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-12 bg-zinc-900 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center">
              <CalendarCheck2 size={48} className="text-zinc-800 mb-4" />
              <p className="text-zinc-500 font-black tracking-widest uppercase text-sm">Nenhum evento agendado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map(evt => (
                <div key={evt.id} className="group relative bg-zinc-900 border border-white/5 hover:border-blue-500/30 rounded-[2rem] p-6 transition-all hover:shadow-2xl hover:shadow-blue-500/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-1">
                      {evt.image_url && (
                        <div className="w-24 h-30 shrink-0 rounded-2xl overflow-hidden border border-white/5 shadow-xl aspect-[4/5]">
                          <img src={evt.image_url} className="w-full h-full object-cover" alt={evt.title} />
                        </div>
                      )}
                      
                      <div className="w-20 h-24 shrink-0 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                          {new Date(evt.date + 'T12:00:00').toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}
                        </span>
                        <span className="text-2xl font-black text-blue-500 leading-none">{evt.date.split('-')[2]}</span>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">
                          {new Date(evt.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-xl font-black text-white uppercase tracking-tight">{evt.title}</h4>
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          {evt.time && (
                            <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5">
                              <Clock size={12} className="text-zinc-400" /> {evt.time}
                            </span>
                          )}
                          {evt.location && (
                            <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5 max-w-[2000px] truncate">
                              <MapPin size={12} className="text-zinc-400" /> <span className="truncate">{evt.location}</span>
                            </span>
                          )}
                          {(evt as any).status === 'CANCELLED' && (
                            <span className="flex items-center gap-1.5 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 text-rose-500">
                              CANCELADO
                            </span>
                          )}
                          {(evt as any).status === 'RESCHEDULED' && (
                            <span className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 text-amber-500">
                              REAGENDADO
                            </span>
                          )}
                        </div>
                        {(evt as any).reason && (
                          <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl mt-2">
                            <p className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1 flex items-center gap-2">
                              <AlignLeft size={10} /> Motivo do Cancelamento:
                            </p>
                            <p className="text-xs font-medium text-zinc-300 italic">"{(evt as any).reason}"</p>
                          </div>
                        )}
                        {evt.description && !(evt as any).reason && (
                          <p className="text-sm font-medium text-zinc-400 mt-2 line-clamp-2 pr-12">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {(canEdit && !evt.id.startsWith('cell-') && (user.role === UserRole.MASTER_ADMIN || evt.created_by === user.id || evt.created_by === user.profile?.id)) && (
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity mt-4 md:mt-0">
                        <button onClick={() => openEditEvent(evt)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-white/5">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteEvent(evt.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all border border-rose-500/10 hover:border-rose-500/30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <Clock size={20} className="text-zinc-600" />
            <h3 className="text-lg font-black text-zinc-400 tracking-widest uppercase">Histórico Recente</h3>
          </div>
          
          <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
            {pastEvents.length === 0 ? (
              <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs text-center py-8">Nenhum evento passado</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-white/5">
                {pastEvents.map((evt, i) => (
                  <div key={evt.id} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-zinc-800 border-4 border-zinc-900 flex items-center justify-center z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    </div>
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 group hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">{formatDate(evt.date)}</p>
                          <h4 className="text-sm font-bold text-zinc-300 uppercase leading-snug">{evt.title}</h4>
                        </div>
                         {(canEdit && !evt.id.startsWith('cell-') && (user.role === UserRole.MASTER_ADMIN || evt.created_by === user.id || evt.created_by === user.profile?.id)) && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                            <button onClick={() => openEditEvent(evt)} className="p-1.5 text-zinc-500 hover:text-white">
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        event={selectedEvent}
        churchId={user.churchId || user.church_id}
        userId={user.id}
      />
    </div>
  );
};

export default Events;
