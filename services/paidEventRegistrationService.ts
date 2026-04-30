import { supabase } from './supabaseClient';
import { PaidEvent, PaidEventRegistration, PaymentStatus } from '../types';

function generateRegistrationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EVT-${p1}-${p2}`;
}

export const paidEventRegistrationService = {
  async getByEvent(eventId: string): Promise<PaidEventRegistration[]> {
    const { data, error } = await supabase
      .from('paid_event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByMember(memberId: string): Promise<PaidEventRegistration[]> {
    const { data, error } = await supabase
      .from('paid_event_registrations')
      .select('*, paid_events(*)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByMemberOrEmail(memberId: string, email?: string): Promise<PaidEventRegistration[]> {
    // Busca por member_id (inscrições feitas logado) OU por e-mail (inscrições no formúlário público)
    let query = supabase
      .from('paid_event_registrations')
      .select('*, paid_events(*)')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.or(`member_id.eq.${memberId},email.ilike.${email}`);
    } else {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Remover duplicatas (inscrição com member_id E email coincidindo)
    const seen = new Set<string>();
    return (data || []).filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  },

  async getById(id: string): Promise<PaidEventRegistration | null> {
    const { data, error } = await supabase
      .from('paid_event_registrations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async create(
    regData: Omit<PaidEventRegistration, 'id' | 'created_at' | 'updated_at' | 'registration_code' | 'payment_confirmed_by' | 'payment_confirmed_at' | 'pdf_url'>,
    event?: PaidEvent
  ): Promise<PaidEventRegistration> {
    const registration_code = generateRegistrationCode();
    const payload = { ...regData, registration_code };
    const { error } = await supabase
      .from('paid_event_registrations')
      .insert([payload]);
      
    if (error) throw error;

    // Send email notification if event is provided
    if (event && payload.email) {
      try {
        const { smtpService } = await import('./smtpService');
        await smtpService.sendEmail(
          payload.church_id,
          payload.email,
          `Inscrição Recebida: ${event.title}`,
          `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #4f46e5;">Sua inscrição foi recebida!</h2>
            <p>Olá <strong>${payload.full_name}</strong>, recebemos sua inscrição para o evento <strong>${event.title}</strong>.</p>
            <p>Código da Inscrição: <strong>${registration_code}</strong></p>
            <p>Aguardamos o envio do comprovante de pagamento para confirmarmos sua vaga.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">Este é um e-mail automático.</p>
          </div>
          `
        );
      } catch (e) {
        console.error('Falha ao enviar email de inscrição:', e);
      }
    }

    return payload as unknown as PaidEventRegistration;
  },

  async updatePaymentStatus(
    registrationId: string, newStatus: PaymentStatus, changedBy: string, note?: string,
    event?: PaidEvent
  ): Promise<PaidEventRegistration> {
    const current = await this.getById(registrationId);
    if (!current) throw new Error('Inscrição não encontrada');

    const updateData: any = { payment_status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === PaymentStatus.CONFIRMED) {
      updateData.payment_confirmed_by = changedBy;
      updateData.payment_confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('paid_event_registrations')
      .update(updateData)
      .eq('id', registrationId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('paid_event_payment_logs').insert([{
      church_id: current.church_id, event_id: current.event_id,
      registration_id: registrationId, previous_status: current.payment_status,
      new_status: newStatus, changed_by: changedBy, note: note || null
    }]);

    // Send confirmation email
    if (newStatus === PaymentStatus.CONFIRMED && current.email && event) {
      try {
        const { smtpService } = await import('./smtpService');
        await smtpService.sendEmail(
          current.church_id,
          current.email,
          `Pagamento Confirmado: ${event.title}`,
          `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #10b981;">Pagamento Confirmado!</h2>
            <p>Olá <strong>${current.full_name}</strong>, seu pagamento para o evento <strong>${event.title}</strong> foi confirmado com sucesso.</p>
            <p>Código da Inscrição: <strong>${current.registration_code}</strong></p>
            <p>Sua vaga está garantida! Em breve você poderá acessar seu crachá.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">Este é um e-mail automático.</p>
          </div>
          `
        );
      } catch (e) {
        console.error('Falha ao enviar email de confirmação:', e);
      }
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('paid_event_registrations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadPhoto(file: File, churchId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const name = `${churchId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('event-participant-photos').upload(name, file);
    if (error) throw error;
    // Retornamos apenas o path para maior flexibilidade
    return name;
  },

  async uploadProof(file: File, churchId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const name = `${churchId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('event-payment-proofs').upload(name, file);
    if (error) throw error;
    // Retornamos apenas o path para maior flexibilidade
    return name;
  },

  getFileUrl(bucket: 'event-participant-photos' | 'event-payment-proofs' | 'paid-event-banners', path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path; // Já é uma URL completa
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Converte uma imagem para Base64 (útil para PDFs)
   */
  async getImageBase64(bucket: string, path: string): Promise<string> {
    const url = this.getFileUrl(bucket as any, path);
    if (!url) return '';
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Erro ao converter imagem para base64:', e);
      return '';
    }
  },

  /**
   * Helper para formatar data sem sofrer com timezone (evita voltar 1 dia)
   */
  formatDateOnly(dateString: string): string {
    if (!dateString) return 'Data não informada';
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Pega apenas a parte YYYY-MM-DD
    const parts = dateString.split('T')[0].split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    return `${day} de ${months[month]} de ${year}`;
  },

  formatEventPeriod(startDate: string, endDate?: string): string {
    if (!startDate) return 'Período não informado';
    
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    const parse = (d: string) => {
      const parts = d.split('T')[0].split('-');
      return {
        year: parseInt(parts[0]),
        month: parseInt(parts[1]) - 1,
        day: parseInt(parts[2])
      };
    };

    const s = parse(startDate);
    const e = endDate ? parse(endDate) : null;
    
    if (!e || (s.day === e.day && s.month === e.month && s.year === e.year)) {
      return `${s.day} de ${months[s.month]} de ${s.year}`;
    }

    if (s.month === e.month && s.year === e.year) {
      return `${s.day} a ${e.day} de ${months[s.month]} de ${s.year}`;
    }

    if (s.year === e.year) {
      return `${s.day} de ${months[s.month]} a ${e.day} de ${months[e.month]} de ${s.year}`;
    }

    return `${s.day}/${s.month + 1}/${s.year} a ${e.day}/${e.month + 1}/${e.year}`;
  },

  async updatePdfUrl(registrationId: string, pdfUrl: string): Promise<void> {
    const { error } = await supabase
      .from('paid_event_registrations')
      .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
      .eq('id', registrationId);
    if (error) throw error;
  },

  async countConfirmed(eventId: string): Promise<number> {
    const { count, error } = await supabase
      .from('paid_event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('payment_status', 'pago_confirmado');
    if (error) throw error;
    return count || 0;
  },

  async countActive(eventId: string): Promise<number> {
    // Conta todas as inscrições não canceladas/recusadas (para bloquear vagas)
    const { count, error } = await supabase
      .from('paid_event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .not('payment_status', 'eq', 'cancelado')
      .not('payment_status', 'eq', 'recusado');
    if (error) throw error;
    return count || 0;
  },

  async getPaymentLogs(registrationId: string) {
    const { data, error } = await supabase
      .from('paid_event_payment_logs')
      .select('*')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
