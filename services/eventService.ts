import { supabase } from './supabaseClient';
import { ChurchEvent, UserRole } from '../types';
import { memberService } from './memberService';
import { isUUID } from '../utils/validationUtils';

const mapToFrontend = (row: any): ChurchEvent => {
  if (!row) return null as any;
  return {
    ...row,
    isPublished: row.is_published,
    isSpecial: row.is_special,
    imageUrl: row.image_url,
    cellIds: row.cell_ids || [],
    assistantIds: row.assistant_ids || [],
    responsiblePastorId: row.responsible_pastor_id,
    coordinatorId: row.coordinator_id,
    churchId: row.church_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    endDate: row.end_date
  };
};

export const eventService = {
  async getAll(churchId: string, currentUser?: any): Promise<ChurchEvent[]> {
    if (!isUUID(churchId)) {
      console.warn('[DEBUG RBAC] eventService.getAll - churchId inválido:', churchId);
      return [];
    }

    const myId = currentUser?.id;
    const normalizedRole = (currentUser?.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    
    console.log('EVENT_SERVICE_AUDIT_START', { 
      churchId, 
      userId: myId, 
      role: normalizedRole 
    });
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('church_id', churchId);

    // ── REGRAS DE VISIBILIDADE (RBAC) ─────────────────────────────────────────
    const isMaster = ['MASTER ADMIN', 'MASTER_ADMIN'].includes(normalizedRole);
    const isChurchAdmin = ['ADMINISTRADOR DA IGREJA', 'CHURCH_ADMIN', 'ADMINISTRADOR_IGREJA', 'ADMIN'].includes(normalizedRole);
    const isPastor = normalizedRole === 'PASTOR';
    const isAdmin = isMaster || isChurchAdmin || isPastor;

    if (!isAdmin && isUUID(myId)) {
      // 1. Obter Ecossistema Ministerial
      const ecosystemIds = await memberService.getEcosystemIds(myId);
      const validEcosystemIds = ecosystemIds.filter(id => isUUID(id));
      const myCellId = currentUser.cellId || currentUser.cell_id;
      
      // 2. Construir condições OR (Seguindo regra: Público OR Ecossistema OR Minha Célula)
      let orConditions = [`is_published.eq.true`];
      
      if (validEcosystemIds.length > 0) {
        const ecosystemFilter = validEcosystemIds.join(',');
        orConditions.push(`created_by.in.(${ecosystemFilter})`);
        orConditions.push(`responsible_pastor_id.in.(${ecosystemFilter})`);
        orConditions.push(`coordinator_id.in.(${ecosystemFilter})`);
      }

      if (isUUID(myCellId)) {
        orConditions.push(`cell_ids.cs.{${myCellId}}`);
      }
      
      orConditions.push(`assistant_ids.cs.{${myId}}`);

      query = query.or(orConditions.join(','));
    } else if (!isAdmin) {
      // Se for um usuário sem ID (ex: visitante ou erro de sessão), vê apenas o que é público
      query = query.eq('is_published', true);
    }
    // Admin vê tudo da igreja (já filtrado por church_id acima)

    query = query.order('date', { ascending: true })
      .order('time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[DEBUG RBAC] eventService.getAll - Erro:', error);
      return [];
    }

    const mappedData = (data || []).map(mapToFrontend);
    console.log('EVENT_SERVICE_AUDIT_END', {
      dbCount: data?.length || 0,
      mappedCount: mappedData.length
    });

    return mappedData;
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
      const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN, UserRole.PASTOR].includes(currentUser.role);
      const myId = currentUser.id;

      if (!isAdmin) {
        const ecosystemIds = await memberService.getEcosystemIds(myId);
        const ecosystemFilter = ecosystemIds.join(',');
        query = query.or(`is_published.eq.true,created_by.in.(${ecosystemFilter}),responsible_pastor_id.in.(${ecosystemFilter}),coordinator_id.in.(${ecosystemFilter}),assistant_ids.cs.{${myId}}`);
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

    const mappedData = (data || []).map(mapToFrontend);
    console.log('[DEBUG RBAC] eventService.getUpcoming - Registros retornados:', mappedData.length);
    return mappedData;
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
