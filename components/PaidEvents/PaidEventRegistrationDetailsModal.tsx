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

  const photoUrl = paidEventRegistrationService.getFileUrl('event-participant-photos', reg.photo_url || '');
  const proofUrl = paidEventRegistrationService.getFileUrl('event-payment-proofs', reg.payment_proof_url || '');
  const bannerUrl = paidEventRegistrationService.getFileUrl('paid-event-banners', event.banner_url || '');
  const eventPeriod = paidEventRegistrationService.formatEventPeriod(event.start_date, event.end_date);

  const handleConfirm = async () => {
    try {
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.CONFIRMED, user.id, 'Pagamento confirmado', event);
      onStatusChanged();
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

  const InfoCard = ({ label, value, icon, fullWidth = false }: { label: string; value?: string | null; icon?: React.ReactNode, fullWidth?: boolean }) => {
    if (!value) return null;
    return (
      <div className={`bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-start gap-4 ${fullWidth ? 'col-span-full' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
          {icon || <User size={18} />}
        </div>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        
        {/* Banner de Topo Profissional */}
        <div className="relative h-48 shrink-0">
          {bannerUrl ? (
            <img src={bannerUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          
          <div className="absolute top-6 right-6 flex gap-2">
            <button onClick={onClose} className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-2xl backdrop-blur-md border border-white/10 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                {photoUrl ? (
                  <img src={photoUrl} className="w-24 h-24 rounded-[1.5rem] object-cover ring-4 ring-zinc-950 shadow-2xl" alt="" />
                ) : (
                  <div className="w-24 h-24 rounded-[1.5rem] bg-zinc-800 border-4 border-zinc-950 flex items-center justify-center text-zinc-600 shadow-2xl">
                    <User size={40} />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg border-2 border-zinc-950">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="pb-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{reg.full_name}</h3>
                <p className="text-zinc-400 font-bold text-xs mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] uppercase tracking-widest">{reg.registration_code}</span>
                  <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                  {eventPeriod}
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl ${st.bg} ${st.color} border border-white/5 mb-2`}>
              {st.label}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 scrollbar-hide bg-zinc-950">
          
          {/* Seção: Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard label="Idade" value={reg.age ? `${reg.age} anos` : 'Não informada'} icon={<Clock size={18} />} />
            <InfoCard label="Sexo" value={reg.gender} icon={<User size={18} />} />
            <InfoCard label="Telefone" value={reg.phone} icon={<Phone size={18} />} />
            <InfoCard label="Pastor" value={reg.pastor_name} icon={<Heart size={18} />} />
            <InfoCard label="Discipulador" value={reg.discipler_name} icon={<Users size={18} />} />
            <InfoCard label="Tamanho da Blusa" value={reg.shirt_size} icon={<Shirt size={18} />} />
            <InfoCard label="Transporte" value={reg.transport_type} icon={reg.transport_type === 'Carro' ? <Car size={18} /> : <Bus size={18} />} />
          </div>

          {/* Seção: Saúde e Observações */}
          {(reg.has_allergy || reg.prayer_request || reg.observations) && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">
                <div className="w-8 h-px bg-zinc-800" />
                <span>Saúde e Mensagens</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {reg.has_allergy && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Alergias Detectadas</p>
                      <p className="text-sm text-zinc-200 font-bold mt-1">{reg.allergy_description || 'Sim (não especificado)'}</p>
                    </div>
                  </div>
                )}
                {reg.prayer_request && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                      <Heart size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Pedido de Oração</p>
                      <p className="text-sm text-zinc-200 font-medium italic mt-1 leading-relaxed">"{reg.prayer_request}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seção: Comprovante de Pagamento */}
          {reg.payment_proof_url && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] flex-1">
                  <div className="w-8 h-px bg-zinc-800" />
                  <span>Comprovante de Pagamento</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <div className="flex gap-2 ml-4">
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-all">
                    <ExternalLink size={16} />
                  </a>
                  <a href={proofUrl} download className="p-2 bg-zinc-900 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition-all">
                    <Download size={16} />
                  </a>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-6 overflow-hidden">
                {reg.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={proofUrl} className="w-full h-80 rounded-xl bg-zinc-950 border border-white/5" title="Comprovante PDF" />
                ) : (
                  <div className="relative group">
                    <img src={proofUrl} className="w-full h-auto rounded-xl shadow-2xl border border-white/10" alt="Comprovante" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl backdrop-blur-sm">
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Ver em Tamanho Real</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
            <Clock size={12} />
            Inscrito em {new Date(reg.created_at).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Ações de Gestão Profissionais */}
        <div className="p-8 border-t border-white/5 flex gap-4 bg-zinc-900/50 backdrop-blur-xl shrink-0">
          {['comprovante_enviado', 'em_analise', 'aguardando_comprovante'].includes(reg.payment_status) && (
            <>
              <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20">
                <CheckCircle2 size={18} /> Confirmar Inscrição
              </button>
              <button onClick={handleReject} className="px-8 flex items-center justify-center gap-3 py-5 bg-zinc-800 text-rose-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-900/20 transition-all border border-rose-500/20">
                <XCircle size={18} /> Recusar
              </button>
            </>
          )}
          {reg.payment_status === 'pago_confirmado' && (
            <>
              <button onClick={handleDownloadPDF} className="flex-1 flex items-center justify-center gap-3 py-5 bg-violet-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-900/20">
                <FileText size={18} /> Gerar Ficha (PDF)
              </button>
              <button onClick={() => pdfService.downloadParticipantBadge(reg, event)} className="flex-1 flex items-center justify-center gap-3 py-5 bg-amber-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-900/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 15h0"></path><path d="M12 15h5"></path><path d="M7 9h10"></path></svg> Emitir Crachá
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaidEventRegistrationDetailsModal;
