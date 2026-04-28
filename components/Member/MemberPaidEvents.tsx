import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, DollarSign, CheckCircle2, Clock, FileText, Loader2, ExternalLink } from 'lucide-react';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { pdfService } from '../../services/pdfService';
import { PaidEventRegistration, PaymentStatus } from '../../types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_comprovante: { label: 'Aguardando Comprovante', color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' },
  comprovante_enviado: { label: 'Comprovante Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  em_analise: { label: 'Em Análise', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  pago_confirmado: { label: 'Pagamento Confirmado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  recusado: { label: 'Recusado', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  cancelado: { label: 'Cancelado', color: 'text-zinc-500', bg: 'bg-zinc-800 border-zinc-700' },
};

interface Props {
  user: any;
}

const MemberPaidEvents: React.FC<Props> = ({ user }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await paidEventRegistrationService.getByMember(user.id);
        setRegistrations(data);
      } catch (error) {
        console.error('Erro ao carregar eventos do membro:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleDownloadPDF = async (reg: any) => {
    try {
      if (reg.paid_events) {
        await pdfService.downloadParticipantPDF(reg, reg.paid_events);
      }
    } catch (error) {
      alert('Erro ao gerar PDF.');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-500" size={24} />
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="py-12 text-center">
        <Ticket size={40} className="text-zinc-800 mx-auto mb-3" />
        <p className="text-zinc-500 font-black text-sm uppercase tracking-widest">Nenhum evento pago encontrado</p>
        <p className="text-zinc-600 text-xs mt-1">Quando você se inscrever em um evento pago, ele aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {registrations.map((reg) => {
        const event = reg.paid_events;
        const st = STATUS_CONFIG[reg.payment_status] || STATUS_CONFIG.aguardando_comprovante;

        return (
          <div key={reg.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-5 hover:border-violet-500/20 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h4 className="text-sm font-black text-white uppercase tracking-tight">{event?.title || 'Evento'}</h4>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {event?.start_date && (
                    <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5">
                      <Calendar size={10} className="text-zinc-400" /> {formatDate(event.start_date)}
                    </span>
                  )}
                  {event?.price > 0 && (
                    <span className="flex items-center gap-1 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20 text-violet-400">
                      <DollarSign size={10} /> {formatCurrency(event.price)}
                    </span>
                  )}
                </div>
                <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${st.bg} ${st.color}`}>{st.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {reg.payment_status === 'pago_confirmado' && (
                  <button
                    onClick={() => handleDownloadPDF(reg)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600/20 transition-all"
                  >
                    <FileText size={12} /> PDF
                  </button>
                )}
              </div>
            </div>

            {/* Código da inscrição */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-bold">Código: <span className="text-zinc-400 font-mono">{reg.registration_code}</span></span>
              <span className="text-[10px] text-zinc-600">Inscrito em {formatDate(reg.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MemberPaidEvents;
