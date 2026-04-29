import { supabase } from './supabaseClient';
import { ChurchEvent } from '../types';

export const eventService = {
  async getAll(churchId: string, currentUser?: any): Promise<ChurchEvent[]> {
    if (!churchId) return [];
    console.log('[DEBUG RBAC] eventService.getAll - Iniciando busca para:', currentUser?.name || 'Sistema');
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('church_id', churchId);

    // Aplicar Filtros de Hierarquia Pastoral (RBAC)
    if (currentUser) {
      const isAdmin = ['CHURCH_ADMIN', 'MASTER_ADMIN', 'ADMINISTRADOR_IGREJA', 'ADMIN'].includes(currentUser.role);
      const myId = currentUser.id;

      if (!isAdmin) {
        // Pastor e Líder veem eventos públicos OU onde são responsáveis
        // Nota: assistant_ids é um array no Postgres, usamos .cs (contains)
        query = query.or(`created_by.eq.${myId},responsible_pastor_id.eq.${myId},coordinator_id.eq.${myId},assistant_ids.cs.{${myId}}`);
      }
    }

    query = query.order('date', { ascending: true })
      .order('time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[DEBUG RBAC] eventService.getAll - Erro:', error);
      throw error;
    }

    console.log('[DEBUG RBAC] eventService.getAll - Registros retornados:', data?.length || 0);
    return data || [];
  },

  async getUpcoming(churchId: string, limit: number = 5, currentUser?: any): Promise<ChurchEvent[]> {
    if (!churchId) return [];
    console.log('[DEBUG RBAC] eventService.getUpcoming - Iniciando busca para:', currentUser?.name || 'Sistema');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('events')
      .select('*')
      .eq('church_id', churchId)
      .gte('date', today);

    // Aplicar Filtros de Hierarquia Pastoral (RBAC)
    if (currentUser) {
      const isAdmin = ['CHURCH_ADMIN', 'MASTER_ADMIN', 'ADMINISTRADOR_IGREJA', 'ADMIN'].includes(currentUser.role);
      const myId = currentUser.id;

      if (!isAdmin) {
        query = query.or(`created_by.eq.${myId},responsible_pastor_id.eq.${myId},coordinator_id.eq.${myId},assistant_ids.cs.{${myId}}`);
      }
    }

    query = query.order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[DEBUG RBAC] eventService.getUpcoming - Erro:', error);
      throw error;
    }

    console.log('[DEBUG RBAC] eventService.getUpcoming - Registros retornados:', data?.length || 0);
    return data || [];
  },

  async uploadPhoto(file: File, churchId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${churchId}/${Math.random()}.${fileExt}`;
    const filePath = `events/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('event-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async create(eventData: Omit<ChurchEvent, 'id' | 'created_at'>): Promise<ChurchEvent> {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...eventData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<ChurchEvent>): Promise<ChurchEvent> {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
