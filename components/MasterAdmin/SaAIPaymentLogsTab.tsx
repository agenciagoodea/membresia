
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  Eye,
  RefreshCw,
  FileJson,
  Building2,
  Package
} from 'lucide-react';
import { saasService, SaasPaymentLog } from '../../services/saasService';

const SaaSPaymentLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SaasPaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', church: '', plan: '' });
  const [selectedLog, setSelectedLog] = useState<SaasPaymentLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await saasService.getPaymentLogs({ status: filter.status });
      setLogs(data);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'cancelled': return 'bg-zinc-800 text-zinc-500 border-white/5';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'rejected': return <XCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <RefreshCw size={14} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Histórico de Pagamentos</h2>
          <p className="text-xs text-zinc-500">Audite todas as transações financeiras do SaaS.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={filter.status} 
            onChange={e => setFilter({...filter, status: e.target.value})}
            className="bg-zinc-950 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="approved">Aprovados</option>
            <option value="pending">Pendentes</option>
            <option value="rejected">Recusados</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <button 
            onClick={loadLogs}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-white/5"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/50 rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Igreja / Plano</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">MP ID / Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-white/5 rounded-xl" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-500 italic text-sm">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{log.church?.name || 'Sistema'}</div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-black uppercase tracking-widest">
                          <Package size={10} /> {log.plan?.name || 'Avulso'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-white">R$ {log.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">{log.payment_method || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(log.status)}`}>
                      {getStatusIcon(log.status)}
                      {log.status === 'approved' ? 'Aprovado' : log.status === 'pending' ? 'Pendente' : log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-400 font-mono">{log.mercado_pago_payment_id || '-'}</div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase truncate max-w-[100px]">{log.external_reference}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-400 font-medium">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 rounded-xl transition-all border border-white/5"
                    >
                      <FileJson size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal JSON Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-zinc-950 w-full max-w-2xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileJson className="text-blue-500" size={24} />
                <h3 className="text-lg font-black text-white">JSON da Transação</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <XCircle size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-[11px] bg-zinc-900/50">
              <pre className="text-blue-400 whitespace-pre-wrap">
                {JSON.stringify(selectedLog.raw_response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSPaymentLogsTab;
