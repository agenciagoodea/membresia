
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  FileJson,
  Hash,
  Database,
  Play
} from 'lucide-react';
import { saasService, SaasWebhookLog } from '../../services/saasService';

const SaaSWebhookLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SaasWebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SaasWebhookLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await saasService.getWebhookLogs();
      setLogs(data);
    } catch (err) {
      console.error('Erro ao carregar webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'processed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'received': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'error': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ignored': return 'bg-zinc-800 text-zinc-500 border-white/5';
      default: return 'bg-zinc-800 text-zinc-500 border-white/5';
    }
  };

  const reprocessWebhook = async (logId: string) => {
    if (!confirm('Deseja reprocessar este webhook manualmente?')) return;
    alert('Função de reprocessamento será implementada na Edge Function.');
    // Aqui chamaríamos a Edge Function passando o logId
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Logs de Webhooks</h2>
          <p className="text-xs text-zinc-500">Eventos recebidos do Mercado Pago em tempo real.</p>
        </div>
        
        <button 
          onClick={loadLogs}
          className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-white/5"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-zinc-950/50 rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ação / Tópico</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Payment ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Erro</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data/Hora</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ações</th>
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
                    Nenhum webhook registrado recentemente.
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group text-xs">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getStatusStyle(log.status)}`}>
                        <Activity size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-white uppercase tracking-tight">{log.action || log.event_type || 'NOTIFY'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{log.provider}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-400 font-mono">
                      <Hash size={12} className="text-zinc-600" /> {log.payment_id || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(log.status)}`}>
                      {log.status === 'processed' && <CheckCircle2 size={10} />}
                      {log.status === 'error' && <AlertCircle size={10} />}
                      {log.status === 'received' && <Clock size={10} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-rose-400/70 truncate max-w-[150px] italic" title={log.error_message}>
                      {log.error_message || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-400 font-medium">{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                    <div className="text-zinc-600">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-2 bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 rounded-xl transition-all border border-white/5"
                        title="Ver Payload"
                      >
                        <FileJson size={14} />
                      </button>
                      <button 
                        onClick={() => reprocessWebhook(log.id)}
                        className="p-2 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-400 rounded-xl transition-all border border-white/5"
                        title="Reprocessar"
                      >
                        <Play size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-zinc-950 w-full max-w-3xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <Database className="text-indigo-500" size={24} />
                <div>
                  <h3 className="text-lg font-black text-white">Webhook Payload</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <XCircle size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-[11px] space-y-6">
              <div>
                <h4 className="text-zinc-600 font-black uppercase tracking-widest text-[9px] mb-3">Payload Bruto</h4>
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre>
                </div>
              </div>
              <div>
                <h4 className="text-zinc-600 font-black uppercase tracking-widest text-[9px] mb-3">Headers Importantes</h4>
                <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 text-blue-400 overflow-x-auto">
                  <pre>{JSON.stringify(selectedLog.headers, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSWebhookLogsTab;
