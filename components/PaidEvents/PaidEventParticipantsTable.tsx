import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Download, FileText, CheckCircle2, XCircle, Eye, User, Shirt, Bus, Car, Loader2, Mail, MessageCircle, AlertTriangle, BarChart3, Trash2, Printer, Calendar } from 'lucide-react';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { pdfService } from '../../services/pdfService';
import { PaidEvent, PaidEventRegistration, PaymentStatus } from '../../types';
import PaidEventRegistrationDetailsModal from './PaidEventRegistrationDetailsModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  aguardando_comprovante: { label: 'Aguardando', color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' },
  comprovante_enviado: { label: 'Comprovante Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  em_analise: { label: 'Em Análise', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  pago_confirmado: { label: 'Pago ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  recusado: { label: 'Recusado', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  cancelado: { label: 'Cancelado', color: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-700' },
};

interface Props {
  event: PaidEvent;
  user: any;
  onBack: () => void;
}

const PaidEventParticipantsTable: React.FC<Props> = ({ event, user, onBack }) => {
  const [registrations, setRegistrations] = useState<PaidEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTransport, setFilterTransport] = useState('all');
  const [selectedReg, setSelectedReg] = useState<PaidEventRegistration | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await paidEventRegistrationService.getByEvent(event.id);
      setRegistrations(data);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [event.id]);

  const handleConfirm = async (reg: PaidEventRegistration) => {
    try {
      setActionLoading(reg.id);
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.CONFIRMED, user.id, 'Pagamento confirmado pelo pastor', event);
      loadData();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      alert('Erro ao confirmar pagamento.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reg: PaidEventRegistration) => {
    const reason = prompt('Motivo da recusa (opcional):');
    if (reason === null) return; // usuario cancelou
    try {
      setActionLoading(reg.id);
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.REJECTED, user.id, reason || 'Comprovante recusado', event);
      loadData();
    } catch (error) {
      console.error('Erro ao recusar:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const canManage = user.role === 'MASTER_ADMIN' || user.role === 'CHURCH_ADMIN' || event.created_by === user.id;

  const handleDeleteRegistration = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm('Tem certeza que deseja excluir esta inscrição? Esta ação não poderá ser desfeita.')) return;
    
    try {
      setActionLoading(id);
      await paidEventRegistrationService.delete(id);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir inscrição:', error);
      alert('Erro ao excluir inscrição.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWhatsApp = (reg: PaidEventRegistration) => {
    if (!reg.phone) return;
    const digits = reg.phone.replace(/\D/g, '');
    const number = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = encodeURIComponent(
      `Olá ${reg.full_name.split(' ')[0]}, tudo bem?\n\nEstamos entrando em contato sobre a sua inscrição no evento *${event.title}*.\n\nCódigo: *${reg.registration_code}*\n\nQualquer dúvida, estamos à disposição! 🙏`
    );
    window.open(`https://api.whatsapp.com/send?phone=${number}&text=${msg}`, '_blank');
  };

  const exportCSV = () => {
    const headers = ['Código', 'Nome', 'E-mail', 'Telefone', 'Pastor', 'Discipulador', 'Blusa', 'Transporte', 'Status', 'Data Inscrição'];
    const rows = filtered.map(r => [
      r.registration_code, r.full_name, r.email || '', r.phone || '',
      r.pastor_name || '', r.discipler_name || '', r.shirt_size || '',
      r.transport_type || '', STATUS_CONFIG[r.payment_status]?.label || r.payment_status,
      new Date(r.created_at).toLocaleDateString('pt-BR')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inscritos-${event.slug}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const filtered = registrations.filter(r => {
    if (filterStatus !== 'all' && r.payment_status !== filterStatus) return false;
    if (filterTransport !== 'all' && r.transport_type !== filterTransport) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.full_name.toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.pastor_name || '').toLowerCase().includes(q) ||
        r.registration_code.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.payment_status === 'pago_confirmado').length,
    pending: registrations.filter(r => ['comprovante_enviado', 'em_analise'].includes(r.payment_status)).length,
    awaiting: registrations.filter(r => r.payment_status === 'aguardando_comprovante').length,
  };
  const maxParticipants = event.max_participants || 0;
  const activeCount = filtered.filter(r => r.payment_status !== 'cancelado' && r.payment_status !== 'recusado').length;
  const occupancy = maxParticipants > 0 ? Math.round((activeCount / maxParticipants) * 100) : null;
  const spotsLeft = maxParticipants > 0 ? maxParticipants - filtered.length : null; // total_inscritos (mesmo aguardando) bloqueiam vaga

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition-all border border-white/5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">{event.title}</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Calendar size={12} className="text-zinc-600" />
              {paidEventRegistrationService.formatEventPeriod(event.start_date, event.end_date)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => pdfService.downloadEventReport(event, registrations)} className="flex items-center gap-2 px-5 py-3 bg-violet-600/10 text-violet-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600/20 transition-all border border-violet-500/20">
            <FileText size={14} /> Relatório
          </button>
          <button onClick={() => pdfService.generateBadgesBatchPDF(event, registrations)} className="flex items-center gap-2 px-5 py-3 bg-amber-600/10 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600/20 transition-all border border-amber-500/20">
            <Printer size={14} /> Crachás
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Stats + Barra de Ocupação */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Inscritos Total</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{stats.confirmed}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Confirmados</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Aguard. Análise</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          {spotsLeft !== null ? (
            <>
              <p className={`text-2xl font-black ${spotsLeft <= 5 ? 'text-rose-400' : 'text-blue-400'}`}>{Math.max(0, spotsLeft)}</p>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vagas Livres</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-zinc-500">∞</p>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Sem Limite</p>
            </>
          )}
        </div>
      </div>

      {/* Barra de Ocupação */}
      {occupancy !== null && (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ocupação do Evento</span>
            </div>
            <span className={`text-sm font-black ${occupancy >= 90 ? 'text-rose-400' : occupancy >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {occupancy}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${occupancy >= 90 ? 'bg-rose-500' : occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            <span>{activeCount} ocupadas</span>
            <span>{maxParticipants} total</span>
          </div>
          {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
            <p className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest">
              <AlertTriangle size={11} /> Atenção: restam apenas {spotsLeft} vagas!
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 flex-1">
          <Search size={14} className="text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-zinc-200 w-full"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-zinc-900 border border-white/5 text-zinc-300 text-sm font-bold rounded-xl px-4 py-3 outline-none">
          <option value="all">Todos Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterTransport} onChange={e => setFilterTransport(e.target.value)} className="bg-zinc-900 border border-white/5 text-zinc-300 text-sm font-bold rounded-xl px-4 py-3 outline-none">
          <option value="all">Transporte</option>
          <option value="Carro">Carro</option>
          <option value="Ônibus">Ônibus</option>
        </select>
      </div>

      {/* Contagem do filtro */}
      {(search || filterStatus !== 'all' || filterTransport !== 'all') && (
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          Exibindo <span className="text-white">{filtered.length}</span> de {registrations.length} inscrições
        </p>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="animate-spin text-violet-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 bg-zinc-900 border border-white/5 rounded-2xl text-center">
          <p className="text-zinc-500 font-black text-sm uppercase tracking-widest">Nenhuma inscrição encontrada</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950/50">
                  <th className="text-left px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Participante</th>
                  <th className="text-left px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Contato</th>
                  <th className="text-left px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden lg:table-cell text-center">Blusa / Transp.</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                  <th className="text-center px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(reg => {
                  const st = STATUS_CONFIG[reg.payment_status] || STATUS_CONFIG.aguardando_comprovante;
                  const isLoading = actionLoading === reg.id;
                  const pUrl = paidEventRegistrationService.getFileUrl('event-participant-photos', reg.photo_url || '');
                  return (
                    <tr key={reg.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {reg.photo_url ? (
                              <img 
                                src={pUrl} 
                                className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/10 shrink-0 shadow-lg" 
                                alt="" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  e.currentTarget.nextElementSibling?.classList.add('flex');
                                }}
                              />
                            ) : null}
                            <div className={`w-11 h-11 rounded-xl bg-zinc-800 items-center justify-center text-zinc-600 shrink-0 ${reg.photo_url ? 'hidden' : 'flex'} border border-white/5 shadow-inner`}>
                              <User size={20} />
                            </div>
                            {reg.payment_status === 'pago_confirmado' && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                                <CheckCircle2 size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-white text-sm uppercase tracking-tight truncate">{reg.full_name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 truncate">{reg.pastor_name || 'Sem pastor'} · <span className="font-black text-zinc-700">{reg.registration_code}</span></p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <p className="text-zinc-300 text-xs font-bold">{reg.phone || '—'}</p>
                          {reg.email && (
                            <p className="text-zinc-600 text-[10px] uppercase font-black tracking-widest truncate max-w-[160px]" title={reg.email}>
                              {reg.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex flex-row items-center justify-center gap-2">
                          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-white/5">
                            <Shirt size={11} className="text-zinc-600" />
                            <span className="text-[10px] font-black text-zinc-400">{reg.shirt_size || '—'}</span>
                          </div>
                          {reg.transport_type && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${reg.transport_type === 'Carro' ? 'bg-blue-500/5 border-blue-500/10 text-blue-400' : 'bg-amber-500/5 border-amber-500/10 text-amber-400'}`}>
                              {reg.transport_type === 'Carro' ? <Car size={11} /> : <Bus size={11} />}
                              <span className="text-[9px] font-black uppercase tracking-widest">{reg.transport_type}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${st.bg} ${st.color} ${st.border} shadow-sm`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1 transition-all">
                          {isLoading ? (
                            <Loader2 size={14} className="animate-spin text-violet-400" />
                          ) : (
                            <>
                              <button onClick={() => setSelectedReg(reg)} className="p-2.5 text-zinc-500 hover:text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all shadow-lg" title="Ver detalhes"><Eye size={16} /></button>
                              {reg.phone && (
                                <button onClick={() => handleWhatsApp(reg)} className="p-2.5 text-emerald-600 hover:text-emerald-400 bg-zinc-950 hover:bg-emerald-500/10 rounded-xl border border-white/5 transition-all shadow-lg" title="WhatsApp"><MessageCircle size={16} /></button>
                              )}
                              {['comprovante_enviado', 'em_analise', 'aguardando_comprovante'].includes(reg.payment_status) && (
                                <>
                                  <button onClick={() => handleConfirm(reg)} className="p-2.5 text-emerald-500 hover:bg-emerald-500/20 bg-zinc-950 rounded-xl border border-white/5 transition-all shadow-lg" title="Confirmar pagamento"><CheckCircle2 size={16} /></button>
                                  {reg.payment_status !== 'aguardando_comprovante' && (
                                    <button onClick={() => handleReject(reg)} className="p-2.5 text-rose-500 hover:bg-rose-500/20 bg-zinc-950 rounded-xl border border-white/5 transition-all shadow-lg" title="Recusar"><XCircle size={16} /></button>
                                  )}
                                </>
                              )}
                              {reg.payment_status === 'pago_confirmado' && (
                                <>
                                  <button onClick={() => pdfService.downloadParticipantPDF(reg, event)} className="p-2.5 text-violet-400 hover:bg-violet-500/20 bg-zinc-950 rounded-xl border border-white/5 transition-all shadow-lg" title="Comprovante PDF"><FileText size={16} /></button>
                                  <button onClick={() => pdfService.downloadParticipantBadge(reg, event)} className="p-2.5 text-amber-400 hover:bg-amber-500/20 bg-zinc-950 rounded-xl border border-white/5 transition-all shadow-lg" title="Crachá PDF">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 15h0"></path><path d="M12 15h5"></path><path d="M7 9h10"></path></svg>
                                  </button>
                                </>
                              )}
                              {canManage && (
                                <button onClick={() => handleDeleteRegistration(reg.id)} className="p-2.5 text-rose-600 hover:text-rose-400 bg-zinc-950 hover:bg-rose-500/10 rounded-xl border border-white/5 transition-all ml-1 shadow-lg" title="Excluir Inscrição"><Trash2 size={16} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Rodapé da tabela */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 font-bold">{filtered.length} registro(s) exibido(s)</p>
            <div className="flex items-center gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Confirmados: {stats.confirmed}
              </span>
              <span className="flex items-center gap-1 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Pendentes: {stats.pending}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {selectedReg && (
        <PaidEventRegistrationDetailsModal
          registration={selectedReg}
          event={event}
          user={user}
          onClose={() => setSelectedReg(null)}
          onStatusChanged={loadData}
        />
      )}
    </div>
  );
};

export default PaidEventParticipantsTable;
