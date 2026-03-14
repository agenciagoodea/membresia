import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, Cell, PrayerRequest, UserRole, CellMeetingException } from '../types';
import { memberService } from '../services/memberService';
import { cellService } from '../services/cellService';
import { prayerService } from '../services/prayerService';
import { eventService } from '../services/eventService';
import { cellMeetingService } from '../services/cellMeetingService';

interface ChurchContextType {
  members: Member[];
  cells: Cell[];
  prayers: PrayerRequest[];
  events: any[];
  meetingExceptions: CellMeetingException[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export const ChurchProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [meetingExceptions, setMeetingExceptions] = useState<CellMeetingException[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const churchId = user?.churchId || user?.church_id;
    const isMaster = user?.role === UserRole.MASTER_ADMIN;

    // Se não houver churchId e não for master, não há dados para carregar (ex: visitante sem vínculo)
    if (!churchId && !isMaster) {
      setMembers([]);
      setCells([]);
      setPrayers([]);
      setEvents([]);
      setMeetingExceptions([]);
      setLoading(false);
      return;
    }

    // Se for master, talvez queira carregar tudo, mas por enquanto o Dashboard Master é estático
    // ou carrega do churchService. Criado para centralizar o que hoje é espalhado.
    if (isMaster) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [membersData, cellsData, prayersData, eventsData, exceptionsData] = await Promise.all([
        memberService.getAll(churchId).catch(() => []),
        cellService.getAll(churchId).catch(() => []),
        prayerService.getAll(churchId).catch(() => []),
        eventService.getAll(churchId).catch(() => []),
        cellMeetingService.getExceptions(churchId).catch(() => [])
      ]);

      setMembers(membersData);
      setCells(cellsData);
      setPrayers(prayersData);
      setEvents(eventsData);
      setMeetingExceptions(exceptionsData);
    } catch (error) {
      console.error('Erro ao sincronizar dados da igreja:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.churchId, user?.church_id, user?.role]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <ChurchContext.Provider value={{ members, cells, prayers, events, meetingExceptions, loading, refreshData }}>
      {children}
    </ChurchContext.Provider>
  );
};

export const useChurch = () => {
  const context = useContext(ChurchContext);
  if (context === undefined) {
    throw new Error('useChurch deve ser usado dentro de um ChurchProvider');
  }
  return context;
};
