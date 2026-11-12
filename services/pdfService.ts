import { jsPDF } from 'jspdf';
import { PaidEventRegistration, PaidEvent } from '../types';
import { paidEventRegistrationService } from './paidEventRegistrationService';

export type BadgeModelType = 'corporate_10' | 'medium_4' | 'large_2';

export interface BadgeModelOption {
  id: BadgeModelType;
  title: string;
  badgeDimensions: string;
  perPageLabel: string;
  capacityText: string;
  description: string;
  recommendedFor: string;
}

export const BADGE_MODELS: BadgeModelOption[] = [
  {
    id: 'corporate_10',
    title: 'Padrão Corporativo / Cartão de Crédito',
    badgeDimensions: '8,5 x 5,4 cm',
    perPageLabel: '10 crachás por folha A4',
    capacityText: 'Dispostos em 2 colunas de 5 crachás cada',
    description: 'Formato clássico cartão (CR-80 horizontal) com foto lateral grande, nome em destaque, identificação de equipe e margens seguras para corte.',
    recommendedFor: 'Ideal para porta-crachás rígidos, clips jacaré e crachás compactos com economia máxima de papel.'
  },
  {
    id: 'medium_4',
    title: 'Credencial Média para Eventos',
    badgeDimensions: '9 x 12 cm',
    perPageLabel: '4 crachás por folha A4',
    capacityText: 'Dispostos em 2 colunas de 2 crachás cada',
    description: 'Tamanho padrão de encontros, retiros e seminários. Foto centralizada grande, nome de alta visibilidade e tarja de identificação.',
    recommendedFor: 'O modelo mais utilizado para eventos de fim de semana, com porta-crachá plástico ou cordão direto.'
  },
  {
    id: 'large_2',
    title: 'Credencial Grande para Congressos',
    badgeDimensions: '10 x 14 cm',
    perPageLabel: '2 crachás por folha A4',
    capacityText: 'Dispostos em 2 crachás verticais centralizados',
    description: 'Formato imponente de grandes convenções e congressos nacionais. Foto extra grande, tipografia imponente e leitura fácil à distância.',
    recommendedFor: 'Recomendado para conferências, congressos estaduais/nacionais e credenciamento VIP.'
  }
];

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

    // Classificação e Métricas Robustas com Dados Reais
    const isPaid = (status: string) => status === 'pago_confirmado' || status === 'pago' || status === 'confirmed';
    const isPending = (status: string) =>
      ['aguardando_comprovante', 'comprovante_enviado', 'em_analise', 'pending', 'aguardando'].includes(status) ||
      (!isPaid(status) && status !== 'recusado' && status !== 'cancelado');

    const isMale = (gender?: string) => {
      const g = (gender || '').trim().toLowerCase();
      return g.startsWith('m') || g === 'homem';
    };
    const isFemale = (gender?: string) => {
      const g = (gender || '').trim().toLowerCase();
      return g.startsWith('f') || g === 'mulher';
    };

    const totalInscritos = registrations.length;
    const totalPagos = registrations.filter(r => isPaid(r.payment_status)).length;
    const totalPendentes = registrations.filter(r => isPending(r.payment_status)).length;
    const totalRecusados = registrations.filter(r => r.payment_status === 'recusado' || r.payment_status === 'cancelado').length;

    // Segmentação de Participantes vs Colaboradores
    const colaboradores = registrations.filter(r => r.registration_type === 'colaborador');
    const participantes = registrations.filter(r => (r.registration_type || 'participante') !== 'colaborador');
    const totalColaboradores = colaboradores.length;
    const totalParticipantes = participantes.length;

    // Precificação Dedicada
    const pricePart = event.price || 0;
    const priceColab = (event.price_collaborator !== undefined && event.price_collaborator !== null) ? Number(event.price_collaborator) : 0;
    const hasColabPrice = priceColab > 0;

    const getRegPrice = (r: PaidEventRegistration) => {
      if (r.amount_expected !== undefined && r.amount_expected !== null) {
        return Number(r.amount_expected);
      }
      return r.registration_type === 'colaborador' && hasColabPrice ? priceColab : pricePart;
    };

    const pagosPart = participantes.filter(r => isPaid(r.payment_status));
    const pagosColab = colaboradores.filter(r => isPaid(r.payment_status));
    const pendPart = participantes.filter(r => isPending(r.payment_status));
    const pendColab = colaboradores.filter(r => isPending(r.payment_status));

    const totalArrecadadoPart = pagosPart.reduce((acc, r) => acc + getRegPrice(r), 0);
    const totalArrecadadoColab = pagosColab.reduce((acc, r) => acc + getRegPrice(r), 0);
    const totalArrecadado = totalArrecadadoPart + totalArrecadadoColab;

    const totalPendentePart = pendPart.reduce((acc, r) => acc + getRegPrice(r), 0);
    const totalPendenteColab = pendColab.reduce((acc, r) => acc + getRegPrice(r), 0);
    const totalPendente = totalPendentePart + totalPendenteColab;

    const previsaoTotal = totalArrecadado + totalPendente;

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

    // 1. Cabeçalho Executivo com Dark Banner e detalhes modernos (h = 22mm)
    const headerH = 22;
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(leftMargin, 8, contentW, headerH, 2, 2, 'F');

    // Faixa de destaque roxa/índigo no topo do banner
    doc.setFillColor(124, 58, 237); // violet-600
    doc.roundedRect(leftMargin, 8, contentW, 2, 1, 1, 'F');

    // Identificação do Sistema (sem emojis)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(196, 181, 253); // violet-300
    doc.text('ECCLESIA SAAS  •  GESTÃO DE EVENTOS  •  RELATÓRIO EXECUTIVO OFICIAL', leftMargin + 6, 14.5);

    // Título do Evento
    doc.setFontSize(11.5);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(event.title.toUpperCase(), contentW - 12);
    doc.text(titleLines[0], leftMargin + 6, 20.5);

    // Metadados do Evento
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225); // slate-300
    const metaText = `Período: ${eventPeriod}    |    Local: ${event.location || 'Local a definir'}    |    Emissão: ${dataEmissao}`;
    doc.text(metaText, leftMargin + 6, 26);

    // 2. Linha 1 de KPIs: Inscritos, Pagos, Pendentes (y = 33, h = 17mm)
    const kpiY1 = 33;
    const cardW1 = 56.6;
    const cardGap1 = 6;
    const cardH1 = 17;

    // Card Total Inscritos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(leftMargin, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(String(totalInscritos), leftMargin + 5, kpiY1 + 11.5);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DE INSCRITOS', leftMargin + 19, kpiY1 + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    if (totalColaboradores > 0) {
      doc.text(`${totalParticipantes} Part.  •  ${totalColaboradores} Colaboradores`, leftMargin + 19, kpiY1 + 12);
    } else {
      doc.text('100% da base cadastrada', leftMargin + 19, kpiY1 + 12);
    }

    // Card Pagos / Confirmados
    const cardX2 = leftMargin + cardW1 + cardGap1;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(cardX2, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74); // emerald-600
    doc.text(String(totalPagos), cardX2 + 5, kpiY1 + 11.5);
    doc.setFontSize(6.5);
    doc.setTextColor(21, 128, 61);
    doc.text('PAGOS / CONFIRMADOS', cardX2 + 19, kpiY1 + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(22, 163, 74);
    doc.text(`${pctPagos}% dos inscritos pagos`, cardX2 + 19, kpiY1 + 12);

    // Card Pendentes / Aguardando
    const cardX3 = cardX2 + cardW1 + cardGap1;
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(254, 240, 138); // amber-200
    doc.roundedRect(cardX3, kpiY1, cardW1, cardH1, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(String(totalPendentes), cardX3 + 5, kpiY1 + 11.5);
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text('PENDENTES / EM ANÁLISE', cardX3 + 19, kpiY1 + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`${pctPendentes}% a confirmar`, cardX3 + 19, kpiY1 + 12);

    // 3. Linha 2 de KPIs: Homens, Mulheres, Carro, Ônibus (y = 53, h = 16mm)
    const kpiY2 = 53;
    const cardW2 = 43;
    const cardGap2 = 3.33;
    const cardH2 = 16;

    // Card Homens
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(leftMargin, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(String(totalHomens), leftMargin + 4, kpiY2 + 11);
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text('HOMENS (MASC.)', leftMargin + 14, kpiY2 + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${pctHomens}% do público`, leftMargin + 14, kpiY2 + 11.5);

    // Card Mulheres
    const card2X2 = leftMargin + cardW2 + cardGap2;
    doc.setFillColor(253, 242, 248); // pink-50
    doc.setDrawColor(251, 207, 232);
    doc.roundedRect(card2X2, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(190, 24, 93); // pink-700
    doc.text(String(totalMulheres), card2X2 + 4, kpiY2 + 11);
    doc.setFontSize(6);
    doc.setTextColor(131, 24, 67);
    doc.text('MULHERES (FEM.)', card2X2 + 14, kpiY2 + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(219, 39, 119);
    doc.text(`${pctMulheres}% do público`, card2X2 + 14, kpiY2 + 11.5);

    // Card Carro
    const card2X3 = card2X2 + cardW2 + cardGap2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(card2X3, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(51, 65, 85);
    doc.text(String(totalCarro), card2X3 + 4, kpiY2 + 11);
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text('VÃO DE CARRO', card2X3 + 13, kpiY2 + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${pctCarro}% transporte`, card2X3 + 13, kpiY2 + 11.5);

    // Card Ônibus
    const card2X4 = card2X3 + cardW2 + cardGap2;
    doc.setFillColor(250, 245, 255); // purple-50
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(card2X4, kpiY2, cardW2, cardH2, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(126, 34, 206); // purple-700
    doc.text(String(totalOnibus), card2X4 + 4, kpiY2 + 11);
    doc.setFontSize(6);
    doc.setTextColor(107, 33, 168);
    doc.text('VÃO DE ÔNIBUS', card2X4 + 13, kpiY2 + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(147, 51, 234);
    doc.text(`${pctOnibus}% transporte`, card2X4 + 13, kpiY2 + 11.5);

    // 4. Seção Camisas por Tamanho (Homem vs Mulher) (y = 72, h = 63mm)
    const shirtsY = 72;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('DISTRIBUIÇÃO DE CAMISAS POR TAMANHO E GÊNERO', leftMargin, shirtsY + 1.5);

    const shirtBoxW = 88;
    const shirtBoxH = 58;
    const shirtBoxY = shirtsY + 4;

    // Helper para desenhar a tabela de camisas por gênero (sem emojis para evitar caracteres corrompidos)
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
      doc.roundedRect(x, shirtBoxY, shirtBoxW, 6.5, 2, 2, 'F');
      doc.rect(x, shirtBoxY + 4.5, shirtBoxW, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(title, x + 4, shirtBoxY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Total: ${totalShirts} un.`, x + shirtBoxW - 4, shirtBoxY + 4.5, { align: 'right' });

      // Cabeçalho das colunas da tabela de camisas
      const tableHeadY = shirtBoxY + 6.5;
      doc.setFillColor(241, 245, 249);
      doc.rect(x, tableHeadY, shirtBoxW, 4.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TAMANHO', x + 4, tableHeadY + 3.2);
      doc.text('QUANTIDADE', x + 24, tableHeadY + 3.2);
      doc.text('PROPORÇÃO VISUAL', x + 46, tableHeadY + 3.2);
      doc.text('%', x + shirtBoxW - 4, tableHeadY + 3.2, { align: 'right' });

      // Linhas dos tamanhos (PP, P, M, G, GG, XG, XXG)
      let rowY = tableHeadY + 4.5;
      const rowHeight = 5.5;
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
        doc.roundedRect(x + 4, rowY + 0.9, 9, 3.7, 0.8, 0.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        if (isMen) {
          doc.setTextColor(30, 58, 138);
        } else {
          doc.setTextColor(131, 24, 67);
        }
        doc.text(size, x + 8.5, rowY + 3.6, { align: 'center' });

        // Quantidade
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${count} un.`, x + 24, rowY + 3.7);

        // Barra de progresso visual
        const barWidth = 26;
        const fillW = Math.max(1, Math.round((count / maxCount) * barWidth));
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(x + 46, rowY + 1.8, barWidth, 2, 0.6, 0.6, 'F');
        if (count > 0) {
          if (isMen) {
            doc.setFillColor(37, 99, 235);
          } else {
            doc.setFillColor(219, 39, 119);
          }
          doc.roundedRect(x + 46, rowY + 1.8, fillW, 2, 0.6, 0.6, 'F');
        }

        // Percentual
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`${pSize}%`, x + shirtBoxW - 4, rowY + 3.7, { align: 'right' });

        // Linha divisória sutil
        doc.setDrawColor(241, 245, 249);
        doc.line(x + 4, rowY + rowHeight, x + shirtBoxW - 4, rowY + rowHeight);

        rowY += rowHeight;
      });

      // Rodapé do card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, shirtBoxY + shirtBoxH - 5.5, shirtBoxW, 5.5, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text(`Subtotal: ${totalShirts} camisas encomendadas`, x + 4, shirtBoxY + shirtBoxH - 1.8);
    };

    // Renderiza Homens à esquerda e Mulheres à direita (sem emojis para evitar mojibake)
    drawShirtTable(leftMargin, 'CAMISAS — HOMENS', totalCamisasHomens, menShirts, true);
    drawShirtTable(leftMargin + shirtBoxW + 6, 'CAMISAS — MULHERES', totalCamisasMulheres, womenShirts, false);

    // Banner de Resumo Geral de Camisas a Produzir (y = 138, h = 12mm - centralizado e empilhado para nunca sobrepor)
    const shirtSummaryY = shirtBoxY + shirtBoxH + 3;
    const shirtSummaryH = 12;
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(leftMargin, shirtSummaryY, contentW, shirtSummaryH, 2, 2, 'FD');

    // Linha 1: Título em verde escuro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(21, 128, 61);
    doc.text('TOTAL GERAL DE CAMISETAS PARA PRODUÇÃO / CONFECÇÃO', leftMargin + (contentW / 2), shirtSummaryY + 4.5, { align: 'center' });

    // Linha 2: Quantidade e distribuição em destaque
    doc.setFontSize(8.5);
    doc.setTextColor(22, 163, 74);
    const summaryShirtsText = `${totalGeralCamisas} PEÇAS  •  ${totalCamisasHomens} Masculinas  •  ${totalCamisasMulheres} Femininas`;
    doc.text(summaryShirtsText, leftMargin + (contentW / 2), shirtSummaryY + 9.5, { align: 'center' });

    // 5. Seção Logística & Financeiro (y = 154, h = 44mm)
    const logFinY = shirtSummaryY + shirtSummaryH + 4;
    const boxLogW = 88;
    const boxLogH = 43;

    // Card Logística de Transporte (sem emojis)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, logFinY, boxLogW, boxLogH, 2, 2, 'FD');

    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(leftMargin, logFinY, boxLogW, 6.5, 2, 2, 'F');
    doc.rect(leftMargin, logFinY + 4.5, boxLogW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('LOGÍSTICA DE TRANSPORTE & EMBARQUE', leftMargin + 4, logFinY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);

    let transY = logFinY + 11;
    doc.text(`• Ônibus Coletivo: ${totalOnibus} passageiros (${pctOnibus}%)`, leftMargin + 5, transY);
    transY += 4.5;
    const frotaOnibus = Math.ceil(totalOnibus / 44) || (totalOnibus > 0 ? 1 : 0);
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`  Estimativa de frota: ~${frotaOnibus} ônibus rodoviário(s) (base 44 lug.)`, leftMargin + 5, transY);

    transY += 5.5;
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Carro Próprio: ${totalCarro} passageiros (${pctCarro}%)`, leftMargin + 5, transY);
    transY += 4.5;
    const frotaCarros = Math.ceil(totalCarro / 3) || (totalCarro > 0 ? 1 : 0);
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`  Estimativa de vagas: ~${frotaCarros} veículos particulares (média 3/carro)`, leftMargin + 5, transY);

    transY += 5.5;
    if (totalOutroTransp > 0) {
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`• Outros / Não informado: ${totalOutroTransp} participante(s)`, leftMargin + 5, transY);
      transY += 4.5;
    }

    // Mini barra comparativa de transporte
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(leftMargin + 5, transY, boxLogW - 10, 3.5, 0.8, 0.8, 'F');
    const busShareW = Math.round(((totalOnibus) / (totalInscritos || 1)) * (boxLogW - 10));
    if (busShareW > 0) {
      doc.setFillColor(147, 51, 234); // violeta para ônibus
      doc.roundedRect(leftMargin + 5, transY, busShareW, 3.5, 0.8, 0.8, 'F');
    }
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text('Distribuição: [Roxo = Ônibus]  |  [Cinza = Carro]', leftMargin + 5, transY + 6);

    // Card Controle Financeiro & Ocupação (sem emojis)
    const finX = leftMargin + boxLogW + 6;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(finX, logFinY, boxLogW, boxLogH, 2, 2, 'FD');

    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(finX, logFinY, boxLogW, 6.5, 2, 2, 'F');
    doc.rect(finX, logFinY + 4.5, boxLogW, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CONTROLE FINANCEIRO & VAGAS', finX + 4, logFinY + 4.5);

    let finItemY = logFinY + 10.5;
    const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);

    if (pricePart > 0 || hasColabPrice) {
      if (hasColabPrice) {
        doc.text(`• Valor Partic. / Colaborador:`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.text(`${formatBRL(pricePart)} / ${formatBRL(priceColab)}`, finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.2;

        doc.setFont('helvetica', 'normal');
        doc.text(`• Arrecadação Confirmada:`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(formatBRL(totalArrecadado), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 3.7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text(`  (Part: ${formatBRL(totalArrecadadoPart)} | Colab: ${formatBRL(totalArrecadadoColab)})`, finX + 5, finItemY);
        finItemY += 4.2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(51, 65, 85);
        doc.text(`• A Confirmar (${totalPendentes} pend.):`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(formatBRL(totalPendente), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.2;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`• Previsão Total do Evento:`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatBRL(previsaoTotal), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.8;
      } else {
        doc.text(`• Valor Unitário:`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.text(formatBRL(pricePart), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.text(`• Confirmado (${totalPagos} pagos):`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(formatBRL(totalArrecadado), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`• A Confirmar (${totalPendentes} pend.):`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(formatBRL(totalPendente), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`• Previsão Total do Evento:`, finX + 5, finItemY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatBRL(previsaoTotal), finX + boxLogW - 5, finItemY, { align: 'right' });
        finItemY += 5.2;
      }
    } else {
      doc.text(`• Inscrição: Gratuita / Sem Cobrança Direta`, finX + 5, finItemY);
      finItemY += 5.5;
    }

    // Ocupação do Evento
    const maxPart = event.max_participants || 0;
    const ocupacaoPct = maxPart > 0 ? Math.round((totalPagos / maxPart) * 100) : null;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    if (maxPart > 0) {
      doc.text(`Ocupação: ${ocupacaoPct}% (${totalPagos} pagos / ${maxPart} vagas)`, finX + 5, finItemY);
      finItemY += 3;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(finX + 5, finItemY, boxLogW - 10, 3, 0.8, 0.8, 'F');
      if (ocupacaoPct && ocupacaoPct > 0) {
        doc.setFillColor(22, 163, 74);
        doc.roundedRect(finX + 5, finItemY, Math.min(boxLogW - 10, Math.round(((ocupacaoPct) / 100) * (boxLogW - 10))), 3, 0.8, 0.8, 'F');
      }
    } else {
      doc.text(`Capacidade: Ilimitada / Sem teto cadastrado`, finX + 5, finItemY);
    }

    // 6. Bloco de Orientações da Coordenação (y = 201, h = 42mm - cabe perfeitamente na página 1 sem cortar)
    const guideY = logFinY + boxLogH + 4;
    const guideH = 42;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, guideY, contentW, guideH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('DIRETRIZES DA COORDENAÇÃO & ESTRUTURA DO RELATÓRIO', leftMargin + 6, guideY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    let gy = guideY + 11.5;
    const addGuideLine = (title: string, desc: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(title, leftMargin + 6, gy);
      const titleW = doc.getTextWidth(title);
      doc.setFont('helvetica', 'normal');
      doc.text(desc, leftMargin + 6 + titleW + 1.5, gy);
      gy += 5.2;
    };

    addGuideLine('• Listagem Nominal Segmentada:', 'A partir da Página 2, este relatório apresenta as listas completas separadas por gênero: Homens e Mulheres.');
    addGuideLine('• Equipe de Colaboradores:', 'Colaboradores possuem valor dedicado e funções de apoio (Cozinha, Intercessão, etc.) identificadas.');
    addGuideLine('• Credenciamento e Presença:', 'Utilize as listas para registrar a presença física, validação dos comprovantes e entrega das camisetas.');
    addGuideLine('• Transporte e Embarque:', 'Inscritos no transporte coletivo devem apresentar-se no local no horário indicado munidos de documento com foto.');
    addGuideLine('• Liderança e Apoio:', 'Contatos telefônicos de discipuladores e pastores encontram-se descritos para pronto acionamento.');
    addGuideLine('• Produção das Camisetas:', 'A relação exata de tamanhos das peças acima deve ser utilizada para conferência e distribuição dos kits.');

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

        // 3. Nome e Identificação de Equipe
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        const isColab = reg.registration_type === 'colaborador';
        if (isColab) {
          doc.text(truncate(reg.full_name, 22), colX.name + 2, rowY + 3.2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.setTextColor(180, 83, 9); // amber-700
          const roleLabel = `EQUIPE: ${(reg.collaborator_role || 'COLABORADOR').toUpperCase()}`;
          doc.text(truncate(roleLabel, 26), colX.name + 2, rowY + 5.8);
        } else {
          doc.text(truncate(reg.full_name, 28), colX.name + 2, rowY + 4.5);
        }

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

    // Helper para renderizar a seção exclusiva de colaboradores/equipe de trabalho
    const renderCollaboratorSection = () => {
      if (colaboradores.length === 0) return;
      doc.addPage();

      const sortedColabs = [...colaboradores].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

      // Top Banner Âmbar/Dourado Escuro
      const bannerH = 15;
      doc.setFillColor(120, 53, 15); // amber-900
      doc.roundedRect(leftMargin, 10, contentW, bannerH, 2, 2, 'F');

      // Faixa de destaque dourada
      doc.setFillColor(245, 158, 11); // amber-500
      doc.roundedRect(leftMargin, 10, contentW, 2, 1, 1, 'F');

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text('EQUIPE DE TRABALHO & COLABORADORES', leftMargin + 6, 17.5);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(254, 243, 199); // amber-100
      doc.text(`${event.title.toUpperCase()}  •  TOTAL: ${sortedColabs.length} COLABORADORES ESCALADOS`, leftMargin + 6, 22);

      // Badge à direita
      const badgeW = 32;
      const badgeH = 5.5;
      const badgeX = leftMargin + contentW - badgeW - 5;
      const badgeY = 14.5;
      doc.setFillColor(217, 119, 6);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('EQUIPE DE APOIO', badgeX + (badgeW / 2), badgeY + 3.8, { align: 'center' });

      // Colunas da Tabela de Colaboradores:
      const cCol = {
        num: leftMargin, numW: 7,
        code: leftMargin + 7, codeW: 21,
        name: leftMargin + 7 + 21, nameW: 45,
        role: leftMargin + 7 + 21 + 45, roleW: 32,
        phone: leftMargin + 7 + 21 + 45 + 32, phoneW: 25,
        shirt: leftMargin + 7 + 21 + 45 + 32 + 25, shirtW: 10,
        transp: leftMargin + 7 + 21 + 45 + 32 + 25 + 10, transpW: 14,
        val: leftMargin + 7 + 21 + 45 + 32 + 25 + 10 + 14, valW: 14,
        status: leftMargin + 7 + 21 + 45 + 32 + 25 + 10 + 14 + 14, statusW: 14,
      };

      const drawColabHeaderRow = (y: number) => {
        const h = 6.5;
        doc.setFillColor(120, 53, 15); // amber-900
        doc.roundedRect(leftMargin, y, contentW, h, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(255, 255, 255);

        doc.text('#', cCol.num + (cCol.numW / 2), y + 4.2, { align: 'center' });
        doc.text('CÓDIGO', cCol.code + 2, y + 4.2);
        doc.text('COLABORADOR', cCol.name + 2, y + 4.2);
        doc.text('FUNÇÃO / SETOR', cCol.role + 2, y + 4.2);
        doc.text('CONTATO', cCol.phone + 2, y + 4.2);
        doc.text('BLUSA', cCol.shirt + (cCol.shirtW / 2), y + 4.2, { align: 'center' });
        doc.text('TRANSP.', cCol.transp + (cCol.transpW / 2), y + 4.2, { align: 'center' });
        doc.text('VALOR', cCol.val + (cCol.valW / 2), y + 4.2, { align: 'center' });
        doc.text('STATUS', cCol.status + (cCol.statusW / 2), y + 4.2, { align: 'center' });
      };

      let tableY = 28;
      drawColabHeaderRow(tableY);
      let rowY = tableY + 6.5;
      const rowHeight = 6.8;

      sortedColabs.forEach((reg, idx) => {
        if (rowY + rowHeight > 275) {
          doc.addPage();
          doc.setFillColor(120, 53, 15);
          doc.roundedRect(leftMargin, 10, contentW, 9, 1.5, 1.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('EQUIPE DE TRABALHO & COLABORADORES — (Continuação)', leftMargin + 6, 16);

          tableY = 21;
          drawColabHeaderRow(tableY);
          rowY = tableY + 6.5;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(254, 252, 232); // amber-50 alternado
          doc.rect(leftMargin, rowY, contentW, rowHeight, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(String(idx + 1), cCol.num + (cCol.numW / 2), rowY + 4.5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text(truncate(reg.registration_code, 14), cCol.code + 2, rowY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(truncate(reg.full_name, 26), cCol.name + 2, rowY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(180, 83, 9);
        doc.text(truncate(reg.collaborator_role || 'Apoio Geral', 20), cCol.role + 2, rowY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(truncate(reg.phone || '-', 15), cCol.phone + 2, rowY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(reg.shirt_size || '-', cCol.shirt + (cCol.shirtW / 2), rowY + 4.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(truncate(reg.transport_type || '-', 8), cCol.transp + (cCol.transpW / 2), rowY + 4.5, { align: 'center' });

        // Valor
        const regVal = getRegPrice(reg);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(51, 65, 85);
        doc.text(regVal > 0 ? `R$ ${Math.round(regVal)}` : 'Grátis', cCol.val + (cCol.valW / 2), rowY + 4.5, { align: 'center' });

        // Status Pill
        const pillW = 12;
        const pillH = 4.2;
        const pillX = cCol.status + (cCol.statusW - pillW) / 2;
        const pillY = rowY + 1.3;

        if (isPaid(reg.payment_status)) {
          doc.setFillColor(220, 252, 231);
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(21, 128, 61);
          doc.text('PAGO', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        } else if (reg.payment_status === 'recusado' || reg.payment_status === 'cancelado') {
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(185, 28, 28);
          doc.text('RECUSADO', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        } else {
          doc.setFillColor(254, 243, 199);
          doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(180, 83, 9);
          doc.text('PEND.', pillX + (pillW / 2), pillY + 3, { align: 'center' });
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(leftMargin, rowY + rowHeight, leftMargin + contentW, rowY + rowHeight);

        rowY += rowHeight;
      });

      // Subtotal da Equipe de Colaboradores
      if (rowY + 8 > 275) {
        doc.addPage();
        rowY = 15;
      }
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(leftMargin, rowY + 1, contentW, 6.5, 1, 1, 'FD');

      const colabPagos = sortedColabs.filter(r => isPaid(r.payment_status)).length;
      const colabPendentes = sortedColabs.filter(r => isPending(r.payment_status)).length;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(146, 64, 14);
      doc.text(`Subtotal Equipe: ${sortedColabs.length} colaboradores`, leftMargin + 6, rowY + 5.2);
      doc.text(`Confirmados: ${colabPagos} (${formatBRL(totalArrecadadoColab)})   |   Pendentes: ${colabPendentes} (${formatBRL(totalPendenteColab)})`, leftMargin + contentW - 6, rowY + 5.2, { align: 'right' });
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

    // Se houver colaboradores, renderiza seção dedicada da equipe de apoio
    if (colaboradores.length > 0) {
      renderCollaboratorSection();
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
   * Gera PDF do Crachá individual conforme o modelo selecionado.
   */
  async downloadParticipantBadge(
    reg: PaidEventRegistration,
    event: PaidEvent,
    model: BadgeModelType = 'medium_4',
    churchLogo?: string
  ): Promise<void> {
    await this.generateBadgesByModelPDF(event, [reg], model);
  },

  /**
   * Gera PDF A4 com crachás conforme um dos 3 modelos homologados:
   * 1. corporate_10: Padrão Corporativo / Cartão (8,5 x 5,4 cm) - 10 por folha A4 (2 col x 5 lin)
   * 2. medium_4: Credencial Média para Eventos (9 x 12 cm) - 4 por folha A4 (2 col x 2 lin)
   * 3. large_2: Credencial Grande para Congressos (10 x 14 cm) - 2 por folha A4 (centralizados)
   */
  async generateBadgesByModelPDF(
    event: PaidEvent,
    registrations: PaidEventRegistration[],
    model: BadgeModelType = 'medium_4',
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    if (!registrations || registrations.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const bannerBase64 = event.banner_url ? await paidEventRegistrationService.getImageBase64('paid-event-banners', event.banner_url) : '';

    const truncate = (str: string | undefined | null, maxLen: number): string => {
      if (!str) return '';
      const trimmed = str.trim();
      if (trimmed.length <= maxLen) return trimmed;
      return trimmed.substring(0, maxLen - 1) + '…';
    };

    const perPage = model === 'corporate_10' ? 10 : model === 'medium_4' ? 4 : 2;

    for (let i = 0; i < registrations.length; i++) {
      if (onProgress) onProgress(i + 1, registrations.length);
      const reg = registrations[i];
      const posOnPage = i % perPage;

      if (posOnPage === 0 && i > 0) {
        doc.addPage();
      }

      const pBase64 = reg.photo_url ? await paidEventRegistrationService.getImageBase64('event-participant-photos', reg.photo_url) : '';
      const isColab = reg.registration_type === 'colaborador';
      const roleText = (reg.collaborator_role || 'Apoio Geral').toUpperCase();

      // =======================================================================
      // MODELO 1: Padrão Corporativo / Cartão de Crédito (8,5 x 5,4 cm)
      // 10 crachás por folha A4 (2 colunas x 5 linhas)
      // =======================================================================
      if (model === 'corporate_10') {
        const badgeW = 85;
        const badgeH = 54;
        const col = posOnPage % 2;
        const row = Math.floor(posOnPage / 2);
        const x = 15 + col * (badgeW + 10);
        const y = 9.5 + row * (badgeH + 2);

        // Fundo escuro moderno
        doc.setFillColor(24, 24, 27); // zinc-900
        doc.roundedRect(x, y, badgeW, badgeH, 2.5, 2.5, 'F');

        // Tarja do topo (9mm)
        doc.setFillColor(124, 58, 237); // violet-600
        doc.roundedRect(x, y, badgeW, 9, 2.5, 2.5, 'F');
        doc.rect(x, y + 6, badgeW, 3, 'F');

        // Título do Evento no Topo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(truncate(event.title.toUpperCase(), 42), x + 4, y + 6);

        // Foto Grande à Esquerda (34 x 38mm)
        const xFoto = x + 4;
        const yFoto = y + 12;
        const wFoto = 33;
        const hFoto = 38;

        doc.setFillColor(39, 39, 42); // zinc-800
        doc.roundedRect(xFoto, yFoto, wFoto, hFoto, 2, 2, 'F');
        if (pBase64) {
          try {
            doc.addImage(pBase64, 'JPEG', xFoto, yFoto, wFoto, hFoto);
          } catch (e) {}
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(113, 113, 122);
          const initials = reg.full_name.split(' ').map(n => n[0]).slice(0, 2).join('');
          doc.text(initials, xFoto + (wFoto / 2), yFoto + (hFoto / 2) + 5, { align: 'center' });
        }
        // Moldura fina da foto
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.roundedRect(xFoto, yFoto, wFoto, hFoto, 2, 2, 'S');

        // Dados do Inscrito (Lado Direito, 44mm úteis)
        const xInfo = x + 40;
        const wInfo = 41;

        // Nome em Destaque
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        const nameLines = doc.splitTextToSize(reg.full_name.toUpperCase(), wInfo);
        doc.text(nameLines.slice(0, 2), xInfo, y + 17);

        // Tag Categoria / Equipe
        const tagY = nameLines.length > 1 ? y + 26 : y + 24;
        if (isColab) {
          doc.setFillColor(217, 119, 6); // amber-600
          doc.roundedRect(xInfo, tagY, wInfo, 4.5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`EQUIPE • ${truncate(roleText, 18)}`, xInfo + (wInfo / 2), tagY + 3.2, { align: 'center' });
        } else {
          doc.setFillColor(16, 185, 129); // emerald-500
          doc.roundedRect(xInfo, tagY, wInfo, 4.5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text('PARTICIPANTE', xInfo + (wInfo / 2), tagY + 3.2, { align: 'center' });
        }

        // Metadados na Base
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(161, 161, 170); // zinc-400
        doc.text(`CÓD: ${reg.registration_code}`, xInfo, y + 36);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(212, 212, 216); // zinc-300
        if (reg.pastor_name) {
          doc.text(`PASTOR: ${truncate(reg.pastor_name.toUpperCase(), 20)}`, xInfo, y + 41);
        }
        doc.text(`BLUSA: ${reg.shirt_size || '-'}  •  TRANSP: ${truncate(reg.transport_type || '-', 9)}`, xInfo, y + 46);

        // Guia de corte tracejada
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([1, 1], 0);
        doc.roundedRect(x, y, badgeW, badgeH, 2.5, 2.5, 'S');
        doc.setLineDashPattern([], 0);
      }

      // =======================================================================
      // MODELO 2: Credencial Média para Eventos (9 x 12 cm)
      // 4 crachás por folha A4 (2 colunas x 2 linhas)
      // =======================================================================
      else if (model === 'medium_4') {
        const badgeW = 90;
        const badgeH = 120;
        const col = posOnPage % 2;
        const row = Math.floor(posOnPage / 2);
        const x = 10 + col * (badgeW + 10);
        const y = 19 + row * (badgeH + 19);

        // Fundo escuro do crachá
        doc.setFillColor(24, 24, 27); // zinc-900
        doc.roundedRect(x, y, badgeW, badgeH, 3, 3, 'F');

        // Banner Superior (30mm)
        doc.setFillColor(124, 58, 237); // violet-600
        doc.roundedRect(x, y, badgeW, 30, 3, 3, 'F');
        doc.rect(x, y + 25, badgeW, 5, 'F');
        if (bannerBase64) {
          try {
            doc.addImage(bannerBase64, 'JPEG', x, y, badgeW, 30);
            try {
              doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
              doc.setFillColor(0, 0, 0);
              doc.rect(x, y, badgeW, 30, 'F');
              doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            } catch (e) {}
          } catch (e) {}
        }

        // Título do Evento no Banner
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        const tLines = doc.splitTextToSize(event.title.toUpperCase(), badgeW - 8);
        doc.text(tLines[0], x + (badgeW / 2), y + 11, { align: 'center' });

        // Furo de Cordão (Guia Visual)
        doc.setFillColor(39, 39, 42);
        doc.circle(x + (badgeW / 2), y + 4.5, 2.2, 'F');

        // Foto Grande Centralizada (44 x 44mm)
        const wFoto = 44;
        const hFoto = 44;
        const xFoto = x + (badgeW - wFoto) / 2;
        const yFoto = y + 21;

        // Moldura Branca
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xFoto - 1, yFoto - 1, wFoto + 2, hFoto + 2, 2.5, 2.5, 'F');

        doc.setFillColor(39, 39, 42);
        doc.rect(xFoto, yFoto, wFoto, hFoto, 'F');
        if (pBase64) {
          try {
            doc.addImage(pBase64, 'JPEG', xFoto, yFoto, wFoto, hFoto);
          } catch (e) {}
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.setTextColor(113, 113, 122);
          const initials = reg.full_name.split(' ').map(n => n[0]).slice(0, 2).join('');
          doc.text(initials, xFoto + (wFoto / 2), yFoto + (hFoto / 2) + 6, { align: 'center' });
        }

        // Nome do Inscrito em Grande Destaque
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(255, 255, 255);
        const nLines = doc.splitTextToSize(reg.full_name.toUpperCase(), badgeW - 8);
        doc.text(nLines.slice(0, 2), x + (badgeW / 2), y + 73, { align: 'center' });

        // Tarja de Categoria / Equipe
        const bY = nLines.length > 1 ? y + 84 : y + 82;
        if (isColab) {
          doc.setFillColor(217, 119, 6); // amber-600
          doc.roundedRect(x + 10, bY, badgeW - 20, 6, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(`EQUIPE • ${truncate(roleText, 24)}`, x + (badgeW / 2), bY + 4.2, { align: 'center' });
        } else {
          doc.setFillColor(124, 58, 237); // violet-600
          doc.roundedRect(x + 18, bY, badgeW - 36, 6, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(255, 255, 255);
          doc.text('PARTICIPANTE', x + (badgeW / 2), bY + 4.2, { align: 'center' });
        }

        // Divisória sutil
        doc.setDrawColor(45, 45, 55);
        doc.setLineWidth(0.3);
        doc.line(x + 10, y + 94, x + badgeW - 10, y + 94);

        // Bloco de Informações na Base
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(212, 212, 216);
        doc.text(`CÓD: ${reg.registration_code}`, x + (badgeW / 2), y + 100, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(161, 161, 170);
        if (reg.pastor_name) {
          doc.text(`PASTOR: ${truncate(reg.pastor_name.toUpperCase(), 32)}`, x + (badgeW / 2), y + 106, { align: 'center' });
        }
        doc.text(`BLUSA: ${reg.shirt_size || '-'}  •  TRANSPORTE: ${truncate(reg.transport_type || '-', 14)}`, x + (badgeW / 2), y + 111, { align: 'center' });

        // Guia de corte tracejada
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.roundedRect(x, y, badgeW, badgeH, 3, 3, 'S');
        doc.setLineDashPattern([], 0);
      }

      // =======================================================================
      // MODELO 3: Credencial Grande para Congressos (10 x 14 cm)
      // 2 crachás por folha A4 (centralizados)
      // =======================================================================
      else if (model === 'large_2') {
        const badgeW = 100;
        const badgeH = 140;
        const row = posOnPage % 2;
        const x = 55; // Centralizado em 210mm ((210 - 100) / 2)
        const y = 5.5 + row * (badgeH + 6); // 5.5mm topo, 6mm gap, 5.5mm base = 297mm

        // Fundo escuro premium
        doc.setFillColor(18, 18, 22);
        doc.roundedRect(x, y, badgeW, badgeH, 4, 4, 'F');

        // Banner Superior Amplo (36mm)
        doc.setFillColor(109, 40, 217); // violet-700
        doc.roundedRect(x, y, badgeW, 36, 4, 4, 'F');
        doc.rect(x, y + 30, badgeW, 6, 'F');
        if (bannerBase64) {
          try {
            doc.addImage(bannerBase64, 'JPEG', x, y, badgeW, 36);
            try {
              doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
              doc.setFillColor(0, 0, 0);
              doc.rect(x, y, badgeW, 36, 'F');
              doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            } catch (e) {}
          } catch (e) {}
        }

        // Título do Evento no Topo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        const tLines = doc.splitTextToSize(event.title.toUpperCase(), badgeW - 10);
        doc.text(tLines[0], x + (badgeW / 2), y + 13, { align: 'center' });

        // Furo de Cordão
        doc.setFillColor(28, 28, 35);
        doc.circle(x + (badgeW / 2), y + 5, 2.5, 'F');

        // Foto Extra Grande Centralizada (50 x 50mm)
        const wFoto = 50;
        const hFoto = 50;
        const xFoto = x + (badgeW - wFoto) / 2;
        const yFoto = y + 25;

        // Moldura Branca
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xFoto - 1.5, yFoto - 1.5, wFoto + 3, hFoto + 3, 3, 3, 'F');

        doc.setFillColor(39, 39, 42);
        doc.rect(xFoto, yFoto, wFoto, hFoto, 'F');
        if (pBase64) {
          try {
            doc.addImage(pBase64, 'JPEG', xFoto, yFoto, wFoto, hFoto);
          } catch (e) {}
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(24);
          doc.setTextColor(113, 113, 122);
          const initials = reg.full_name.split(' ').map(n => n[0]).slice(0, 2).join('');
          doc.text(initials, xFoto + (wFoto / 2), yFoto + (hFoto / 2) + 8, { align: 'center' });
        }

        // Nome do Inscrito em Tamanho Congresso
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        const nLines = doc.splitTextToSize(reg.full_name.toUpperCase(), badgeW - 10);
        doc.text(nLines.slice(0, 2), x + (badgeW / 2), y + 86, { align: 'center' });

        // Tarja de Identificação
        const bY = nLines.length > 1 ? y + 99 : y + 96;
        if (isColab) {
          doc.setFillColor(217, 119, 6); // amber-600
          doc.roundedRect(x + 12, bY, badgeW - 24, 7.5, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(`EQUIPE DE TRABALHO • ${truncate(roleText, 26)}`, x + (badgeW / 2), bY + 5.2, { align: 'center' });
        } else {
          doc.setFillColor(79, 70, 229); // indigo-600
          doc.roundedRect(x + 16, bY, badgeW - 32, 7.5, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text('CONGRESSISTA / PARTICIPANTE', x + (badgeW / 2), bY + 5.2, { align: 'center' });
        }

        // Bloco Inferior de Credenciamento
        const boxY = y + 109;
        doc.setFillColor(28, 28, 35);
        doc.roundedRect(x + 8, boxY, badgeW - 16, 24, 2.5, 2.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(228, 228, 231);
        doc.text(`CREDENCIAL: ${reg.registration_code}`, x + (badgeW / 2), boxY + 7, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(161, 161, 170);
        if (reg.pastor_name) {
          doc.text(`PASTOR / LIDERANÇA: ${truncate(reg.pastor_name.toUpperCase(), 34)}`, x + (badgeW / 2), boxY + 13, { align: 'center' });
        }
        doc.text(`KIT: BLUSA ${reg.shirt_size || '-'}  •  TRANSPORTE: ${truncate(reg.transport_type || '-', 16)}`, x + (badgeW / 2), boxY + 19, { align: 'center' });

        // Guia de corte tracejada
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(x, y, badgeW, badgeH, 4, 4, 'S');
        doc.setLineDashPattern([], 0);
      }
    }

    // Dispara o download automático do PDF
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const modelTag = model === 'corporate_10' ? 'cartao-10' : model === 'medium_4' ? 'media-4' : 'congresso-2';
    a.download = `crachas-${modelTag}-${event.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Gera PDF A4 com crachás (retrocompatibilidade padrão).
   */
  async generateBadgesBatchPDF(
    event: PaidEvent,
    registrations: PaidEventRegistration[]
  ): Promise<void> {
    const confirmed = registrations.filter(r => r.payment_status === 'pago_confirmado');
    await this.generateBadgesByModelPDF(event, confirmed.length > 0 ? confirmed : registrations, 'medium_4');
  }
};
