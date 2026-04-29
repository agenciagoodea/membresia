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
  },

  /**
   * Gera PDF do Crachá CR-80 (54x86mm).
   */
  async downloadParticipantBadge(
    reg: PaidEventRegistration,
    event: PaidEvent,
    churchLogo?: string
  ): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] });
    
    // Background color
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, 54, 86, 'F');

    // Topo Roxo / Banner
    doc.setFillColor(139, 92, 246); // violet-500
    doc.rect(0, 0, 54, 25, 'F');
    if (event.banner_url) {
      try {
        doc.addImage(event.banner_url, 'JPEG', 0, 0, 54, 25);
        // Overlay escuro translúcido via GState se suportado
        try {
          doc.setGState(new (doc as any).GState({opacity: 0.4}));
          doc.setFillColor(0, 0, 0);
          doc.rect(0, 0, 54, 25, 'F');
          doc.setGState(new (doc as any).GState({opacity: 1.0}));
        } catch (e) {}
      } catch (e) {}
    }

    // Event title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(event.title.toUpperCase(), 50);
    doc.text(titleLines, 27, 12, { align: 'center' });

    // Participant Photo
    let photoY = 28;
    if (reg.photo_url) {
      try {
        // Draw white border for photo
        doc.setFillColor(255, 255, 255);
        doc.rect(13, photoY - 1, 28, 28, 'F');
        doc.addImage(reg.photo_url, 'JPEG', 14, photoY, 26, 26);
      } catch {
        // Placeholder if image fails
        doc.setFillColor(50, 50, 50);
        doc.rect(14, photoY, 26, 26, 'F');
      }
    } else {
      doc.setFillColor(50, 50, 50);
      doc.rect(14, photoY, 26, 26, 'F');
    }

    // Participant Name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const nameLines = doc.splitTextToSize(reg.full_name, 50);
    doc.text(nameLines, 27, 60, { align: 'center' });

    // Code/Info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(`CÓD: ${reg.registration_code}`, 27, 72, { align: 'center' });

    if (reg.pastor_name) {
      doc.text(`PASTOR: ${reg.pastor_name.toUpperCase()}`, 27, 76, { align: 'center' });
    }

    // Save
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cracha-${reg.registration_code}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Gera relatório PDF de todos os participantes confirmados.
   */
  async downloadEventReport(
    event: PaidEvent,
    registrations: PaidEventRegistration[],
    churchLogo?: string
  ): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE PARTICIPANTES', w / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(12);
    doc.text(event.title.toUpperCase(), w / 2, y, { align: 'center' });
    y += 15;

    // Filters & Stats
    const confirmed = registrations.filter(r => r.payment_status === 'pago_confirmado');
    const male = confirmed.filter(r => r.gender === 'Masculino').length;
    const female = confirmed.filter(r => r.gender === 'Feminino').length;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Confirmados: ${confirmed.length}`, 14, y);
    doc.text(`Masculino: ${male}  |  Feminino: ${female}`, 14, y + 5);
    
    y += 15;

    // Table Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, w - 28, 8, 'F');
    doc.text('Nome', 16, y);
    doc.text('Telefone', 80, y);
    doc.text('T. Blusa', 120, y);
    doc.text('Transp.', 140, y);
    doc.text('Pastor', 160, y);
    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    confirmed.forEach((reg, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(reg.full_name.substring(0, 30), 16, y);
      doc.text(reg.phone || '', 80, y);
      doc.text(reg.shirt_size || '', 120, y);
      doc.text(reg.transport_type || '', 140, y);
      doc.text(reg.pastor_name?.substring(0, 15) || '', 160, y);
      y += 6;
      doc.setDrawColor(240, 240, 240);
      doc.line(14, y - 4, w - 14, y - 4);
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${event.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Gera PDF A4 com todos os crachás dos inscritos confirmados em grade 3x3.
   */
  async generateBadgesBatchPDF(
    event: PaidEvent,
    registrations: PaidEventRegistration[]
  ): Promise<void> {
    const confirmed = registrations.filter(r => r.payment_status === 'pago_confirmado');
    if (confirmed.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Dimensões do crachá CR-80
    const badgeW = 54;
    const badgeH = 86;
    
    // Espaçamentos e Margens
    const cols = 3;
    const rows = 3;
    const marginX = (210 - (cols * badgeW)) / 2; // Centralizado horizontalmente
    const marginY = (297 - (rows * badgeH)) / 2; // Centralizado verticalmente

    for (let i = 0; i < confirmed.length; i++) {
      const reg = confirmed[i];
      const pageIndex = Math.floor(i / 9);
      const posOnPage = i % 9;
      const col = posOnPage % 3;
      const row = Math.floor(posOnPage / 3);

      if (posOnPage === 0 && i > 0) {
        doc.addPage();
      }

      const x = marginX + (col * badgeW);
      const y = marginY + (row * badgeH);

      // Fundo Escuro do Crachá
      doc.setFillColor(24, 24, 27); // zinc-900
      doc.roundedRect(x, y, badgeW, badgeH, 2, 2, 'F');

      // Topo Roxo / Banner
      doc.setFillColor(139, 92, 246); // violet-500
      doc.rect(x, y, badgeW, 25, 'F');
      if (event.banner_url) {
        try {
          doc.addImage(event.banner_url, 'JPEG', x, y, badgeW, 25);
          // Overlay escuro via GState se suportado
          try {
            doc.setGState(new (doc as any).GState({opacity: 0.4}));
            doc.setFillColor(0, 0, 0);
            doc.rect(x, y, badgeW, 25, 'F');
            doc.setGState(new (doc as any).GState({opacity: 1.0}));
          } catch (e) {}
        } catch (e) {}
      }

      // Nome do Evento no Topo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(event.title.toUpperCase(), badgeW - 4);
      doc.text(titleLines, x + (badgeW / 2), y + 12, { align: 'center' });

      // Foto do Participante (Placeholder de máscara circular via border grosso - JS PDF limitação)
      // Desenhamos um quadrado, tentamos colocar a foto.
      const photoY = y + 28;
      doc.setFillColor(50, 50, 50);
      doc.rect(x + 14, photoY, 26, 26, 'F');
      if (reg.photo_url) {
        try {
          doc.addImage(reg.photo_url, 'JPEG', x + 14, photoY, 26, 26);
        } catch (e) {
          // Ignora se der erro de cors/carregamento
        }
      }

      // Máscara para simular foto redonda (4 cantos cinzas)
      // JS PDF não permite clipping clip() nativo facialmente, então vamos adicionar o nome logo abaixo

      // Nome do Participante
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const nameLines = doc.splitTextToSize(reg.full_name, badgeW - 4);
      doc.text(nameLines, x + (badgeW / 2), y + 62, { align: 'center' });

      // Código
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text(`CÓD: ${reg.registration_code}`, x + (badgeW / 2), y + 74, { align: 'center' });

      // Pastor / Contato
      if (reg.pastor_name) {
        doc.text(`PASTOR: ${reg.pastor_name.toUpperCase()}`, x + (badgeW / 2), y + 78, { align: 'center' });
      }

      // Borda fina envolta do crachá para guia de corte
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([1, 1], 0);
      doc.roundedRect(x, y, badgeW, badgeH, 2, 2, 'S');
      doc.setLineDashPattern([], 0); // reset
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crachas-lote-${event.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
