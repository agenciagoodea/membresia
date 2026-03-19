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

interface MonthlyAgendaProps {
  events: (ChurchEvent | any)[];
  user: any;
}

const MonthlyAgenda: React.FC<MonthlyAgendaProps> = ({ events, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'MONTH' | 'LIST'>('MONTH');

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
           >
             <LayoutGrid size={18} />
           </button>
           <button 
             onClick={() => setViewMode('LIST')}
             className={`p-2.5 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
           >
             <List size={18} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* CALENDÁRIO */}
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
                  onClick={() => setSelectedDate(dateStr)}
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
              <div key={evt.id} className="p-6 bg-zinc-950 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group shadow-xl">
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
    </div>
  );
};

export default MonthlyAgenda;
