import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, AlignLeft, CalendarCheck2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { cellService } from '../../services/cellService';
import { paidEventService } from '../../services/paidEventService';
import { ChurchEvent, UserRole, Cell, CellMeetingException, Member, PaidEvent } from '../../types';
import { mergeAgendaItems } from '../../utils/agendaUtils';
import { cellMeetingService } from '../../services/cellMeetingService';
import { Sparkles, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ExternalLink } from 'lucide-react';
import EventModal from './EventModal';
import MonthlyAgenda from '../Member/MonthlyAgenda';
import { memberService } from '../../services/memberService';

const Events = ({ user }: { user: any }) => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [cellAnniversaries, setCellAnniversaries] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const canEdit = [UserRole.MASTER_ADMIN, UserRole.CHURCH_ADMIN, UserRole.PASTOR, UserRole.CELL_LEADER_DISCIPLE, 'ADMIN', 'ADMINISTRADOR_IGREJA'].includes(user.role);

  const canManageEvent = (evt: ChurchEvent) => {
    if ([UserRole.MASTER_ADMIN, UserRole.CHURCH_ADMIN, 'ADMIN', 'ADMINISTRADOR_IGREJA'].includes(user.role)) return true;
    const myId = user.id || user.profile?.id;
    return evt.created_by === myId || 
           evt.responsible_pastor_id === myId || 
           evt.coordinator_id === myId || 
           (evt.assistant_ids || []).includes(myId);
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const churchId = user.churchId || user.church_id;
      
      const results = await Promise.allSettled([
        eventService.getAll(churchId, user),
        cellService.getAll(churchId, user),
        cellMeetingService.getExceptions(churchId),
        memberService.getAll(churchId, undefined, user),
        paidEventService.getAll(churchId, user)
      ]);

      const [eventsRes, cellsRes, exceptionsRes, membersRes, paidEventsRes] = results;

      const eventsData = eventsRes.status === 'fulfilled' ? eventsRes.value : [];
      const cellsData = cellsRes.status === 'fulfilled' ? cellsRes.value : [];
      const exceptionsData = exceptionsRes.status === 'fulfilled' ? exceptionsRes.value : [];
      const membersData = membersRes.status === 'fulfilled' ? membersRes.value : [];
      const paidEventsData = paidEventsRes.status === 'fulfilled' ? paidEventsRes.value : [];

      if (eventsRes.status === 'rejected') console.error('Erro eventos:', eventsRes.reason);
      if (paidEventsRes.status === 'rejected') console.error('Erro eventos pagos:', paidEventsRes.reason);

      setAllMembers(membersData || []);
      setCells(cellsData || []);

      // Lógica de Aniversariantes da Célula
      const currentYear = new Date().getFullYear();
      const myCellId = user.cellId || user.profile?.cellId;
      const cellBdays: any[] = [];

      if (myCellId) {
        const cellMembers = membersData.filter((m: any) => m.cellId === myCellId);
        cellMembers.forEach((m: any) => {
          if (m.birthDate && typeof m.birthDate === 'string' && m.birthDate.includes('-')) {
            const parts = m.birthDate.split('-');
            if (parts.length === 3) {
              const [, bMonth, bDay] = parts;
              cellBdays.push({
                id: `bday-${m.id}`,
                title: `Aniversário: ${m.fullName ? m.fullName.split(' ')[0] : m.name?.split(' ')[0] || 'Membro'}`,
                date: `${currentYear}-${bMonth}-${bDay}`,
                time: '00:00',
                location: 'Célula',
                description: `Aniversário de ${m.fullName || m.name}.`,
                type: 'BIRTHDAY',
                isBirthday: true
              });
            }
          }
        });
      }
      setCellAnniversaries(cellBdays);

      const merged = mergeAgendaItems(eventsData, cellsData, exceptionsData, paidEventsData, user);
      setEvents([...merged, ...cellBdays]);
    } catch (error) {
      console.error('Erro crítico no carregamento da agenda:', error);
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
    if (!dateString || typeof dateString !== 'string') return '';
    const date = new Date(dateString + 'T12:00:00');
    const dayName = date.toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    if (!dateString.includes('-')) return dateString;
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
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

      {/* Destaques / Eventos Especiais */}
      {events.filter(e => e.isSpecial).length > 0 && (
        <div className="relative group mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-amber-400 animate-pulse" size={24} />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Eventos em Destaque</h3>
          </div>
          
          <div className="overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-white/5 shadow-2xl">
            {events.filter(e => e.isSpecial).reduce((acc: any[], curr) => {
               if (!acc.find(a => a.id === curr.id)) acc.push(curr);
               return acc;
            }, []).map((evt, idx) => (
              <div 
                key={evt.id} 
                className={`transition-all duration-700 ${idx === featuredIndex ? 'opacity-100 translate-x-0' : 'hidden'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="h-64 md:h-full relative">
                    <img 
                      src={evt.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'} 
                      className="w-full h-full object-cover"
                      alt={evt.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950" />
                  </div>
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <span className="inline-block px-4 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-6 w-fit">
                      {evt.type === 'paid_event' ? 'Inscrições Abertas' : 'Destaque'}
                    </span>
                    <h4 className="text-3xl font-black text-white uppercase tracking-tight mb-4 leading-tight">
                      {evt.title}
                    </h4>
                    <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8 line-clamp-3 italic">
                      "{evt.description || 'Não perca este evento especial preparado para você.'}"
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      {evt.publicLink && (
                        <a 
                          href={evt.publicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
                        >
                          <ExternalLink size={14} /> Fazer Inscrição
                        </a>
                      )}
                      <button 
                        onClick={() => openEditEvent(evt)}
                        className="px-8 py-4 bg-zinc-900 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {events.filter(e => e.isSpecial).reduce((acc: any[], curr) => {
             if (!acc.find(a => a.id === curr.id)) acc.push(curr);
             return acc;
          }, []).length > 1 && (
            <>
              <button 
                onClick={() => setFeaturedIndex(prev => (prev === 0 ? events.filter(e => e.isSpecial).reduce((acc: any[], curr) => { if (!acc.find(a => a.id === curr.id)) acc.push(curr); return acc; }, []).length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-800"
              >
                <ChevronLeftIcon size={20} />
              </button>
              <button 
                onClick={() => setFeaturedIndex(prev => (prev === events.filter(e => e.isSpecial).reduce((acc: any[], curr) => { if (!acc.find(a => a.id === curr.id)) acc.push(curr); return acc; }, []).length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-800"
              >
                <ChevronRightIcon size={20} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {events.filter(e => e.isSpecial).reduce((acc: any[], curr) => { if (!acc.find(a => a.id === curr.id)) acc.push(curr); return acc; }, []).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${idx === featuredIndex ? 'w-8 bg-amber-500 shadow-lg shadow-amber-500/50' : 'w-2 bg-zinc-800'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mb-10">
        <MonthlyAgenda 
          events={events} 
          user={user} 
          canEdit={canEdit}
          onEdit={openEditEvent}
          canManageEvent={canManageEvent}
        />
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        event={selectedEvent}
        churchId={user.churchId || user.church_id}
        userId={user.id}
        allMembers={allMembers}
        cells={cells}
      />
    </div>
  );
};

export default Events;
