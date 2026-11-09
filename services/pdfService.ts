import { jsPDF } from 'jspdf';
import { PaidEventRegistration, PaidEvent } from '../types';
import { paidEventRegistrationService } from './paidEventRegistrationService';

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

    const eventPeriod = paidEventRegistrationService.formatEventPeriod(event.start_date, event.end_date);
    const photoBase64 = reg.photo_url ? await paidEventRegistrationService.getImageBase64('event-participant-photos', reg.photo_url) : '';

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

    doc.text(`Período: ${eventPeriod}  |  Local: ${event.location || 'A definir'}`, churchLogo ? 44 : 10, 36);

    y = 55;

    // Foto do participante (se disponível)
    doc.setTextColor(0, 0, 0);
    if (photoBase64) {
      try {
        doc.addImage(photoBase64, 'JPEG', w - 45, 50, 35, 42);
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
    
    const bannerBase64 = event.banner_url ? await paidEventRegistrationService.getImageBase64('paid-event-banners', event.banner_url) : '';
    const photoBase64 = reg.photo_url ? await paidEventRegistrationService.getImageBase64('event-participant-photos', reg.photo_url) : '';

    // Background color
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, 54, 86, 'F');

    // Topo Roxo / Banner
    doc.setFillColor(139, 92, 246); // violet-500
    doc.rect(0, 0, 54, 25, 'F');
    if (bannerBase64) {
      try {
        doc.addImage(bannerBase64, 'JPEG', 0, 0, 54, 25);
        try {
          doc.setGState(new (doc as any).GState({opacity: 0.4}));
          doc.setFillColor(0, 0, 0);
          doc.rect(0, 0, 54, 25, 'F');
          doc.setGState(new (doc as any).GState({opacity: 1.0}));
        } catch (e) {}
      } catch (e) {}
    }

    // Event title - REMOVED as per user request to leave banner clean
    /*
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(event.title.toUpperCase(), 50);
    doc.text(titleLines, 27, 12, { align: 'center' });
    */

    // Participant Photo
    let photoY = 28;
    if (photoBase64) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(13, photoY - 1, 28, 28, 'F');
        doc.addImage(photoBase64, 'JPEG', 14, photoY, 26, 26);
      } catch {
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
   * Gera relatório PDF oficial, moderno e profissional (formato A4)
   * Página 1: Dashboard Executivo Consolidado
   *   - Quantidade de Inscritos, Pagos, Pendentes
   *   - Quantidade de Homens e Mulheres
   *   - Camisas por tamanho Homem e Mulher
   *   - Quantidade que vão de Carro e Ônibus
   *   - Resumo Logístico e Financeiro
   * Página 2 em diante: Lista nominal de Homens e, na sequência, Lista de Mulheres.
   */
  async downloadEventReport(
    event: PaidEvent,
    registrations: PaidEventRegistration[],
    churchLogo?: string
  ): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 210
    const pageH = doc.internal.pageSize.getHeight(); // 297
    const contentW = 182; // Margens de 14mm em ambos os lados (14 a 196mm)
    const leftMargin = 14;

    const eventPeriod = paidEventRegistrationService.formatEventPeriod(event.start_date, event.end_date);
    const now = new Date();
    const dataEmissao = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    // Helper de truncamento seguro
    const truncate = (str: string | undefined | null, maxLen: number): string => {
      if (!str) return '-';
      const trimmed = str.trim();
      if (trimmed.length <= maxLen) return trimmed;
      return trimmed.substring(0, maxLen - 1) + '…';
    };

    // Classificação e Métricas
    const isMale = (gender?: string) => {
      const g = (gender || '').trim().toLowerCase();
      return g === 'masculino' || g === 'm' || g === 'homem';
    };
    const isFemale = (gender?: string) => {
      const g = (gender || '').trim().toLowerCase();
      return g === 'feminino' || g === 'f' || g === 'mulher';
    };
    const isPaid = (status: string) => status === 'pago_confirmado';
    const isPending = (status: string) =>
      ['aguardando_comprovante', 'comprovante_enviado', 'em_analise'].includes(status) ||
      (!isPaid(status) && status !== 'recusado' && status !== 'cancelado');

    const totalInscritos = registrations.length;
    const totalPagos = registrations.filter(r => isPaid(r.payment_status)).length;
    const totalPendentes = registrations.filter(r => isPending(r.payment_status)).length;
    const totalRecusados = registrations.filter(r => r.payment_status === 'recusado' || r.payment_status === 'cancelado').length;

    const menList = registrations.filter(r => isMale(r.gender));
    const womenList = registrations.filter(r => isFemale(r.gender));
    const otherGenderList = registrations.filter(r => !isMale(r.gender) && !isFemale(r.gender));

    const totalHomens = menList.length;
    const totalMulheres = womenList.length;
    const totalOutroGenero = otherGenderList.length;

    const totalCarro = registrations.filter(r => (r.transport_type || '').toLowerCase().includes('carro')).length;
    const totalOnibus = registrations.filter(r => (r.transport_type || '').toLowerCase().includes('nibus')).length;
    const totalOutroTransp = registrations.length - totalCarro - totalOnibus;

    // Percentuais formatados
    const pct = (num: number, base: number) => base > 0 ? Math.round((num / base) * 100) : 0;
    const pctPagos = pct(totalPagos, totalInscritos);
    const pctPendentes = pct(totalPendentes, totalInscritos);
    const pctHomens = pct(totalHomens, totalInscritos);
    const pctMulheres = pct(totalMulheres, totalInscritos);
    const pctCarro = pct(totalCarro, totalInscritos);
    const pctOnibus = pct(totalOnibus, totalInscritos);

    // Contagem de Camisas por Tamanho (Homens vs Mulheres)
    const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
    const menShirts: Record<string, number> = {};
    const womenShirts: Record<string, number> = {};
    SHIRT_SIZES.forEach(s => {
      menShirts[s] = 0;
      womenShirts[s] = 0;
    });
    let menShirtsOutros = 0;
    let womenShirtsOutros = 0;
    let totalCamisasHomens = 0;
    let totalCamisasMulheres = 0;

    menList.forEach(r => {
      const sz = (r.shirt_size || '').trim().toUpperCase();
      if (sz && SHIRT_SIZES.includes(sz)) {
        menShirts[sz] = (menShirts[sz] || 0) + 1;
        totalCamisasHomens++;
      } else if (sz) {
        menShirtsOutros++;
        totalCamisasHomens++;
      }
    });

    womenList.forEach(r => {
      const sz = (r.shirt_size || '').trim().toUpperCase();
      if (sz && SHIRT_SIZES.includes(sz)) {
        womenShirts[sz] = (womenShirts[sz] || 0) + 1;
        totalCamisasMulheres++;
      } else if (sz) {
        womenShirtsOutros++;
        totalCamisasMulheres++;
      }
    });

    const totalGeralCamisas = totalCamisasHomens + totalCamisasMulheres;

    // =========================================================================
    // PÁGINA 1: DASHBOARD EXECUTIVO CONSOLIDADO
    // =========================================================================

    // 1. Cabeçalho Executivo com Dark Banner e detalhes modernos
    const headerH = 26;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(leftMargin, 10, contentW, headerH, 2.5, 2.5, 'F');

    // Faixa de destaque roxa/índigo no topo do banner
    doc.setFillColor(124, 58, 237); // violet-600
    doc.roundedRect(leftMargin, 10, contentW, 2.5, 1, 1, 'F');

    // Identificação do Sistema
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(196, 181, 253); // violet-300
    doc.text('ECCLESIA SAAS  •  GESTÃO DE EVENTOS  •  RELATÓRIO EXECUTIVO OFICIAL', leftMargin + 6, 17.5);

    // Título do Evento
    doc.setFontSize(12.5);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(event.title.toUpperCase(), contentW - 12);
    doc.text(titleLines[0], leftMargin + 6, 24);

    // Metadados do Evento
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // slate-300
    const metaText = `Período: ${eventPeriod}    |    Local: ${event.location || 'Local a definir'}    |    Emissão: ${dataEmissao}`;
    doc.text(metaText, leftMargin + 6, 31.5);

    // 2. Linha 1 de KPIs: Inscritos, Pagos, Pendentes (y = 40, h = 21mm)
    const kpiY1 = 39;
    const cardW1 = 56.6;
    const cardGap1 = 6;
    const cardH1 = 21;

    // Card Total Inscritos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(leftMargin, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    doc.text(String(totalInscritos), leftMargin + 6, kpiY1 + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DE INSCRITOS', leftMargin + 6, kpiY1 + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('100% da base cadastrada', leftMargin + 6, kpiY1 + 18.5);

    // Card Pagos / Confirmados
    const cardX2 = leftMargin + cardW1 + cardGap1;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(cardX2, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(22, 163, 74); // emerald-600
    doc.text(String(totalPagos), cardX2 + 6, kpiY1 + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(21, 128, 61);
    doc.text('PAGOS / CONFIRMADOS', cardX2 + 6, kpiY1 + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(22, 163, 74);
    doc.text(`${pctPagos}% dos inscritos confirmados`, cardX2 + 6, kpiY1 + 18.5);

    // Card Pendentes / Aguardando
    const cardX3 = cardX2 + cardW1 + cardGap1;
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(254, 240, 138); // amber-200
    doc.roundedRect(cardX3, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(String(totalPendentes), cardX3 + 6, kpiY1 + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text('PENDENTES / EM ANÁLISE', cardX3 + 6, kpiY1 + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(217, 119, 6);
    doc.text(`${pctPendentes}% aguardando quitação`, cardX3 + 6, kpiY1 + 18.5);

    // 3. Linha 2 de KPIs: Homens, Mulheres, Carro, Ônibus (y = 63, h = 18mm)
    const kpiY2 = 63;
    const cardW2 = 43;
    const cardGap2 = 3.33;
    const cardH2 = 18;

    // Card Homens
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(leftMargin, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(String(totalHomens), leftMargin + 5, kpiY2 + 8.5);
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text('HOMENS (MASC.)', leftMargin + 5, kpiY2 + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${pctHomens}% do público`, leftMargin + 5, kpiY2 + 16);

    // Card Mulheres
    const card2X2 = leftMargin + cardW2 + cardGap2;
    doc.setFillColor(253, 242, 248); // pink-50
    doc.setDrawColor(251, 207, 232);
    doc.roundedRect(card2X2, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(190, 24, 93); // pink-700
    doc.text(String(totalMulheres), card2X2 + 5, kpiY2 + 8.5);
    doc.setFontSize(6);
    doc.setTextColor(131, 24, 67);
    doc.text('MULHERES (FEM.)', card2X2 + 5, kpiY2 + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(219, 39, 119);
    doc.text(`${pctMulheres}% do público`, card2X2 + 5, kpiY2 + 16);

    // Card Carro
    const card2X3 = card2X2 + cardW2 + cardGap2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(card2X3, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text(String(totalCarro), card2X3 + 5, kpiY2 + 8.5);
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text('VÃO DE CARRO', card2X3 + 5, kpiY2 + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${pctCarro}% transporte`, card2X3 + 5, kpiY2 + 16);

    // Card Ônibus
    const card2X4 = card2X3 + cardW2 + cardGap2;
    doc.setFillColor(250, 245, 255); // purple-50
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(card2X4, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(126, 34, 206); // purple-700
    doc.text(String(totalOnibus), card2X4 + 5, kpiY2 + 8.5);
    doc.setFontSize(6);
    doc.setTextColor(107, 33, 168);
    doc.text('VÃO DE ÔNIBUS', card2X4 + 5, kpiY2 + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(147, 51, 234);
    doc.text(`${pctOnibus}% transporte`, card2X4 + 5, kpiY2 + 16);

    // 4. Seção Camisas por Tamanho (Homem vs Mulher) (y = 84, h = 84mm)
    const shirtsY = 84;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('DISTRIBUIÇÃO DE CAMISAS POR TAMANHO E GÊNERO', leftMargin, shirtsY + 1);

    const shirtBoxW = 88;
    const shirtBoxH = 68;
    const shirtBoxY = shirtsY + 4;

    // Helper para desenhar a tabela de camisas por gênero
    const drawShirtTable = (
      x: number,
      title: string,
      totalShirts: number,
      sizesMap: Record<string, number>,
      isMen: boolean
    ) => {
      // Borda e fundo do card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, shirtBoxY, shirtBoxW, shirtBoxH, 2, 2, 'FD');

      // Top Header do card
      if (isMen) {
        doc.setFillColor(30, 58, 138); // blue-900
      } else {
        doc.setFillColor(131, 24, 67); // pink-900
      }
      doc.roundedRect(x, shirtBoxY, shirtBoxW, 7.5, 2, 2, 'F');
      doc.rect(x, shirtBoxY + 5, shirtBoxW, 2.5, 'F'); // remove arredondamento inferior do header

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(title, x + 4, shirtBoxY + 5.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Total: ${totalShirts} un.`, x + shirtBoxW - 4, shirtBoxY + 5.2, { align: 'right' });

      // Cabeçalho das colunas da tabela de camisas
      const tableHeadY = shirtBoxY + 7.5;
      doc.setFillColor(241, 245, 249);
      doc.rect(x, tableHeadY, shirtBoxW, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('TAMANHO', x + 4, tableHeadY + 3.5);
      doc.text('QUANTIDADE', x + 24, tableHeadY + 3.5);
      doc.text('PROPORÇÃO VISUAL', x + 46, tableHeadY + 3.5);
      doc.text('%', x + shirtBoxW - 4, tableHeadY + 3.5, { align: 'right' });

      // Linhas dos tamanhos (PP, P, M, G, GG, XG, XXG)
      let rowY = tableHeadY + 5;
      const rowHeight = 6.4;
      const maxCount = Math.max(...Object.values(sizesMap), 1);

      SHIRT_SIZES.forEach((size, idx) => {
        const count = sizesMap[size] || 0;
        const pSize = totalShirts > 0 ? Math.round((count / totalShirts) * 100) : 0;

        // Fundo alternado
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, rowY, shirtBoxW, rowHeight, 'F');
        }

        // Pill do tamanho
        if (isMen) {
          doc.setFillColor(239, 246, 255);
          doc.setDrawColor(191, 219, 254);
        } else {
          doc.setFillColor(253, 242, 248);
          doc.setDrawColor(251, 207, 232);
        }
        doc.roundedRect(x + 4, rowY + 1.2, 9, 4, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        if (isMen) {
          doc.setTextColor(30, 58, 138);
        } else {
          doc.setTextColor(131, 24, 67);
        }
        doc.text(size, x + 8.5, rowY + 4.1, { align: 'center' });

        // Quantidade
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`${count} un.`, x + 24, rowY + 4.2);

        // Barra de progresso visual
        const barWidth = 26;
        const fillW = Math.max(1, Math.round((count / maxCount) * barWidth));
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(x + 46, rowY + 2.2, barWidth, 2.2, 0.8, 0.8, 'F');
        if (count > 0) {
          if (isMen) {
            doc.setFillColor(37, 99, 235);
          } else {
            doc.setFillColor(219, 39, 119);
          }
          doc.roundedRect(x + 46, rowY + 2.2, fillW, 2.2, 0.8, 0.8, 'F');
        }

        // Percentual
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`${pSize}%`, x + shirtBoxW - 4, rowY + 4.2, { align: 'right' });

        // Linha divisória sutil
        doc.setDrawColor(241, 245, 249);
        doc.line(x + 4, rowY + rowHeight, x + shirtBoxW - 4, rowY + rowHeight);

        rowY += rowHeight;
      });

      // Rodapé do card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, shirtBoxY + shirtBoxH - 6.5, shirtBoxW, 6.5, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Subtotal: ${totalShirts} camisas encomendadas`, x + 4, shirtBoxY + shirtBoxH - 2.2);
    };

    // Renderiza Homens à esquerda e Mulheres à direita
    drawShirtTable(leftMargin, '👔 CAMISAS — HOMENS', totalCamisasHomens, menShirts, true);
    drawShirtTable(leftMargin + shirtBoxW + 6, '👗 CAMISAS — MULHERES', totalCamisasMulheres, womenShirts, false);

    // Banner de Resumo Geral de Camisas a Produzir (y = 160, h = 9mm)
    const shirtSummaryY = shirtBoxY + shirtBoxH + 3.5;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(leftMargin, shirtSummaryY, contentW, 9, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text('📦 TOTAL GERAL DE CAMISETAS PARA PRODUÇÃO / CONFECÇÃO:', leftMargin + 6, shirtSummaryY + 5.8);

    doc.setFontSize(8.5);
    doc.setTextColor(22, 163, 74);
    const summaryShirtsText = `${totalGeralCamisas} PEÇAS  (${totalCamisasHomens} Masculinas + ${totalCamisasMulheres} Femininas)`;
    doc.text(summaryShirtsText, leftMargin + contentW - 6, shirtSummaryY + 5.8, { align: 'right' });

    // 5. Seção Logística & Financeiro (y = 171, h = 48mm)
    const logFinY = shirtSummaryY + 12;
    const boxLogW = 88;
    const boxLogH = 46;

    // Card Logística de Transporte
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, logFinY, boxLogW, boxLogH, 2, 2, 'FD');

    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(leftMargin, logFinY, boxLogW, 7, 2, 2, 'F');
    doc.rect(leftMargin, logFinY + 5, boxLogW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('🚌 LOGÍSTICA DE TRANSPORTE & EMBARQUE', leftMargin + 4, logFinY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    let transY = logFinY + 11.5;
    doc.text(`• Ônibus Coletivo: ${totalOnibus} passageiros (${pctOnibus}%)`, leftMargin + 5, transY);
    transY += 4.5;
    const frotaOnibus = Math.ceil(totalOnibus / 44) || (totalOnibus > 0 ? 1 : 0);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`  Estimativa de frota: ~${frotaOnibus} ônibus rodoviário(s) (base 44 lug.)`, leftMargin + 5, transY);

    transY += 6;
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Carro Próprio: ${totalCarro} passageiros (${pctCarro}%)`, leftMargin + 5, transY);
    transY += 4.5;
    const frotaCarros = Math.ceil(totalCarro / 3) || (totalCarro > 0 ? 1 : 0);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`  Estimativa de vagas: ~${frotaCarros} veículos particulares (média 3/carro)`, leftMargin + 5, transY);

    transY += 6;
    if (totalOutroTransp > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`• Outros / Não informado: ${totalOutroTransp} participante(s)`, leftMargin + 5, transY);
      transY += 5;
    }

    // Mini barra comparativa de transporte
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(leftMargin + 5, transY, boxLogW - 10, 4, 1, 1, 'F');
    const busShareW = Math.round(((totalOnibus) / (totalInscritos || 1)) * (boxLogW - 10));
    if (busShareW > 0) {
      doc.setFillColor(147, 51, 234); // violeta para ônibus
      doc.roundedRect(leftMargin + 5, transY, busShareW, 4, 1, 1, 'F');
    }
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Distribuição: [Roxo = Ônibus]  |  [Cinza = Carro]', leftMargin + 5, transY + 6.5);

    // Card Controle Financeiro & Ocupação
    const finX = leftMargin + boxLogW + 6;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(finX, logFinY, boxLogW, boxLogH, 2, 2, 'FD');

    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(finX, logFinY, boxLogW, 7, 2, 2, 'F');
    doc.rect(finX, logFinY + 5, boxLogW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('💰 CONTROLE FINANCEIRO & VAGAS', finX + 4, logFinY + 4.8);

    let finItemY = logFinY + 11.5;
    const price = event.price || 0;
    const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    if (price > 0) {
      doc.text(`• Valor Unitário por Pessoa:`, finX + 5, finItemY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(price), finX + boxLogW - 5, finItemY, { align: 'right' });
      finItemY += 5;

      doc.setFont('helvetica', 'normal');
      doc.text(`• Arrecadação Confirmada (${totalPagos} pagos):`, finX + 5, finItemY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(formatBRL(totalPagos * price), finX + boxLogW - 5, finItemY, { align: 'right' });
      finItemY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• A Confirmar (${totalPendentes} pendentes):`, finX + 5, finItemY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(formatBRL(totalPendentes * price), finX + boxLogW - 5, finItemY, { align: 'right' });
      finItemY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• Previsão Total do Evento:`, finX + 5, finItemY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatBRL(totalInscritos * price), finX + boxLogW - 5, finItemY, { align: 'right' });
      finItemY += 6;
    } else {
      doc.text(`• Valor da Inscrição: Gratuita / Sem Cobrança Direta`, finX + 5, finItemY);
      finItemY += 6;
    }

    // Ocupação do Evento
    const maxPart = event.max_participants || 0;
    const vagasLivres = maxPart > 0 ? Math.max(0, maxPart - totalPagos) : null;
    const ocupacaoPct = maxPart > 0 ? Math.round((totalPagos / maxPart) * 100) : null;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    if (maxPart > 0) {
      doc.text(`Ocupação Oficial: ${ocupacaoPct}% (${totalPagos} pagos / ${maxPart} vagas)`, finX + 5, finItemY);
      finItemY += 3.5;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(finX + 5, finItemY, boxLogW - 10, 3.5, 1, 1, 'F');
      if (ocupacaoPct && ocupacaoPct > 0) {
        doc.setFillColor(22, 163, 74);
        doc.roundedRect(finX + 5, finItemY, Math.min(boxLogW - 10, Math.round(((ocupacaoPct) / 100) * (boxLogW - 10))), 3.5, 1, 1, 'F');
      }
    } else {
      doc.text(`Capacidade de Vagas: Ilimitada / Sem teto cadastrado`, finX + 5, finItemY);
    }

    // 6. Bloco de Orientações da Coordenação (y = 233, h = 42mm)
    const guideY = logFinY + boxLogH + 4;
    const guideH = 42;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, guideY, contentW, guideH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('📋 INFORMAÇÕES OPERACIONAIS & DIRETRIZES DA COORDENAÇÃO DO EVENTO', leftMargin + 6, guideY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    let gy = guideY + 12;
    const addGuideLine = (title: string, desc: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(title, leftMargin + 6, gy);
      doc.setFont('helvetica', 'normal');
      doc.text(desc, leftMargin + 6 + doc.getTextWidth(title) + 1.5, gy);
      gy += 4.5;
    };

    addGuideLine('• Listagem Nominal Segmentada:', 'A partir da Página 2, este relatório apresenta as listas completas separadas por gênero: Homens e Mulheres.');
    addGuideLine('• Credenciamento e Presença:', 'Utilize as listas para registrar a presença física, validação dos comprovantes e entrega das camisetas correspondentes.');
    addGuideLine('• Transporte e Embarque:', 'Os inscritos no transporte coletivo devem apresentar-se no ponto de concentração no horário estabelecido com documento com foto.');
    addGuideLine('• Liderança e Apoio:', 'Os contatos telefônicos de discipuladores e pastores encontram-se descritos para pronto acionamento durante as atividades.');
    addGuideLine('• Organização dos Kits:', 'A relação exata de tamanhos das camisetas acima deve ser utilizada como referência oficial para conferência dos lotes.');

    // =========================================================================
    // PÁGINA 2 EM DIANTE: LISTA DE HOMENS E LISTA DE MULHERES
    // =========================================================================

    // Colunas da Tabela Nominal
    // Total 182mm: # (7mm) + Código (23mm) + Nome (48mm) + Contato (28mm) + Pastor (30mm) + Tam (10mm) + Transp (16mm) + Status (20mm)
    const colX = {
      num: leftMargin,
      numW: 7,
      code: leftMargin + 7,
      codeW: 23,
      name: leftMargin + 7 + 23,
      nameW: 48,
      phone: leftMargin + 7 + 23 + 48,
      phoneW: 28,
      pastor: leftMargin + 7 + 23 + 48 + 28,
      pastorW: 30,
      shirt: leftMargin + 7 + 23 + 48 + 28 + 30,
      shirtW: 10,
      transp: leftMargin + 7 + 23 + 48 + 28 + 30 + 10,
      transpW: 16,
      status: leftMargin + 7 + 23 + 48 + 28 + 30 + 10 + 16,
      statusW: 20
    };

    // Helper para desenhar a barra de cabeçalho da tabela
    const drawTableHeaderRow = (y: number, isFemaleSection: boolean) => {
      const headerH = 6.5;
      if (isFemaleSection) {
        doc.setFillColor(131, 24, 67); // pink-900
      } else {
        doc.setFillColor(30, 41, 59); // slate-800
      }
      doc.roundedRect(leftMargin, y, contentW, headerH, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);

      doc.text('#', colX.num + (colX.numW / 2), y + 4.2, { align: 'center' });
      doc.text('CÓDIGO', colX.code + 2, y + 4.2);
      doc.text('PARTICIPANTE', colX.name + 2, y + 4.2);
      doc.text('CONTATO / WHATSAPP', colX.phone + 2, y + 4.2);
      doc.text('PASTOR / DISCIPULADOR', colX.pastor + 2, y + 4.2);
      doc.text('BLUSA', colX.shirt + (colX.shirtW / 2), y + 4.2, { align: 'center' });
      doc.text('TRANSP.', colX.transp + (colX.transpW / 2), y + 4.2, { align: 'center' });
      doc.text('STATUS', colX.status + (colX.statusW / 2), y + 4.2, { align: 'center' });
    };

    // Helper para renderizar uma seção completa de participantes
    const renderParticipantSection = (
      sectionTitle: string,
      badgeLabel: string,
      list: PaidEventRegistration[],
      isFemaleSection: boolean
    ) => {
      // Ordenação alfabética por nome para agilidade no credenciamento
      const sortedList = [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

      // Top Banner da Seção
      const bannerH = 15;
      if (isFemaleSection) {
        doc.setFillColor(131, 24, 67); // pink-900
      } else {
        doc.setFillColor(15, 23, 42); // slate-900
      }
      doc.roundedRect(leftMargin, 10, contentW, bannerH, 2, 2, 'F');

      // Faixa de destaque no topo do banner
      if (isFemaleSection) {
        doc.setFillColor(219, 39, 119); // pink-600
      } else {
        doc.setFillColor(37, 99, 235); // blue-600
      }
      doc.roundedRect(leftMargin, 10, contentW, 2, 1, 1, 'F');

      // Título da Seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text(sectionTitle, leftMargin + 6, 17.5);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      if (isFemaleSection) {
        doc.setTextColor(251, 207, 232);
      } else {
        doc.setTextColor(203, 213, 225);
      }
      doc.text(`${event.title.toUpperCase()}  •  TOTAL: ${sortedList.length} PARTICIPANTES`, leftMargin + 6, 22);

      // Badge à direita
      const badgeW = 28;
      const badgeH = 5.5;
      const badgeX = leftMargin + contentW - badgeW - 5;
      const badgeY = 14.5;
      if (isFemaleSection) {
        doc.setFillColor(219, 39, 119);
      } else {
        doc.setFillColor(37, 99, 235);
      }
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeLabel, badgeX + (badgeW / 2), badgeY + 3.8, { align: 'center' });

      // Cabeçalho da tabela
      let tableY = 28;
      drawTableHeaderRow(tableY, isFemaleSection);
      let rowY = tableY + 6.5;
      const rowHeight = 6.8;

      if (sortedList.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Nenhum participante deste gênero cadastrado no evento.', leftMargin + 6, rowY + 10);
        return;
      }

      sortedList.forEach((reg, idx) => {
        // Quebra de página suave caso atinja o limite inferior
        if (rowY + rowHeight > 275) {
          doc.addPage();
          // Header de continuação
          const contBannerH = 9;
          if (isFemaleSection) {
            doc.setFillColor(131, 24, 67);
          } else {
            doc.setFillColor(15, 23, 42);
          }
          doc.roundedRect(leftMargin, 10, contentW, contBannerH, 1.5, 1.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(`${sectionTitle} — (Continuação)`, leftMargin + 6, 16);

          tableY = 21;
          drawTableHeaderRow(tableY, isFemaleSection);
          rowY = tableY + 6.5;
        }

        // Fundo alternado zebrado
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(leftMargin, rowY, contentW, rowHeight, 'F');
        }

        // 1. Número
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(String(idx + 1), colX.num + (colX.numW / 2), rowY + 4.5, { align: 'center' });

        // 2. Código
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text(truncate(reg.registration_code, 15), colX.code + 2, rowY + 4.5);

        // 3. Nome
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(truncate(reg.full_name, 28), colX.name + 2, rowY + 4.5);

        // 4. Contato / WhatsApp
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(truncate(reg.phone || '-', 16), colX.phone + 2, rowY + 4.5);

        // 5. Pastor / Discipulador
        const leader = reg.pastor_name || reg.discipler_name || '-';
        doc.text(truncate(leader, 18), colX.pastor + 2, rowY + 4.5);

        // 6. Tamanho da Blusa
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(reg.shirt_size || '-', colX.shirt + (colX.shirtW / 2), rowY + 4.5, { align: 'center' });

        // 7. Transporte
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(truncate(reg.transport_type || '-', 9), colX.transp + (colX.transpW / 2), rowY + 4.5, { align: 'center' });

        // 8. Status Badge Pill
        const pillW = 17;
        const pillH = 4.2;
        const pillX = colX.status + (colX.statusW - pillW) / 2;
        const pillY = rowY + 1.3;

        if (isPaid(reg.payment_status)) {
          doc.setFillColor(220, 252, 231); // emerald-100
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(21, 128, 61);
          doc.text('PAGO', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        } else if (reg.payment_status === 'recusado' || reg.payment_status === 'cancelado') {
          doc.setFillColor(254, 226, 226); // rose-100
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(185, 28, 28);
          doc.text('RECUSADO', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        } else {
          doc.setFillColor(254, 243, 199); // amber-100
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(180, 83, 9);
          doc.text('PENDENTE', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        }

        // Linha divisória horizontal sutil
        doc.setDrawColor(241, 245, 249);
        doc.line(leftMargin, rowY + rowHeight, leftMargin + contentW, rowY + rowHeight);

        rowY += rowHeight;
      });

      // Linha de Subtotal da Seção
      if (rowY + 8 > 275) {
        doc.addPage();
        rowY = 15;
      }
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(leftMargin, rowY + 1, contentW, 6.5, 1, 1, 'FD');

      const secPagos = sortedList.filter(r => isPaid(r.payment_status)).length;
      const secPendentes = sortedList.filter(r => isPending(r.payment_status)).length;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Subtotal ${sectionTitle}: ${sortedList.length} participantes`, leftMargin + 6, rowY + 5.2);
      doc.text(`Confirmados (Pagos): ${secPagos}   |   Pendentes: ${secPendentes}`, leftMargin + contentW - 6, rowY + 5.2, { align: 'right' });
    };

    // Renderiza Lista de Homens (inicia na Página 2)
    doc.addPage();
    renderParticipantSection('LISTA DE PARTICIPANTES — HOMENS', 'MASCULINO', menList, false);

    // Renderiza Lista de Mulheres na sequência (em página dedicada)
    doc.addPage();
    renderParticipantSection('LISTA DE PARTICIPANTES — MULHERES', 'FEMININO', womenList, true);

    // Se houver participantes com gênero não informado, adiciona seção para garantir integridade
    if (otherGenderList.length > 0) {
      doc.addPage();
      renderParticipantSection('PARTICIPANTES — OUTROS / NÃO INFORMADO', 'DIVERSOS', otherGenderList, false);
    }

    // =========================================================================
    // NUMERAÇÃO GLOBAL DE PÁGINAS E RODAPÉ PADRONIZADO
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, 287, leftMargin + contentW, 287);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Ecclesia SaaS • ${event.title.substring(0, 42)} • Relatório Oficial de Participantes`, leftMargin, 291);
      doc.text(`Página ${p} de ${totalPages}`, leftMargin + contentW, 291, { align: 'right' });
    }

    // Dispara o download automático do PDF
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${event.slug || 'evento'}.pdf`;
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
    
    const bannerBase64 = event.banner_url ? await paidEventRegistrationService.getImageBase64('paid-event-banners', event.banner_url) : '';

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
      const posOnPage = i % 9;
      const col = posOnPage % 3;
      const row = Math.floor(posOnPage / 3);

      if (posOnPage === 0 && i > 0) {
        doc.addPage();
      }

      const x = marginX + (col * badgeW);
      const y = marginY + (row * badgeH);

      const pBase64 = reg.photo_url ? await paidEventRegistrationService.getImageBase64('event-participant-photos', reg.photo_url) : '';

      // Fundo Escuro do Crachá
      doc.setFillColor(24, 24, 27); // zinc-900
      doc.roundedRect(x, y, badgeW, badgeH, 2, 2, 'F');

      // Topo Roxo / Banner
      doc.setFillColor(139, 92, 246); // violet-500
      doc.rect(x, y, badgeW, 25, 'F');
      if (bannerBase64) {
        try {
          doc.addImage(bannerBase64, 'JPEG', x, y, badgeW, 25);
          try {
            doc.setGState(new (doc as any).GState({opacity: 0.4}));
            doc.setFillColor(0, 0, 0);
            doc.rect(x, y, badgeW, 25, 'F');
            doc.setGState(new (doc as any).GState({opacity: 1.0}));
          } catch (e) {}
        } catch (e) {}
      }

      // Nome do Evento no Topo - REMOVED as per user request to leave banner clean
      /*
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(event.title.toUpperCase(), badgeW - 4);
      doc.text(titleLines, x + (badgeW / 2), y + 12, { align: 'center' });
      */

      // Foto do Participante
      const photoY = y + 28;
      doc.setFillColor(50, 50, 50);
      doc.rect(x + 14, photoY, 26, 26, 'F');
      if (pBase64) {
        try {
          doc.addImage(pBase64, 'JPEG', x + 14, photoY, 26, 26);
        } catch (e) {}
      }

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
