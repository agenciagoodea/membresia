import React from 'react';
import { X, CheckCircle2, XCircle, FileText, Download, Phone, User, Shirt, Bus, Car, Heart, AlertTriangle, Clock } from 'lucide-react';
import { PaidEvent, PaidEventRegistration, PaymentStatus } from '../../types';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { pdfService } from '../../services/pdfService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_comprovante: { label: 'Aguardando Comprovante', color: 'text-zinc-400', bg: 'bg-zinc-800' },
  comprovante_enviado: { label: 'Comprovante Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  em_analise: { label: 'Em Análise', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  pago_confirmado: { label: 'Pagamento Confirmado', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  recusado: { label: 'Recusado', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  cancelado: { label: 'Cancelado', color: 'text-zinc-500', bg: 'bg-zinc-800' },
};

interface Props {
  registration: PaidEventRegistration;
  event: PaidEvent;
  user: any;
  onClose: () => void;
  onStatusChanged: () => void;
}

const PaidEventRegistrationDetailsModal: React.FC<Props> = ({ registration: reg, event, user, onClose, onStatusChanged }) => {
  const st = STATUS_CONFIG[reg.payment_status] || STATUS_CONFIG.aguardando_comprovante;

  const handleConfirm = async () => {
    try {
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.CONFIRMED, user.id, 'Pagamento confirmado', event);
      onStatusChanged();
      onClose();
    } catch (error) {
      alert('Erro ao confirmar pagamento.');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Motivo da recusa:');
    if (reason === null) return;
    try {
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.REJECTED, user.id, reason || 'Comprovante recusado', event);
      onStatusChanged();
      onClose();
    } catch (error) {
      alert('Erro ao recusar pagamento.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await pdfService.downloadParticipantPDF(reg, event);
    } catch (error) {
      alert('Erro ao gerar PDF.');
    }
  };

  const InfoRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {icon && <span className="text-zinc-600 mt-0.5">{icon}</span>}
        <div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-zinc-200 mt-0.5">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Ficha de Inscrição</h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{reg.registration_code}</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-zinc-500 hover:text-white bg-white/5 rounded-xl transition-all"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
          {/* Foto e Status */}
          <div className="flex items-center gap-5">
            {reg.photo_url ? (
              <img src={reg.photo_url} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10 shadow-lg" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-600"><User size={32} /></div>
            )}
            <div className="flex-1">
              <h4 className="text-xl font-black text-white uppercase tracking-tight">{reg.full_name}</h4>
              <span className={`inline-block mt-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${st.bg} ${st.color}`}>{st.label}</span>
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 space-y-1">
            <InfoRow label="Idade" value={reg.age ? `${reg.age} anos` : undefined} />
            <InfoRow label="Sexo" value={reg.gender} />
            <InfoRow label="Telefone" value={reg.phone} icon={<Phone size={14} />} />
            <InfoRow label="Pastor" value={reg.pastor_name} />
            <InfoRow label="Discipulador" value={reg.discipler_name} />
          </div>

          {/* Logística */}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 space-y-1">
            <InfoRow label="Tamanho da Blusa" value={reg.shirt_size} icon={<Shirt size={14} />} />
            <InfoRow label="Transporte" value={reg.transport_type} icon={reg.transport_type === 'Carro' ? <Car size={14} /> : <Bus size={14} />} />
          </div>

          {/* Saúde */}
          {reg.has_allergy && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Alergias</span>
              </div>
              <p className="text-sm text-zinc-300 font-medium">{reg.allergy_description || 'Sim (não especificado)'}</p>
            </div>
          )}

          {/* Contato emergência */}
          {reg.emergency_contact_name && (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
              <InfoRow label="Contato de Emergência" value={`${reg.emergency_contact_name} — ${reg.emergency_contact_phone || ''}`} />
            </div>
          )}

          {/* Pedido oração */}
          {reg.prayer_request && (
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={14} className="text-violet-400" />
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Pedido de Oração</span>
              </div>
              <p className="text-sm text-zinc-300 font-medium italic">"{reg.prayer_request}"</p>
            </div>
          )}

          {/* Comprovante */}
          {reg.payment_proof_url && (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Comprovante de Pagamento</p>
              {reg.payment_proof_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img src={reg.payment_proof_url} className="w-full rounded-xl border border-white/10" alt="Comprovante" />
              ) : (
                <a href={reg.payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 text-sm font-bold hover:underline">
                  <Download size={14} /> Baixar Comprovante
                </a>
              )}
            </div>
          )}

          {/* Data de inscrição */}
          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <Clock size={12} />
            <span>Inscrito em {new Date(reg.created_at).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 flex gap-3 bg-zinc-900/50 shrink-0">
          {['comprovante_enviado', 'em_analise'].includes(reg.payment_status) && (
            <>
              <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">
                <CheckCircle2 size={14} /> Confirmar
              </button>
              <button onClick={handleReject} className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all">
                <XCircle size={14} /> Recusar
              </button>
            </>
          )}
          {reg.payment_status === 'pago_confirmado' && (
            <>
              <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-all">
                <FileText size={14} /> Gerar PDF
              </button>
              <button onClick={() => pdfService.downloadParticipantBadge(reg, event)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 15h0"></path><path d="M12 15h5"></path><path d="M7 9h10"></path></svg> Crachá
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaidEventRegistrationDetailsModal;
