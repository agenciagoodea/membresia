import { supabase } from './supabaseClient';

export interface SaasSettings {
  id?: string;
  logo_url?: string | null;
  logo_icon_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  site_name?: string;
  landing_title?: string | null;
  landing_subtitle?: string | null;
  landing_description?: string | null;
  landing_cta_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  updated_at?: string;
}

export interface SaasEmailSettings {
  id?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  from_name?: string;
  from_email?: string;
  status?: string;
  last_test_at?: string | null;
}

export interface SaasPaymentSettings {
  id?: string;
  mercado_pago_public_key?: string;
  mercado_pago_access_token?: string;
  mercado_pago_webhook_secret?: string;
  environment?: 'sandbox' | 'production';
  checkout_type?: string;
  status?: string;
}

export interface TermsVersion {
  id?: string;
  version: string;
  content: string;
  created_by?: string;
  created_at?: string;
  force_reaccept?: boolean;
}

export const saasService = {
  async getSettings(): Promise<SaasSettings | null> {
    const { data, error } = await supabase
      .from('saas_settings')
      .select('*')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updateSettings(settings: Partial<SaasSettings>): Promise<SaasSettings> {
    const { data: existing } = await supabase.from('saas_settings').select('id').maybeSingle();
    
    let query;
    if (existing?.id) {
      query = supabase.from('saas_settings').update(settings).eq('id', existing.id).select().single();
    } else {
      query = supabase.from('saas_settings').insert(settings).select().single();
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getEmailSettings(): Promise<SaasEmailSettings | null> {
    const { data, error } = await supabase
      .from('saas_email_settings')
      .select('*')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updateEmailSettings(settings: Partial<SaasEmailSettings>): Promise<SaasEmailSettings> {
    const { data: existing } = await supabase.from('saas_email_settings').select('id').maybeSingle();
    
    let query;
    if (existing?.id) {
      query = supabase.from('saas_email_settings').update(settings).eq('id', existing.id).select().single();
    } else {
      query = supabase.from('saas_email_settings').insert(settings).select().single();
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getPaymentSettings(): Promise<SaasPaymentSettings | null> {
    const { data, error } = await supabase
      .from('saas_payment_settings')
      .select('*')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updatePaymentSettings(settings: Partial<SaasPaymentSettings>): Promise<SaasPaymentSettings> {
    const { data: existing } = await supabase.from('saas_payment_settings').select('id').maybeSingle();
    
    let query;
    if (existing?.id) {
      query = supabase.from('saas_payment_settings').update(settings).eq('id', existing.id).select().single();
    } else {
      query = supabase.from('saas_payment_settings').insert(settings).select().single();
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getTermsHistory(): Promise<TermsVersion[]> {
    const { data, error } = await supabase
      .from('terms_versions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createTermsVersion(version: TermsVersion): Promise<TermsVersion> {
    const { data, error } = await supabase
      .from('terms_versions')
      .insert(version)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async forceTermsReaccept(versionId: string) {
    // 1. Mark terms as forced
    await supabase.from('terms_versions').update({ force_reaccept: true }).eq('id', versionId);
    
    // 2. Mark all users as needing re-acceptance (assuming a column exists in members or similar)
    // For now, we'll just log it or update a global flag in saas_settings
    await supabase.from('saas_settings').update({ updated_at: new Date().toISOString() }).select();
    
    // If members table had pending_terms_acceptance:
    // await supabase.from('members').update({ first_access_completed: false });
  },

  async deleteUserLGPD(userId: string) {
    // Audit log
    await supabase.from('lgpd_requests').insert({
      user_id: userId,
      request_type: 'exclusao',
      status: 'concluido',
      processed_at: new Date().toISOString()
    });

    // Anonymize or delete
    // This depends on the system requirements. Anonymizing is usually safer.
    const { error } = await supabase.from('members').update({
      name: 'Usuário Excluído (LGPD)',
      email: `excluido-${userId}@ecclesia.com`,
      phone: null,
      cpf: null,
      birth_date: null,
      status: 'REJECTED'
    }).eq('user_id', userId);

    if (error) throw error;
  }
};
