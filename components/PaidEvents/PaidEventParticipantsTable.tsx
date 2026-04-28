import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Download, FileText, CheckCircle2, XCircle, Eye, Phone, User, Shirt, Bus, Car, Loader2 } from 'lucide-react';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { pdfService } from '../../services/pdfService';
import { PaidEvent, PaidEventRegistration, PaymentStatus } from '../../types';
import PaidEventRegistrationDetailsModal from './PaidEventRegistrationDetailsModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_comprovante: { label: 'Aguardando', color: 'text-zinc-400', bg: 'bg-zinc-800' },
  comprovante_enviado: { label: 'Comprovante Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  em_analise: { label: 'Em Análise', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  pago_confirmado: { label: 'Pago ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  recusado: { label: 'Recusado', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  cancelado: { label: 'Cancelado', color: 'text-zinc-500', bg: 'bg-zinc-800' },
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
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.CONFIRMED, user.id, 'Pagamento confirmado pelo pastor');
      loadData();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      alert('Erro ao confirmar pagamento.');
    }
  };

  const handleReject = async (reg: PaidEventRegistration) => {
    const reason = prompt('Motivo da recusa (opcional):');
    try {
      await paidEventRegistrationService.updatePaymentStatus(reg.id, PaymentStatus.REJECTED, user.id, reason || 'Comprovante recusado');
      loadData();
    } catch (error) {
      console.error('Erro ao recusar:', error);
    }
  };

  const handleDownloadPDF = async (reg: PaidEventRegistration) => {
    try {
      await pdfService.downloadParticipantPDF(reg, event);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF.');
    }
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Pastor', 'Discipulador', 'Blusa', 'Transporte', 'Status', 'Data Inscrição'];
    const rows = filtered.map(r => [
      r.full_name, r.phone || '', r.pastor_name || '', r.discipler_name || '',
      r.shirt_size || '', r.transport_type || '', STATUS_CONFIG[r.payment_status]?.label || r.payment_status,
      new Date(r.created_at).toLocaleDateString('pt-BR')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos-${event.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filtered = registrations.filter(r => {
    if (filterStatus !== 'all' && r.payment_status !== filterStatus) return false;
    if (filterTransport !== 'all' && r.transport_type !== filterTransport) return false;
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.payment_status === 'pago_confirmado').length,
    pending: registrations.filter(r => ['comprovante_enviado', 'em_analise'].includes(r.payment_status)).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl transition-all border border-white/5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">{event.title}</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Inscrições Recebidas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Total</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{stats.confirmed}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Confirmados</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Pendentes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 flex-1">
          <Search size={14} className="text-zinc-500" />
          <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-none outline-none text-sm font-medium text-zinc-200 w-full" />
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

      {/* Tabela */}
      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="animate-spin text-violet-500" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 bg-zinc-900 border border-white/5 rounded-2xl text-center">
          <p className="text-zinc-500 font-black text-sm uppercase tracking-widest">Nenhuma inscrição encontrada</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Participante</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden md:table-cell">Telefone</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Blusa</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden lg:table-cell">Transp.</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(reg => {
                  const st = STATUS_CONFIG[reg.payment_status] || STATUS_CONFIG.aguardando_comprovante;
                  return (
                    <tr key={reg.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {reg.photo_url ? (
                            <img src={reg.photo_url} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600"><User size={16} /></div>
                          )}
                          <div>
                            <p className="font-bold text-white text-sm">{reg.full_name}</p>
                            <p className="text-[10px] text-zinc-500">{reg.pastor_name || 'Sem pastor'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{reg.phone || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{reg.shirt_size || '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {reg.transport_type === 'Carro' ? <Car size={16} className="text-blue-400" /> : reg.transport_type === 'Ônibus' ? <Bus size={16} className="text-amber-400" /> : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${st.bg} ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedReg(reg)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Ver detalhes"><Eye size={14} /></button>
                          {['comprovante_enviado', 'em_analise'].includes(reg.payment_status) && (
                            <>
                              <button onClick={() => handleConfirm(reg)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all" title="Confirmar"><CheckCircle2 size={14} /></button>
                              <button onClick={() => handleReject(reg)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all" title="Recusar"><XCircle size={14} /></button>
                            </>
                          )}
                          {reg.payment_status === 'pago_confirmado' && (
                            <button onClick={() => handleDownloadPDF(reg)} className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all" title="PDF"><FileText size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
