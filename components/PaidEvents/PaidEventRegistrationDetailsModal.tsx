import React from 'react';
import { X, CheckCircle2, XCircle, FileText, Download, Phone, User, Shirt, Bus, Car, Heart, AlertTriangle, Clock, Users, ExternalLink, Calendar } from 'lucide-react';
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

  const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
      <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
        <Icon size={14} />
      </div>
      <span>{title}</span>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>
  );

  const DetailItem = ({ label, value, icon: Icon }: { label: string, value?: string | null, icon: any }) => {
    if (!value) return null;
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 group">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-violet-400 transition-colors">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-white mt-0.5">{value}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
        
        {/* Banner e Cabeçalho de Perfil */}
        <div className="relative h-64 shrink-0">
          {bannerUrl ? (
            <img src={bannerUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          
          <div className="absolute top-6 right-6 flex gap-2">
            <button onClick={onClose} className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-2xl backdrop-blur-md border border-white/10 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="absolute -bottom-1 left-10 right-10 flex items-end gap-8">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img src={photoUrl} className="w-40 h-40 rounded-[2.5rem] object-cover ring-8 ring-zinc-950 shadow-2xl" alt="" />
              ) : (
                <div className="w-40 h-40 rounded-[2.5rem] bg-zinc-900 border-8 border-zinc-950 flex items-center justify-center text-zinc-700 shadow-2xl">
                  <User size={64} />
                </div>
              )}
              <div className={`absolute -bottom-2 -right-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border-2 border-zinc-950 ${st.bg} ${st.color}`}>
                {st.label}
              </div>
            </div>

            <div className="mb-8 flex-1">
              <div className="flex items-center gap-3 text-zinc-400 font-bold text-xs mb-2">
                <span className="px-2 py-0.5 bg-zinc-900 rounded text-[10px] border border-white/5 uppercase tracking-[0.2em]">{reg.registration_code}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {eventPeriod}</span>
              </div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-lg">
                {reg.full_name}
              </h2>
            </div>

            <div className="mb-8 flex flex-col gap-2">
              {reg.payment_status === 'pago_confirmado' && (
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-violet-900/20">
                  <FileText size={16} /> Ficha PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-10 pt-16 overflow-y-auto flex-1 scrollbar-hide grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Coluna 1 & 2: Dados e Mensagens */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Dados Pessoais */}
            <section>
              <SectionTitle icon={User} title="Dados do Participante" />
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Telefone" value={reg.phone} icon={Phone} />
                <DetailItem label="Gênero" value={reg.gender} icon={User} />
                <DetailItem label="Idade" value={reg.age ? `${reg.age} anos` : 'Não informada'} icon={Clock} />
                <DetailItem label="Camiseta" value={reg.shirt_size} icon={Shirt} />
                <DetailItem label="Transporte" value={reg.transport_type} icon={reg.transport_type === 'Carro' ? Car : Bus} />
                <DetailItem label="Data Inscrição" value={new Date(reg.created_at).toLocaleDateString('pt-BR')} icon={Calendar} />
              </div>
            </section>

            {/* Liderança e Discipulado */}
            <section>
              <SectionTitle icon={Users} title="Liderança e Discipulado" />
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Pastor Responsável" value={reg.pastor_name} icon={Heart} />
                <DetailItem label="Discipulador / Supervisor" value={reg.discipler_name || 'Não informado'} icon={Users} />
              </div>
            </section>

            {/* Saúde e Oração */}
            <section className="grid grid-cols-1 gap-6">
              {reg.has_allergy && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h4 className="text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Alergias e Restrições</h4>
                    <p className="text-zinc-200 font-bold leading-relaxed">{reg.allergy_description || 'Sim (não detalhado)'}</p>
                  </div>
                </div>
              )}
              
              {reg.prayer_request && (
                <div className="bg-violet-500/5 border border-violet-500/10 rounded-3xl p-6 flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                    <Heart size={24} />
                  </div>
                  <div>
                    <h4 className="text-violet-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Motivo de Oração</h4>
                    <p className="text-zinc-300 italic font-medium leading-relaxed">"{reg.prayer_request}"</p>
                  </div>
                </div>
              )}

              {reg.observations && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Observações Adicionais</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">{reg.observations}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Coluna 3: Comprovante e Ações */}
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={DollarSign} title="Financeiro" />
              </div>
              
              {reg.payment_proof_url ? (
                <div className="space-y-4">
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-4 overflow-hidden relative group">
                    {reg.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex flex-col items-center justify-center py-10 bg-zinc-950 rounded-2xl border border-dashed border-zinc-800">
                        <FileText size={48} className="text-zinc-700 mb-4" />
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">Comprovante em PDF</p>
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Visualizar</a>
                      </div>
                    ) : (
                      <>
                        <img src={proofUrl} className="w-full h-auto rounded-2xl shadow-lg border border-white/5" alt="Comprovante" />
                        <div className="absolute inset-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl backdrop-blur-sm">
                          <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-black rounded-xl shadow-xl hover:scale-110 transition-transform">
                            <ExternalLink size={20} />
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a href={proofUrl} download className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      <Download size={14} /> Baixar
                    </a>
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      <ExternalLink size={14} /> Abrir Original
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 flex flex-col items-center text-center">
                  <AlertTriangle size={32} className="text-amber-500 mb-3" />
                  <p className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">Aguardando Pagamento</p>
                  <p className="text-zinc-500 text-xs font-medium">O comprovante ainda não foi enviado pelo participante.</p>
                </div>
              )}
            </section>

            {/* Ações de Status */}
            {['comprovante_enviado', 'em_analise', 'aguardando_comprovante'].includes(reg.payment_status) && (
              <div className="pt-6 space-y-3">
                <button onClick={handleConfirm} className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20">
                  <CheckCircle2 size={18} /> Aprovar Inscrição
                </button>
                <button onClick={handleReject} className="w-full flex items-center justify-center gap-3 py-5 bg-zinc-900 hover:bg-rose-900/20 text-zinc-500 hover:text-rose-500 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">
                  <XCircle size={18} /> Recusar Pagamento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaidEventRegistrationDetailsModal;
