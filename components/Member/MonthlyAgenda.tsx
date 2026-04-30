import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Search,
  LayoutGrid,
  List,
  Filter,
  X
} from 'lucide-react';
import { ChurchEvent } from '../../types';
import EventDetailsModal from '../Events/EventDetailsModal';

interface MonthlyAgendaProps {
  events: (ChurchEvent | any)[];
  user: any;
  canEdit?: boolean;
  onEdit?: (event: any) => void;
  canManageEvent?: (event: any) => boolean;
}

const MonthlyAgenda: React.FC<MonthlyAgendaProps> = ({ events, user, canEdit, onEdit, canManageEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'MONTH' | 'LIST'>('MONTH');
  const [isDayPopupOpen, setIsDayPopupOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    // Espaços vazios para o início do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [month, year, firstDayOfMonth, daysInMonth]);

  const getEventsForDate = (day: number | null) => {
    if (day === null) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(e => e.date === selectedDate);
  }, [selectedDate, events]);

  // WEEK VIEW LOGIC
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.getFullYear(), today.getMonth(), diff);
  });

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number | null) => {
    if (day === null) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDate === dateStr;
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
            <CalendarIcon size={16} /> Agenda Mensal
          </div>
          <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Seus Eventos</h3>
          <p className="text-zinc-500 text-sm font-medium">Acompanhe a programação da igreja e da sua célula.</p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-2xl border border-white/5">
           <button 
             onClick={() => setViewMode('MONTH')}
             className={`p-2.5 rounded-xl transition-all ${viewMode === 'MONTH' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
             title="Visão Mensal"
           >
             <LayoutGrid size={18} />
           </button>
           <button 
             onClick={() => setViewMode('LIST')}
             className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
             title="Visão Semanal"
           >
             <List size={18} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* CALENDÁRIO */}
        {viewMode === 'MONTH' && (
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-black text-white uppercase tracking-tight">
              {monthNames[month]} <span className="text-blue-500">{year}</span>
            </h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center py-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';

              return (
                <button
                  key={idx}
                  disabled={day === null}
                  onClick={() => {
                    setSelectedDate(dateStr);
                  }}
                  className={`
                    relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border
                    ${day === null ? 'opacity-0' : 'hover:border-blue-500/50 group cursor-pointer'}
                    ${isSelected(day) ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white' : 'bg-zinc-950 border-white/5 text-zinc-400'}
                    ${isToday(day) && !isSelected(day) ? 'ring-2 ring-blue-500/30' : ''}
                  `}
                >
                  <span className={`text-sm font-black ${isSelected(day) ? 'text-white' : 'group-hover:text-white'}`}>{day}</span>
                  {hasEvents && (
                    <div className="absolute bottom-2 flex gap-1 items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-blue-500 animate-pulse'}`} />
                      {dayEvents.length > 1 && <span className={`text-[8px] font-black ${isSelected(day) ? 'text-blue-100' : 'text-zinc-500'}`}>+{dayEvents.length - 1}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* CALENDÁRIO SEMANAL */}
        {viewMode === 'LIST' && (
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-black text-white uppercase tracking-tight">
              {monthNames[currentWeekStart.getMonth()]} <span className="text-blue-500">{currentWeekStart.getFullYear()}</span>
            </h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevWeek}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNextWeek}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all border border-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center py-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                {day}
              </div>
            ))}
            {weekDays.map((d, idx) => {
              const dYear = d.getFullYear();
              const dMonth = d.getMonth() + 1;
              const dDay = d.getDate();
              const dateStr = `${dYear}-${String(dMonth).padStart(2, '0')}-${String(dDay).padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              const hasEvents = dayEvents.length > 0;
              const isTodayDate = new Date().toISOString().split('T')[0] === dateStr;
              const isSel = selectedDate === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative aspect-[3/4] rounded-2xl flex flex-col items-center justify-start py-4 transition-all border group cursor-pointer
                    ${isSel ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white' : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-blue-500/50'}
                    ${isTodayDate && !isSel ? 'ring-2 ring-blue-500/30' : ''}
                  `}
                >
                  <span className={`text-sm font-black mb-2 ${isSel ? 'text-white' : 'group-hover:text-white'}`}>{dDay}</span>
                  {hasEvents && (
                    <div className="flex flex-col gap-1 w-full px-2 overflow-hidden items-center">
                      <div className={`w-2 h-2 rounded-full ${isSel ? 'bg-white' : 'bg-blue-500 animate-pulse'} mb-1`} />
                      {dayEvents.slice(0, 2).map((e, i) => (
                        <div key={i} className={`w-full h-1 rounded-full ${isSel ? 'bg-white/50' : 'bg-blue-500/30'}`} />
                      ))}
                      {dayEvents.length > 2 && <span className={`text-[8px] font-black mt-1 ${isSel ? 'text-blue-100' : 'text-zinc-500'}`}>+{dayEvents.length - 2}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* EVENTOS DO DIA */}
        <div className="lg:col-span-5 border-l border-white/5 pl-0 lg:pl-10">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
              {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Selecione um dia'}
            </h4>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
            {selectedDayEvents.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-700 text-center">
                <CalendarIcon size={48} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">Nenhum evento para esta data</p>
              </div>
            ) : selectedDayEvents.map(evt => (
              <div 
                key={evt.id} 
                onClick={() => {
                  setSelectedEventDetails(evt);
                  setIsDetailsModalOpen(true);
                  console.log('EVENT_CLICKED_DETAILS', evt);
                }}
                className="p-6 bg-zinc-950 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group shadow-xl cursor-pointer"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0 border border-blue-500/20">
                    <Clock size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{evt.time || 'Horário a definir'}</p>
                    <h5 className="text-md font-black text-white uppercase tracking-tight truncate mb-2">{evt.title}</h5>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">
                      <MapPin size={12} className="shrink-0" /> {evt.location || 'Local a definir'}
                    </div>
                  </div>
                  {canEdit && canManageEvent && canManageEvent(evt) && onEdit && !evt.id.toString().startsWith('bday-') && !evt.id.toString().startsWith('child-bday-') && !evt.id.toString().startsWith('cell-') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(evt); }}
                      className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-white/5 shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {evt.description && (
                   <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2 italic">"{evt.description}"</p>
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <EventDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEventDetails}
      />
    </div>
  );
};

export default MonthlyAgenda;
