import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, Cell, PrayerRequest, UserRole, CellMeetingException } from '../types';
import { memberService } from '../services/memberService';
import { cellService } from '../services/cellService';
import { prayerService } from '../services/prayerService';
import { eventService } from '../services/eventService';
import { paidEventService } from '../services/paidEventService';
import { cellMeetingService } from '../services/cellMeetingService';
import { churchService } from '../services/churchService';

interface ChurchContextType {
  members: Member[];
  cells: Cell[];
  prayers: PrayerRequest[];
  events: any[];
  paidEvents: any[];
  meetingExceptions: CellMeetingException[];
  church: any | null;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export const ChurchProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [paidEvents, setPaidEvents] = useState<any[]>([]);
  const [meetingExceptions, setMeetingExceptions] = useState<CellMeetingException[]>([]);
  const [church, setChurch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async (options?: { force?: boolean; partial?: 'members' | 'cells' | 'prayers' | 'events' | 'exceptions' }) => {
    const churchId = user?.churchId || user?.church_id;
    const isMaster = user?.role === UserRole.MASTER_ADMIN;

    if (!churchId && !isMaster) {
      setMembers([]);
      setCells([]);
      setPrayers([]);
      setEvents([]);
      setPaidEvents([]);
      setMeetingExceptions([]);
      setLoading(false);
      return;
    }

    if (isMaster) {
      setLoading(false);
      return;
    }

    try {
      if (!options?.partial) setLoading(true);
      
      // Carregar dados da Igreja se ainda não temos ou se for refresh total
      if (!church || !options?.partial) {
        churchService.getById(churchId).then(setChurch).catch(err => console.error('Erro ao carregar igreja:', err));
      }
      
      const promises: Promise<any>[] = [];
      const keys: string[] = [];

      if (!options?.partial || options.partial === 'members') {
        promises.push(memberService.getAll(churchId, undefined, user).catch(() => []));
        keys.push('members');
      }
      if (!options?.partial || options.partial === 'cells') {
        promises.push(cellService.getAll(churchId, user).catch(() => []));
        keys.push('cells');
      }
      if (!options?.partial || options.partial === 'prayers') {
        // Busca as últimas 50 orações para performance inicial
        promises.push(prayerService.getAll(churchId, { from: 0, to: 49 }).catch(() => []));
        keys.push('prayers');
      }
      if (!options?.partial || options.partial === 'events') {
        promises.push(eventService.getAll(churchId, user).catch(() => []));
        keys.push('events');
        promises.push(paidEventService.getAll(churchId, user).catch(() => []));
        keys.push('paidEvents');
      }
      if (!options?.partial || options.partial === 'exceptions') {
        promises.push(cellMeetingService.getExceptions(churchId).catch(() => []));
        keys.push('exceptions');
      }

      const results = await Promise.all(promises);
      
      results.forEach((data, i) => {
        const key = keys[i];
        if (key === 'members') setMembers(data);
        if (key === 'cells') setCells(data);
        if (key === 'prayers') setPrayers(data);
        if (key === 'events') setEvents(data);
        if (key === 'paidEvents') setPaidEvents(data);
        if (key === 'exceptions') setMeetingExceptions(data);
      });

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
    <ChurchContext.Provider value={{ church, members, cells, prayers, events, paidEvents, meetingExceptions, loading, refreshData }}>
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
