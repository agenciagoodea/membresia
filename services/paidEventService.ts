import { supabase } from './supabaseClient';
import { PaidEvent, PaidEventStatus } from '../types';

/**
 * Gera slug URL-friendly a partir do título.
 * Ex: "Encontro com Deus" → "encontro-com-deus-a3b2"
 */
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

export const paidEventService = {
  async getAll(churchId: string): Promise<PaidEvent[]> {
    if (!churchId) return [];

    const { data, error } = await supabase
      .from('paid_events')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getBySlug(slug: string): Promise<PaidEvent | null> {
    const { data, error } = await supabase
      .from('paid_events')
      .select('*')
      .eq('slug', slug)
      .eq('status', PaidEventStatus.PUBLISHED)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async getById(id: string): Promise<PaidEvent | null> {
    const { data, error } = await supabase
      .from('paid_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
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
    // Não permitir alterar slug após criação
    delete updateData.slug;
    delete updateData.id;
    delete updateData.created_at;

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

  /**
   * Retorna contagem de inscrições por status para um evento.
   */
  async getRegistrationStats(eventId: string): Promise<{ total: number; confirmed: number; pending: number }> {
    const { data, error } = await supabase
      .from('paid_event_registrations')
      .select('payment_status')
      .eq('event_id', eventId);

    if (error) throw error;

    const rows = data || [];
    return {
      total: rows.length,
      confirmed: rows.filter(r => r.payment_status === 'pago_confirmado').length,
      pending: rows.filter(r => !['pago_confirmado', 'cancelado', 'recusado'].includes(r.payment_status)).length
    };
  }
};
