import { supabase } from './supabaseClient';

export interface SMTPSettings {
  id?: string;
  church_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string; // Optional on frontend to avoid leaking
  smtp_secure: boolean;
  email_from_name: string;
  email_from_address: string;
  status: 'ativo' | 'inativo';
  last_test_at?: string;
}

export const smtpService = {
  async getSettings(churchId: string): Promise<SMTPSettings | null> {
    const { data, error } = await supabase
      .from('smtp_settings')
      .select('id, church_id, smtp_host, smtp_port, smtp_user, smtp_secure, email_from_name, email_from_address, status, last_test_at')
      .eq('church_id', churchId)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  },

  async saveSettings(settings: SMTPSettings): Promise<void> {
    const payload = { ...settings };
    
    // If password is empty (e.g. they don't want to change it), remove it from payload
    if (!payload.smtp_password) {
      delete payload.smtp_password;
    }
    
    // Try to get existing to know if we insert or update
    const { data: existing } = await supabase
      .from('smtp_settings')
      .select('id')
      .eq('church_id', settings.church_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('smtp_settings')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('smtp_settings')
        .insert([payload]);
      if (error) throw error;
    }
  },

  async testConnection(churchId: string, testEmail: string): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        church_id: churchId,
        to: testEmail,
        subject: 'Teste de Configuração SMTP - Sistema',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #4f46e5;">Configuração SMTP Concluída!</h2>
            <p>Se você está recebendo este e-mail, significa que suas credenciais SMTP foram configuradas corretamente no sistema.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">Este é um e-mail automático.</p>
          </div>
        `
      }
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'Falha ao conectar no servidor SMTP');
    }

    // Update last test timestamp
    await supabase.from('smtp_settings').update({ last_test_at: new Date().toISOString() }).eq('church_id', churchId);

    return true;
  },

  async sendEmail(churchId: string, to: string, subject: string, html: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { church_id: churchId, to, subject, html }
    });

    if (error || data?.error) {
      console.error('Falha ao enviar e-mail:', error || data?.error);
      // We don't necessarily throw here if it's an automatic email so we don't block the UI,
      // but the function caller can decide.
      throw new Error(data?.error || error?.message);
    }
  }
};
