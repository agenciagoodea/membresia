import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, AlignLeft, CalendarCheck2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { eventService } from '../../services/eventService';
import { cellService } from '../../services/cellService';
import { ChurchEvent, UserRole, Cell, CellMeetingException, Member } from '../../types';
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
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);

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
      
      const [eventsData, cellsData, exceptionsData, membersData] = await Promise.all([
        eventService.getAll(churchId, user),
        cellService.getAll(churchId, user),
        cellMeetingService.getExceptions(churchId),
        memberService.getAll(churchId, undefined, user)
      ]);

      setAllMembers(membersData || []);
      setCells(cellsData || []);

      // Lógica de Aniversariantes da Célula
      const currentYear = new Date().getFullYear();
      const myCellId = user.cellId || user.profile?.cellId;
      const cellBdays: any[] = [];

      if (myCellId) {
        const cellMembers = membersData.filter(m => m.cellId === myCellId);
        cellMembers.forEach(m => {
          // Membro
          if (m.birthDate && typeof m.birthDate === 'string' && m.birthDate.includes('-')) {
            const parts = m.birthDate.split('-');
            if (parts.length === 3) {
              const [bYear, bMonth, bDay] = parts;
              cellBdays.push({
                id: `bday-${m.id}`,
                title: `Aniversário: ${m.fullName ? m.fullName.split(' ')[0] : m.name?.split(' ')[0] || 'Membro'}`,
                date: `${currentYear}-${bMonth}-${bDay}`,
              time: '00:00',
              location: 'Célula',
              description: `Aniversário de ${m.name}.`,
              type: 'BIRTHDAY',
              isBirthday: true
              });
            }
          }
          // Filhos do Membro
          if (m.children && Array.isArray(m.children)) {
            m.children.forEach((c: any) => {
              if (c.birthDate && typeof c.birthDate === 'string' && c.birthDate.includes('-')) {
                const parts = c.birthDate.split('-');
                if (parts.length === 3) {
                  const [cbYear, cbMonth, cbDay] = parts;
                  cellBdays.push({
                    id: `child-bday-${c.id}`,
                    title: `Aniversário: ${c.name?.split(' ')[0] || 'Filho'} (Filho(a) de ${m.fullName ? m.fullName.split(' ')[0] : m.name?.split(' ')[0] || 'Membro'})`,
                    date: `${currentYear}-${cbMonth}-${cbDay}`,
                  time: '00:00',
                  location: 'Célula',
                  description: `Aniversário de ${c.name}, dependente de ${m.name}.`,
                  type: 'BIRTHDAY',
                  isBirthday: true
                  });
                }
              }
            });
          }
        });
      }
      setCellAnniversaries(cellBdays);

      const merged = mergeAgendaItems(eventsData, cellsData, exceptionsData, user);
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
