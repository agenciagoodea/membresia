import { Cell, ChurchEvent, UserRole, CellMeetingException } from '../types';

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
 * Filters and merges church events with cell meetings based on user role
 */
export const mergeAgendaItems = (
  events: ChurchEvent[],
  cells: Cell[],
  exceptions: CellMeetingException[],
  user: any
): (ChurchEvent | any)[] => {
  let filteredCells = cells;

  const isManagement = [
    UserRole.MASTER_ADMIN,
    UserRole.CHURCH_ADMIN,
    UserRole.PASTOR
  ].includes(user?.role);

  if (!isManagement) {
    if (user?.role === UserRole.CELL_LEADER_DISCIPLE) {
      // Leader sees cells they lead
      filteredCells = cells.filter(c => c.leaderId === user.id);
    } else {
      // Member sees only their assigned cell
      filteredCells = cells.filter(c => c.id === user.cellId);
    }
  }

  const cellMeetings = filteredCells.flatMap(cell => generateCellOccurrences(cell, exceptions));
  
  // Combine and sort
  const combined = [...events, ...cellMeetings];
  return combined.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });
};
