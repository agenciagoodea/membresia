import { jsPDF } from 'jspdf';
import { PaidEventRegistration, PaidEvent } from '../types';

export const pdfService = {
  /**
   * Gera PDF individual do participante confirmado.
   */
  async generateParticipantPDF(
    reg: PaidEventRegistration,
    event: PaidEvent,
    churchLogo?: string
  ): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header com fundo
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, w, 45, 'F');

    // Logo da igreja (se disponível)
    if (churchLogo) {
      try {
        doc.addImage(churchLogo, 'PNG', 10, 8, 28, 28);
      } catch { /* silently skip if logo fails */ }
    }

    // Título do evento
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(event.title.toUpperCase(), churchLogo ? 44 : 10, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('FICHA DE INSCRIÇÃO CONFIRMADA', churchLogo ? 44 : 10, 30);

    const startDate = new Date(event.start_date).toLocaleDateString('pt-BR');
    doc.text(`Data: ${startDate}  |  Local: ${event.location || 'A definir'}`, churchLogo ? 44 : 10, 36);

    y = 55;

    // Foto do participante (se disponível)
    doc.setTextColor(0, 0, 0);
    if (reg.photo_url) {
      try {
        doc.addImage(reg.photo_url, 'JPEG', w - 45, 50, 35, 42);
      } catch { /* skip */ }
    }

    // Dados pessoais
    const maxLabelWidth = w - 60;

    const addField = (label: string, value: string | undefined | null) => {
      if (!value) return;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text(label.toUpperCase(), 10, y);
      y += 4;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(value, 10, y, { maxWidth: maxLabelWidth });
      y += 8;
    };

    const addSeparator = () => {
      doc.setDrawColor(230, 230, 230);
      doc.line(10, y, w - 10, y);
      y += 5;
    };

    addField('Nome Completo', reg.full_name);
    addField('Idade', reg.age ? `${reg.age} anos` : undefined);
    addField('Sexo', reg.gender);
    addField('Telefone', reg.phone);
    addSeparator();

    addField('Pastor', reg.pastor_name);
    addField('Discipulador', reg.discipler_name);
    addSeparator();

    addField('Tamanho da Blusa', reg.shirt_size);
    addField('Transporte', reg.transport_type);
    addSeparator();

    if (reg.has_allergy) {
      addField('Alergias', reg.allergy_description || 'Sim (não especificado)');
    }

    addField('Contato de Emergência', 
      reg.emergency_contact_name 
        ? `${reg.emergency_contact_name} — ${reg.emergency_contact_phone || ''}` 
        : undefined
    );

    if (reg.prayer_request) {
      addSeparator();
      addField('Pedido de Oração', reg.prayer_request);
    }

    // Status e Código
    addSeparator();
    y += 3;

    doc.setFillColor(22, 163, 74); // green-600
    doc.roundedRect(10, y, 55, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGAMENTO CONFIRMADO', 13, y + 8);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.text(`Código: ${reg.registration_code}`, 70, y + 5);

    if (reg.payment_confirmed_at) {
      const confirmDate = new Date(reg.payment_confirmed_at).toLocaleDateString('pt-BR');
      doc.text(`Confirmado em: ${confirmDate}`, 70, y + 11);
    }

    // Rodapé
    const footer = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 10, footer);
    doc.text('Ecclesia SaaS — Módulo de Eventos Pagos', w - 10, footer, { align: 'right' });

    return doc.output('blob');
  },

  /**
   * Gera e dispara download do PDF.
   */
  async downloadParticipantPDF(
    reg: PaidEventRegistration,
    event: PaidEvent,
    churchLogo?: string
  ): Promise<void> {
    const blob = await this.generateParticipantPDF(reg, event, churchLogo);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscricao-${reg.registration_code}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
