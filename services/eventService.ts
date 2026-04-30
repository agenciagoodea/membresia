import { supabase } from './supabaseClient';
import { ChurchEvent, UserRole } from '../types';
import { memberService } from './memberService';
import { isUUID } from '../utils/validationUtils';

export const eventService = {
  async getAll(churchId: string, currentUser?: any): Promise<ChurchEvent[]> {
    if (!isUUID(churchId)) {
      console.warn('[DEBUG RBAC] eventService.getAll - churchId inválido:', churchId);
      return [];
    }

    console.log('EVENT_SERVICE_FILTERS', { churchId, userId: currentUser?.id });
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('church_id', churchId);

    // Aplicar Filtros de Hierarquia Pastoral (RBAC)
    if (currentUser) {
      const normalizedRole = (currentUser.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      const isAdmin = ['MASTER ADMIN', 'ADMINISTRADOR DA IGREJA', 'CHURCH_ADMIN', 'MASTER_ADMIN'].includes(normalizedRole);
      const myId = currentUser.id;

      if (!isAdmin && isUUID(myId)) {
        // 1. Obter Ecossistema Ministerial (Recursivo + Conjugal)
        const ecosystemIds = await memberService.getEcosystemIds(myId);
        
        // 2. Pastor e Líder veem o que qualquer membro do ecossistema criou/responsável OU auxilia OU é para sua célula
        const validEcosystemIds = ecosystemIds.filter(id => isUUID(id));
        if (validEcosystemIds.length > 0) {
          const ecosystemFilter = validEcosystemIds.join(',');
          const myCellId = currentUser.cellId || currentUser.cell_id;
          
          let orConditions = [
            `created_by.in.(${ecosystemFilter})`,
            `responsible_pastor_id.in.(${ecosystemFilter})`,
            `coordinator_id.in.(${ecosystemFilter})`,
            `assistant_ids.cs.{${myId}}`
          ];

          if (isUUID(myCellId)) {
            orConditions.push(`cell_ids.cs.{${myCellId}}`);
          }

          query = query.or(orConditions.join(','));
        } else {
          // Se não houver ecossistema, ver apenas publicados
          query = query.eq('is_published', true);
        }
      }
    }

    query = query.order('date', { ascending: true })
      .order('time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[DEBUG RBAC] eventService.getAll - Erro:', error);
      return [];
    }

    console.log('EVENT_SERVICE_RESULT', data?.length || 0);
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
      const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN].includes(currentUser.role);
      const myId = currentUser.id;

      if (!isAdmin) {
        const ecosystemIds = await memberService.getEcosystemIds(myId);
        const ecosystemFilter = ecosystemIds.join(',');
        query = query.or(`created_by.in.(${ecosystemFilter}),responsible_pastor_id.in.(${ecosystemFilter}),coordinator_id.in.(${ecosystemFilter}),assistant_ids.cs.{${myId}}`);
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
