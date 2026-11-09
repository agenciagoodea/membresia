import { supabase } from './supabaseClient';
import { PaidEvent, PaidEventRegistration, PaymentStatus } from '../types';
import { paidEventService } from './paidEventService';

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
    if (event?.max_participants) {
      const stats = await paidEventService.getEventStats(event.id);
      if (stats?.is_sold_out || (stats?.spots_left !== null && (stats?.spots_left || 0) <= 0)) {
        throw new Error('As inscrições deste evento foram encerradas por lotação.');
      }
    }

    const registration_code = generateRegistrationCode();
    const payload = { ...regData, registration_code };
    const { error } = await supabase
      .from('paid_event_registrations')
      .insert([payload]);
      
    if (error) throw error;

    try {
      await this.syncEventCapacityStatus(payload.event_id);
    } catch (syncError) {
      console.warn('Falha ao sincronizar status de lotação do evento:', syncError);
    }

    // Enviar e-mail automático de confirmação de inscrição
    if (event && payload.email) {
      try {
        const { smtpService } = await import('./smtpService');
        const eventPeriod = this.formatEventPeriod(event.start_date, event.end_date);
        const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const isColab = payload.registration_type === 'colaborador';
        const modalidadeText = isColab ? `Colaborador / Equipe (${payload.collaborator_role || 'Apoio'})` : 'Participante / Encontrista';
        const valorText = formatBRL(payload.amount_expected || (isColab ? (event.price_collaborator || event.price) : event.price));
        const hasProof = Boolean(payload.payment_proof_url);

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmação de Inscrição</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 30px 15px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 36px 30px; text-align: center;">
                        <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">
                          Inscrição Realizada com Sucesso
                        </span>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.2;">
                          ${event.title}
                        </h1>
                      </td>
                    </tr>

                    <!-- Conteúdo Principal -->
                    <tr>
                      <td style="padding: 32px 30px;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; color: #ffffff; font-weight: 700;">
                          Olá, ${payload.full_name.split(' ')[0]}!
                        </p>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                          Recebemos a sua inscrição para o evento <strong>${event.title}</strong>. Abaixo estão todas as informações da sua credencial e orientações:
                        </p>

                        <!-- Box do Código de Inscrição -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                          <tr>
                            <td align="center" style="background-color: #09090b; border: 1px dashed #7c3aed; border-radius: 16px; padding: 20px;">
                              <span style="font-size: 10px; font-weight: 800; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px;">CÓDIGO DE CREDENCIAL</span>
                              <div style="font-size: 26px; font-weight: 900; color: #a78bfa; letter-spacing: 3px; margin-top: 6px;">
                                ${registration_code}
                              </div>
                              <span style="display: inline-block; font-size: 11px; color: #71717a; margin-top: 6px;">Guarde este código para apresentar no check-in</span>
                            </td>
                          </tr>
                        </table>

                        <!-- Tabela com Detalhes da Inscrição -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #27272a; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Data / Período:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${eventPeriod}</td>
                          </tr>
                          ${event.location ? `
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Local:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${event.location}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Modalidade:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${modalidadeText}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Valor do Investimento:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 14px; color: #34d399; font-weight: 900;">${valorText}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Camiseta / Transporte:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">Blusa ${payload.shirt_size || '-'} • ${payload.transport_type || '-'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 18px; font-size: 12px; color: #a1a1aa; font-weight: 700;">Pastor / Liderança:</td>
                            <td align="right" style="padding: 12px 18px; font-size: 12px; color: #ffffff; font-weight: 700;">${payload.pastor_name || '-'}</td>
                          </tr>
                        </table>

                        <!-- Status do Pagamento e Instruções Pix -->
                        ${hasProof ? `
                          <div style="background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 18px; text-align: center; margin-bottom: 24px;">
                            <span style="font-size: 12px; font-weight: 800; color: #60a5fa; text-transform: uppercase;">
                              📄 Comprovante Enviado com Sucesso!
                            </span>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #d4d4d8; line-height: 1.5;">
                              Nosso time de coordenação já recebeu o seu comprovante. Assim que for validado, você receberá um e-mail de confirmação oficial com sua vaga garantida.
                            </p>
                          </div>
                        ` : `
                          <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 16px; padding: 18px; text-align: center; margin-bottom: 24px;">
                            <span style="font-size: 12px; font-weight: 800; color: #fbbf24; text-transform: uppercase;">
                              ⏳ Aguardando Envio do Comprovante
                            </span>
                            <p style="margin: 6px 0 12px 0; font-size: 13px; color: #d4d4d8; line-height: 1.5;">
                              Sua vaga pré-reservada aguarda a confirmação do pagamento de <strong>${valorText}</strong>.
                            </p>
                            ${event.pix_key ? `
                              <div style="background-color: #09090b; padding: 12px; border-radius: 10px; font-family: monospace; font-size: 13px; color: #34d399; word-break: break-all; margin-top: 8px;">
                                Chave Pix: <strong>${event.pix_key}</strong>
                                ${event.pix_receiver_name ? `<br><span style="font-size: 11px; color: #a1a1aa;">Beneficiário: ${event.pix_receiver_name}</span>` : ''}
                              </div>
                            ` : ''}
                          </div>
                        `}

                        <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center; line-height: 1.5;">
                          Dúvidas sobre sua inscrição? Entre em contato diretamente com a liderança ou coordenação do evento.
                        </p>
                      </td>
                    </tr>

                    <!-- Rodapé -->
                    <tr>
                      <td style="background-color: #09090b; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="margin: 0; font-size: 11px; color: #71717a; font-weight: 600;">
                          Ecclesia SaaS • Gestão Integrada de Eventos e Membresia
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        await smtpService.sendEmail(
          payload.church_id,
          payload.email,
          `Inscrição Confirmada: ${event.title} [${registration_code}]`,
          emailHtml
        );
      } catch (e) {
        console.error('Falha ao enviar email automático de inscrição:', e);
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

    try {
      await this.syncEventCapacityStatus(current.event_id);
    } catch (syncError) {
      console.warn('Falha ao sincronizar lotação após atualização de status:', syncError);
    }

    // Enviar e-mail de confirmação oficial de pagamento aprovado
    if (newStatus === PaymentStatus.CONFIRMED && current.email && event) {
      try {
        const { smtpService } = await import('./smtpService');
        const eventPeriod = this.formatEventPeriod(event.start_date, event.end_date);
        const isColab = current.registration_type === 'colaborador';
        const modalidadeText = isColab ? `Colaborador / Equipe (${current.collaborator_role || 'Apoio'})` : 'Participante / Encontrista';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Confirmado</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 30px 15px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header Verde -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #059669, #10b981); padding: 36px 30px; text-align: center;">
                        <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">
                          Vaga Garantida • Pagamento Aprovado
                        </span>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.2;">
                          ${event.title}
                        </h1>
                      </td>
                    </tr>

                    <!-- Conteúdo Principal -->
                    <tr>
                      <td style="padding: 32px 30px;">
                        <p style="margin: 0 0 16px 0; font-size: 16px; color: #ffffff; font-weight: 700;">
                          Parabéns, ${current.full_name.split(' ')[0]}! 🎉
                        </p>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                          Seu pagamento foi <strong style="color: #34d399;">confirmado com sucesso</strong> e a sua vaga está 100% garantida no evento <strong>${event.title}</strong>!
                        </p>

                        <!-- Box do Código de Credencial -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                          <tr>
                            <td align="center" style="background-color: #09090b; border: 1px dashed #10b981; border-radius: 16px; padding: 20px;">
                              <span style="font-size: 10px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 2px;">CREDENCIAL CONFIRMADA</span>
                              <div style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 3px; margin-top: 6px;">
                                ${current.registration_code}
                              </div>
                              <span style="display: inline-block; font-size: 11px; color: #a1a1aa; margin-top: 6px;">Apresente no check-in para retirar seu crachá e kit</span>
                            </td>
                          </tr>
                        </table>

                        <!-- Tabela Resumo -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #27272a; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Data / Período:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${eventPeriod}</td>
                          </tr>
                          ${event.location ? `
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Local:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${event.location}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #a1a1aa; font-weight: 700;">Modalidade:</td>
                            <td align="right" style="padding: 12px 18px; border-bottom: 1px solid #3f3f46; font-size: 12px; color: #ffffff; font-weight: 700;">${modalidadeText}</td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 18px; font-size: 12px; color: #a1a1aa; font-weight: 700;">Camiseta / Transporte:</td>
                            <td align="right" style="padding: 12px 18px; font-size: 12px; color: #ffffff; font-weight: 700;">Blusa ${current.shirt_size || '-'} • ${current.transport_type || '-'}</td>
                          </tr>
                        </table>

                        <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center; line-height: 1.5;">
                          Nos vemos no evento! Que Deus abençoe ricamente a sua vida.
                        </p>
                      </td>
                    </tr>

                    <!-- Rodapé -->
                    <tr>
                      <td style="background-color: #09090b; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a;">
                        <p style="margin: 0; font-size: 11px; color: #71717a; font-weight: 600;">
                          Ecclesia SaaS • Gestão Integrada de Eventos e Membresia
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        await smtpService.sendEmail(
          current.church_id,
          current.email,
          `✅ Vaga Confirmada: ${event.title} [${current.registration_code}]`,
          emailHtml
        );
      } catch (e) {
        console.error('Falha ao enviar email de confirmação de pagamento:', e);
      }
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const current = await this.getById(id);
    const { error } = await supabase
      .from('paid_event_registrations')
      .delete()
      .eq('id', id);
    if (error) throw error;

    if (current?.event_id) {
      try {
        await this.syncEventCapacityStatus(current.event_id);
      } catch (syncError) {
        console.warn('Falha ao sincronizar lotação após exclusão:', syncError);
      }
    }
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
    const stats = await paidEventService.getEventStats(eventId);
    if (stats) return stats.total_confirmed;

    const { count, error } = await supabase
      .from('paid_event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('payment_status', 'pago_confirmado');
    if (error) throw error;
    return count || 0;
  },

  async countActive(eventId: string): Promise<number> {
    const stats = await paidEventService.getEventStats(eventId);
    if (stats) return stats.total_active;

    // Conta apenas as inscrições pagas (para bloquear vagas)
    const { count, error } = await supabase
      .from('paid_event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('payment_status', 'pago_confirmado');
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
  },

  async syncEventCapacityStatus(eventId: string): Promise<void> {
    if (!eventId) return;
    const { error } = await supabase.rpc('sync_paid_event_capacity_status', {
      target_event_id: eventId,
    });
    if (error) throw error;
  }
};
