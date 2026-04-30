import { supabase } from './supabaseClient';

const FIXED_ID = '00000000-0000-0000-0000-000000000001';

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

export interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  body: string;
  updated_at?: string;
}

const sanitize = (obj: any) => {
  const clean: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    clean[k] = v === '' ? null : v;
  }
  return clean;
};

export const saasService = {
  // === SETTINGS (Tema/Branding) ===
  async getSettings(): Promise<SaasSettings | null> {
    const { data, error } = await supabase.from('saas_settings').select('*').eq('id', FIXED_ID).maybeSingle();
    if (error) { console.error('getSettings:', error); throw error; }
    return data;
  },
  async updateSettings(settings: Partial<SaasSettings>): Promise<SaasSettings> {
    const payload = sanitize({ ...settings, id: FIXED_ID, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('saas_settings').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) { console.error('updateSettings:', error); throw error; }
    return data;
  },

  // === EMAIL ===
  async getEmailSettings(): Promise<SaasEmailSettings | null> {
    const { data, error } = await supabase.from('saas_email_settings').select('*').eq('id', FIXED_ID).maybeSingle();
    if (error) { console.error('getEmailSettings:', error); throw error; }
    return data;
  },
  async updateEmailSettings(settings: Partial<SaasEmailSettings>): Promise<SaasEmailSettings> {
    const payload = sanitize({ ...settings, id: FIXED_ID });
    const { data, error } = await supabase.from('saas_email_settings').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) { console.error('updateEmailSettings:', error); throw error; }
    return data;
  },
  async testEmailConnection(email: string): Promise<{ ok: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { email }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ok: true, message: 'E-mail de teste enviado com sucesso!' };
    } catch (e: any) {
      console.error('testEmailConnection:', e);
      return { ok: false, message: e.message || 'Erro ao enviar e-mail de teste.' };
    }
  },

  // === PAGAMENTOS ===
  async getPaymentSettings(): Promise<SaasPaymentSettings | null> {
    const { data, error } = await supabase.from('saas_payment_settings').select('*').eq('id', FIXED_ID).maybeSingle();
    if (error) { console.error('getPaymentSettings:', error); throw error; }
    return data;
  },
  async updatePaymentSettings(settings: Partial<SaasPaymentSettings>): Promise<SaasPaymentSettings> {
    const payload = sanitize({ ...settings, id: FIXED_ID, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('saas_payment_settings').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) { console.error('updatePaymentSettings:', error); throw error; }
    return data;
  },

  // === TERMS ===
  async getTermsHistory(): Promise<TermsVersion[]> {
    const { data, error } = await supabase.from('terms_versions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createTermsVersion(version: TermsVersion): Promise<TermsVersion> {
    const { data, error } = await supabase.from('terms_versions').insert(version).select().single();
    if (error) throw error;
    return data;
  },
  async forceTermsReaccept(versionId: string) {
    await supabase.from('terms_versions').update({ force_reaccept: true }).eq('id', versionId);
  },

  // === LGPD ===
  async deleteUserLGPD(userId: string) {
    await supabase.from('lgpd_requests').insert({ user_id: userId, request_type: 'exclusao', status: 'concluido', processed_at: new Date().toISOString() });
    const { error } = await supabase.from('members').update({ name: 'Usuário Excluído (LGPD)', email: `excluido-${userId}@ecclesia.com`, phone: null, cpf: null, birth_date: null, status: 'REJECTED' }).eq('user_id', userId);
    if (error) throw error;
  },

  // === TEMPLATES ===
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase.from('email_templates').select('*').order('type');
    if (error) throw error;
    return data || [];
  },
  async updateEmailTemplate(template: Partial<EmailTemplate> & { type: string }): Promise<EmailTemplate> {
    const payload = sanitize({ ...template, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('email_templates').upsert(payload, { onConflict: 'type' }).select().single();
    if (error) throw error;
    return data;
  },

  // === TESTE MERCADO PAGO ===
  async testMercadoPagoConnection(): Promise<{ ok: boolean; message: string }> {
    const settings = await this.getPaymentSettings();
    if (!settings?.mercado_pago_access_token) return { ok: false, message: 'Access Token não configurado.' };
    try {
      const r = await fetch('https://api.mercadopago.com/v1/payment_methods', {
        headers: { 'Authorization': `Bearer ${settings.mercado_pago_access_token}` }
      });
      if (r.ok) return { ok: true, message: 'Conexão OK! Credenciais válidas.' };
      return { ok: false, message: `Erro ${r.status}: Credenciais inválidas.` };
    } catch (e: any) { return { ok: false, message: e.message || 'Erro de rede.' }; }
  }
};
