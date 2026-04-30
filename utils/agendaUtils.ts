import { Cell, ChurchEvent, UserRole, CellMeetingException, PaidEvent } from '../types';
import { isBefore, isAfter, addDays, format, parseISO } from 'date-fns';

const DAYS_MAP: Record<string, number> = {
  'domingo': 0,
  'segunda-feira': 1,
  'terça-feira': 2,
  'quarta-feira': 3,
  'quinta-feira': 4,
  'sexta-feira': 5,
  'sábado': 6,
  'sábado ': 6, // Case for trailing space
};

/**
 * Calculates the next occurrence of a day of the week
 */
export const getNextOccurrence = (dayName: string, time: string = '00:00'): Date => {
  const now = new Date();
  if (!dayName) return now;
  const targetDay = DAYS_MAP[dayName.toLowerCase().trim()] || 0;
  const currentDay = now.getDay();
  
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  
  const [hours, minutes] = time.split(':').map(Number);
  nextDate.setHours(hours || 0, minutes || 0, 0, 0);
  
  return nextDate;
};

/**
 * Generates virtual event objects for a cell's weekly meetings, taking exceptions into account
 */
export const generateCellOccurrences = (
  cell: Cell, 
  exceptions: CellMeetingException[] = [], 
  weeksCount: number = 4
): (Partial<ChurchEvent> & { status?: string, reason?: string })[] => {
  const occurrences: (Partial<ChurchEvent> & { status?: string, reason?: string })[] = [];
  const baseDate = getNextOccurrence(cell.meetingDay, cell.meetingTime);
  
  for (let i = 0; i < weeksCount; i++) {
    const occDate = new Date(baseDate);
    occDate.setDate(baseDate.getDate() + (i * 7));
    const dateStr = occDate.toISOString().split('T')[0];
    
    // Check if there is an exception for this specific date
    const exception = exceptions.find(e => e.cell_id === cell.id && e.original_date === dateStr);
    
    if (exception) {
      if (exception.status === 'CANCELLED') {
        // We still add it but mark as cancelled so the UI can show it if needed, 
        // or we filter it out if we want it completely gone.
        // User requested: "indique o motivo do cancelamento para que seja mostrado e informado a todos"
        // So we keep it with a status.
        occurrences.push({
          id: `cell-${cell.id}-${i}-cancelled`,
          church_id: '',
          title: `CANCELADO: ${cell.name}`,
          description: `Reunião cancelada. Motivo: ${exception.reason || 'Não informado'}`,
          date: dateStr,
          time: cell.meetingTime,
          location: cell.address,
          image_url: cell.logo || '',
          status: 'CANCELLED',
          reason: exception.reason
        });
        continue;
      } else if (exception.status === 'RESCHEDULED') {
        occurrences.push({
          id: `cell-${cell.id}-${i}-rescheduled`,
          church_id: '',
          title: `REAGENDADO: ${cell.name}`,
          description: `Reunião reagendada. Motivo: ${exception.reason || 'Não informado'}`,
          date: exception.new_date || dateStr,
          time: exception.new_time || cell.meetingTime,
          location: cell.address,
          image_url: cell.logo || '',
          status: 'RESCHEDULED',
          reason: exception.reason
        });
        continue;
      }
    }

    occurrences.push({
      id: `cell-${cell.id}-${i}`,
      church_id: '',
      title: `Reunião: ${cell.name}`,
      description: `Reunião semanal da célula na casa de ${cell.hostName}.`,
      date: dateStr,
      time: cell.meetingTime,
      location: cell.address,
      image_url: cell.logo || '',
    });
  }
  
  return occurrences;
};

/**
 * Normaliza qualquer tipo de evento para o formato da Agenda.
 */
export const normalizeEventForAgenda = (item: any, type: 'church_event' | 'cell_event' | 'paid_event' | 'birthday'): any => {
  if (type === 'paid_event') {
    return {
      id: `paid-${item.id}`,
      title: item.title,
      description: item.description,
      date: item.start_date?.split('T')[0],
      endDate: item.end_date?.split('T')[0],
      time: item.start_date?.split('T')[1]?.substring(0, 5),
      location: item.location,
      image_url: item.banner_url,
      type: 'paid_event',
      isSpecial: item.is_featured || false,
      publicLink: item.public_link,
      raw: item
    };
  }
  
  if (type === 'church_event') {
    return {
      ...item,
      type: 'church_event',
      isSpecial: item.is_special || false,
      isPublished: item.is_published !== false,
      raw: item
    };
  }

  return { ...item, type, raw: item };
};

/**
 * Expande eventos que duram múltiplos dias para aparecerem em todas as datas.
 */
export const expandMultiDayEvents = (events: any[]): any[] => {
  const expanded: any[] = [];
  
  events.forEach(event => {
    if (event.endDate && event.endDate !== event.date) {
      try {
        let current = parseISO(event.date);
        const end = parseISO(event.endDate);
        
        while (!isAfter(current, end)) {
          expanded.push({
            ...event,
            date: format(current, 'yyyy-MM-dd'),
            isMultiDayOccurrence: true
          });
          current = addDays(current, 1);
        }
      } catch (e) {
        console.error('Erro ao expandir evento multi-dia:', event.title, e);
        expanded.push(event);
      }
    } else {
      expanded.push(event);
    }
  });
  
  return expanded;
};

/**
 * Filters and merges church events with cell meetings based on user role
 */
export const mergeAgendaItems = (
  events: ChurchEvent[],
  cells: Cell[],
  exceptions: CellMeetingException[],
  paidEvents: PaidEvent[] = [],
  user: any
): (ChurchEvent | any)[] => {
  let filteredCells = cells;

  const isManagement = [
    UserRole.MASTER_ADMIN,
    UserRole.CHURCH_ADMIN,
    UserRole.PASTOR
  ].includes(user?.role);

  if (!isManagement) {
    const myId = user?.id || user?.profile?.id;
    const myCellId = user?.cellId || user?.profile?.cellId;

    if (user?.role === UserRole.CELL_LEADER_DISCIPLE) {
      // Leader sees cells they lead, host, or are members of
      filteredCells = cells.filter(c => 
        c.leaderId === myId || 
        c.hostId === myId || 
        c.id === myCellId
      );
    } else {
      // Member sees only their assigned cell
      filteredCells = cells.filter(c => c.id === myCellId);
    }
  }

  const safeEvents = Array.isArray(events) ? events : [];
  const safeCells = Array.isArray(cells) ? cells : [];
  const safePaidEvents = Array.isArray(paidEvents) ? paidEvents : [];
  const safeExceptions = Array.isArray(exceptions) ? exceptions : [];

  const cellMeetings = filteredCells.flatMap(cell => generateCellOccurrences(cell, safeExceptions)).map(e => normalizeEventForAgenda(e, 'cell_event'));
  const normalizedChurchEvents = safeEvents.map(e => normalizeEventForAgenda(e, 'church_event'));
  const normalizedPaidEvents = safePaidEvents.map(e => normalizeEventForAgenda(e, 'paid_event'));
  
  // Combine
  const combined = [...normalizedChurchEvents, ...cellMeetings, ...normalizedPaidEvents];
  
  // Expand multi-day
  const expanded = expandMultiDayEvents(combined);
  
  // Sort
  return expanded.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });
};
