import { supabase } from './supabaseClient';
import { PaidEvent, PaidEventStatus } from '../types';
import { memberService } from './memberService';
import { isUUID } from '../utils/validationUtils';

export interface PaidEventStats {
  event_id: string;
  status: string;
  max_participants: number | null;
  total_active: number;
  total_confirmed: number;
  total_pending: number;
  spots_left: number | null;
  is_sold_out: boolean;
}

function generateSlug(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

function getDisplayName(memberRow: any): string {
  return String(memberRow?.full_name || memberRow?.name || '').trim();
}

function mapTeamNamesFromRows(
  event: PaidEvent,
  memberRowsById: Map<string, { full_name?: string; name?: string }>
): PaidEvent {
  const coordinatorId = event.coordenador_id || '';
  const coordinatorRow = coordinatorId ? memberRowsById.get(coordinatorId) : null;
  const coordinatorName = coordinatorRow ? getDisplayName(coordinatorRow) : '';

  const auxiliarNames = (event.auxiliares_ids || [])
    .map((id) => getDisplayName(memberRowsById.get(id)))
    .filter(Boolean);

  return {
    ...event,
    coordenador_nome: coordinatorName || undefined,
    auxiliares_nomes: auxiliarNames.length > 0 ? auxiliarNames : undefined,
  };
}

async function enrichEventsWithTeamNames(events: PaidEvent[]): Promise<PaidEvent[]> {
  if (!events?.length) return events;

  const ids = Array.from(
    new Set(
      events.flatMap((event) => [
        ...(event.coordenador_id ? [event.coordenador_id] : []),
        ...((event.auxiliares_ids || []).filter(Boolean)),
      ])
    )
  ).filter(isUUID);

  if (!ids.length) return events;

  const { data, error } = await supabase
    .from('members')
    .select('id,full_name,name')
    .in('id', ids);

  if (error) {
    console.warn('Não foi possível carregar nomes da equipe do evento:', error);
    return events;
  }

  const membersById = new Map<string, { full_name?: string; name?: string }>(
    (data || []).map((member: any) => [member.id, member])
  );

  return events.map((event) => mapTeamNamesFromRows(event, membersById));
}

async function enrichEventWithTeamNames(event: PaidEvent): Promise<PaidEvent> {
  const [enriched] = await enrichEventsWithTeamNames([event]);
  return enriched || event;
}

async function getPublicTeamNamesBySlug(slug: string): Promise<{ coordenador_nome?: string; auxiliares_nomes?: string[] }> {
  const { data, error } = await supabase.rpc('get_paid_event_public_team_by_slug', {
    target_slug: slug,
  });

  if (error) {
    console.warn('RPC pública da equipe do evento indisponível:', error);
    return {};
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return {};

  const coordinatorName = String(row.coordinator_name || '').trim();
  const auxiliaryNames = Array.isArray(row.auxiliary_names)
    ? row.auxiliary_names.map((value: any) => String(value || '').trim()).filter(Boolean)
    : [];

  return {
    coordenador_nome: coordinatorName || undefined,
    auxiliares_nomes: auxiliaryNames.length > 0 ? auxiliaryNames : undefined,
  };
}

function normalizeStatsRow(row: any): PaidEventStats | null {
  if (!row) return null;
  return {
    event_id: String(row.event_id || ''),
    status: String(row.status || ''),
    max_participants: row.max_participants ?? null,
    total_active: Number(row.total_active || 0),
    total_confirmed: Number(row.total_confirmed || 0),
    total_pending: Number(row.total_pending || 0),
    spots_left: row.spots_left === null || row.spots_left === undefined ? null : Number(row.spots_left),
    is_sold_out: Boolean(row.is_sold_out),
  };
}

export const paidEventService = {
  async getAll(churchId: string, currentUser?: any): Promise<PaidEvent[]> {
    if (!isUUID(churchId)) {
      console.warn('[DEBUG RBAC] paidEventService.getAll - churchId inválido:', churchId);
      return [];
    }

    console.log('PAID_EVENT_SERVICE_FILTERS', { churchId, userId: currentUser?.id });

    let query = supabase
      .from('paid_events')
      .select('*')
      .eq('church_id', churchId);

    if (currentUser) {
      const role = (currentUser.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      const isAdmin = ['MASTER ADMIN', 'ADMINISTRADOR DA IGREJA', 'CHURCH_ADMIN', 'MASTER_ADMIN', 'PASTOR', 'PASTORA'].includes(role);
      const myId = currentUser.id;

      if (!isAdmin && isUUID(myId)) {
        const ecosystemIds = await memberService.getEcosystemIds(myId);
        const validEcosystemIds = ecosystemIds.filter(id => isUUID(id));

        let orConditions = 'status.eq.published,status.eq.closed';
        if (validEcosystemIds.length > 0) {
          const ecosystemFilter = validEcosystemIds.join(',');
          orConditions += `,created_by.in.(${ecosystemFilter}),coordenador_id.in.(${ecosystemFilter}),auxiliares_ids.cs.{${myId}}`;
        } else {
          orConditions += `,created_by.eq.${myId},coordenador_id.eq.${myId},auxiliares_ids.cs.{${myId}}`;
        }
        query = query.or(orConditions);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('[DEBUG RBAC] paidEventService.getAll - Erro:', error);
      return [];
    }

    console.log('PAID_EVENT_SERVICE_RESULT', data?.length || 0);
    return enrichEventsWithTeamNames(data || []);
  },

  async getBySlug(slug: string): Promise<PaidEvent | null> {
    const { data, error } = await supabase
      .from('paid_events')
      .select('*')
      .eq('slug', slug)
      .in('status', [PaidEventStatus.PUBLISHED, PaidEventStatus.CLOSED])
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const publicTeam = await getPublicTeamNamesBySlug(slug);
    if (publicTeam.coordenador_nome || (publicTeam.auxiliares_nomes || []).length > 0) {
      return { ...data, ...publicTeam };
    }

    return enrichEventWithTeamNames(data);
  },

  async getById(id: string): Promise<PaidEvent | null> {
    const { data, error } = await supabase
      .from('paid_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return enrichEventWithTeamNames(data);
  },

  async create(eventData: Omit<PaidEvent, 'id' | 'created_at' | 'updated_at' | 'slug' | 'public_link'>): Promise<PaidEvent> {
    const slug = generateSlug(eventData.title);
    const public_link = `${window.location.origin}/#/evento/${slug}`;

    const { data, error } = await supabase
      .from('paid_events')
      .insert([{
        ...eventData,
        slug,
        public_link
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PaidEvent>): Promise<PaidEvent> {
    const updateData: any = { ...updates, updated_at: new Date().toISOString() };
    delete updateData.slug;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by;
    delete updateData.church_id;
    delete updateData.public_link;

    const { data, error } = await supabase
      .from('paid_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('paid_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadBanner(file: File, churchId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${churchId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('event-banners')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('event-banners')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async getRegistrationStats(eventId: string): Promise<{ total: number; confirmed: number; pending: number }> {
    const statsFromRpc = await this.getEventStats(eventId);
    if (statsFromRpc) {
      const stats = {
        total: statsFromRpc.total_active,
        confirmed: statsFromRpc.total_confirmed,
        pending: statsFromRpc.total_pending
      };
      console.log('PAID_EVENT_CARD_STATS_RPC', stats);
      return stats;
    }

    const { data, error } = await supabase
      .from('paid_event_registrations')
      .select('payment_status')
      .eq('event_id', eventId);

    if (error) throw error;

    const rows = data || [];
    const confirmedStatuses = ['PAGO', 'PAID', 'CONFIRMADO', 'CONFIRMED', 'APROVADO', 'APPROVED', 'pago_confirmado'];
    const invalidStatuses = ['CANCELADO', 'CANCELLED', 'RECUSADO', 'REJECTED', 'recusado', 'cancelado'];

    const confirmed = rows.filter(r => confirmedStatuses.includes((r.payment_status || '').toUpperCase()) || r.payment_status === 'pago_confirmado').length;
    const pending = rows.filter(r =>
      !confirmedStatuses.includes((r.payment_status || '').toUpperCase()) &&
      !invalidStatuses.includes((r.payment_status || '').toUpperCase()) &&
      r.payment_status !== 'pago_confirmado'
    ).length;

    const stats = { total: rows.length, confirmed, pending };
    console.log('PAID_EVENT_CARD_STATS_FALLBACK', stats);
    return stats;
  },

  async getEventStats(eventId: string): Promise<PaidEventStats | null> {
    if (!eventId) return null;
    const { data, error } = await supabase.rpc('get_paid_event_stats', {
      target_event_id: eventId,
      target_slug: null,
    });

    if (error) {
      console.warn('RPC de stats do evento indisponível (eventId):', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return normalizeStatsRow(row);
  },

  async getPublicStatsBySlug(slug: string): Promise<PaidEventStats | null> {
    if (!slug) return null;
    const { data, error } = await supabase.rpc('get_paid_event_stats', {
      target_event_id: null,
      target_slug: slug,
    });

    if (error) {
      console.warn('RPC pública de stats do evento indisponível (slug):', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return normalizeStatsRow(row);
  }
};
