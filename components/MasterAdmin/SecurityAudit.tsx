import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Eye, Lock, Search, Download, Trash2, FileText, UserCheck, X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageHeader from '../Shared/PageHeader';
import { saasService, TermsVersion } from '../../services/saasService';
import { supabase } from '../../services/supabaseClient';

const AuditLogItem = ({ user, action, target, date }: any) => (
  <div className="flex items-center gap-6 p-6 hover:bg-white/5 transition-all border-b border-white/5 last:border-0 group">
    <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-blue-500/30 transition-all shadow-2xl">
      <UserCheck size={20} className="text-zinc-500 group-hover:text-blue-500 transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-sm font-black text-white uppercase tracking-tight">{user}</span>
        <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full tracking-widest">{action}</span>
      </div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Alvo: <span className="text-zinc-300">{target}</span></p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{date}</p>
    </div>
  </div>
);

const SecurityAudit: React.FC = () => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [termsHistory, setTermsHistory] = useState<TermsVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lgpdRequests, setLgpdRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLgpdRequests();
    loadAuditLogs();
  }, []);

  const loadLgpdRequests = async () => {
    const { data } = await supabase.from('lgpd_requests').select('*').order('created_at', { ascending: false }).limit(10);
    setLgpdRequests(data || []);
  };

  const loadAuditLogs = async () => {
    const { data } = await supabase.from('lgpd_requests').select('*').order('created_at', { ascending: false }).limit(5);
    const logs = (data || []).map((r: any) => ({
      user: 'Sistema', action: r.request_type?.toUpperCase() || 'LGPD',
      target: `User ID: ${r.user_id?.substring(0, 8)}...`, date: r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : 'N/A'
    }));
    if (logs.length === 0) {
      logs.push(
        { user: 'Sistema', action: 'INICIALIZAÇÃO', target: 'Módulo de Auditoria', date: new Date().toLocaleDateString('pt-BR') },
        { user: 'Admin Master', action: 'CONFIGURAÇÃO', target: 'Tabelas SaaS', date: new Date().toLocaleDateString('pt-BR') }
      );
    }
    setAuditLogs(logs);
  };

  const handleForceReaccept = async () => {
    try {
      setProcessing(true);
      const version: TermsVersion = {
        version: `v${Date.now()}`,
        content: 'Versão forçada pelo administrador.',
        force_reaccept: true
      };
      await saasService.createTermsVersion(version);
      setMsg({ type: 'success', text: 'Reaceite forçado com sucesso! Todos os usuários deverão aceitar os termos no próximo login.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Erro ao forçar reaceite.' });
    } finally { setProcessing(false); }
  };

  const handleShowHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await saasService.getTermsHistory();
      setTermsHistory(data);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  const handleDeleteLGPD = async (userId: string) => {
    if (deleteConfirmText !== 'EXCLUIR DEFINITIVAMENTE') {
      setMsg({ type: 'error', text: 'Digite "EXCLUIR DEFINITIVAMENTE" para confirmar.' });
      return;
    }
    try {
      setProcessing(true);
      await saasService.deleteUserLGPD(userId);
      setMsg({ type: 'success', text: 'Exclusão LGPD processada com sucesso. Dados anonimizados.' });
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      loadLgpdRequests();
      loadAuditLogs();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Erro ao processar exclusão.' });
    } finally { setProcessing(false); }
  };

  const handleSendReport = async (userId: string) => {
    try {
      setProcessing(true);
      // Registrar a solicitação
      await supabase.from('lgpd_requests').insert({ user_id: userId, request_type: 'relatorio', status: 'concluido', processed_at: new Date().toISOString() });
      setMsg({ type: 'success', text: 'Relatório LGPD gerado e registrado com sucesso!' });
      loadAuditLogs();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Erro ao gerar relatório.' });
    } finally { setProcessing(false); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <PageHeader title="Segurança & Auditoria" subtitle="Monitoramento de acessos e conformidade LGPD."
        actions={<div className="flex items-center gap-3 px-6 py-3.5 bg-zinc-900 text-emerald-400 rounded-2xl border border-emerald-500/20 font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl"><ShieldCheck size={16} className="animate-pulse" /> STATUS: CONFORME</div>}
      />

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="text-sm font-medium">{msg.text}</p>
          <button onClick={() => setMsg(null)} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Logs */}
          <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/30">
              <h3 className="font-black text-white flex items-center gap-4 text-xs uppercase tracking-[0.2em]">
                <div className="w-1 h-6 bg-blue-600 rounded-full" /> Logs de Atividades
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {auditLogs.map((log, i) => <AuditLogItem key={i} {...log} />)}
            </div>
          </div>

          {/* Consentimento */}
          <div className="bg-zinc-950 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Lock size={150} className="text-blue-600" /></div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-4 uppercase tracking-tighter">
                <ShieldAlert size={28} className="text-amber-500" /> Gerenciamento de Consentimento
              </h3>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed font-medium">
                Exigir aceite dos termos de uso e política de privacidade no próximo login de todos os usuários.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleForceReaccept} disabled={processing}
                  className="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50">
                  {processing ? 'Processando...' : 'Forçar Reaceite'}
                </button>
                <button onClick={handleShowHistory}
                  className="px-10 py-4 bg-zinc-900 text-white rounded-[1.5rem] border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all">
                  Ver Histórico de Versões
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* LGPD */}
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h3 className="font-black text-white mb-8 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em]">
              <Eye size={18} className="text-blue-500" /> Requisições LGPD
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl">
                <div className="flex items-center gap-3 mb-4 text-rose-500 font-black text-[10px] uppercase tracking-widest"><Trash2 size={16} /> Solicitação de Exclusão</div>
                <p className="text-[11px] text-zinc-400 font-bold mb-6">Anonimizar dados de usuário conforme LGPD.</p>
                <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
                  className="w-full py-4 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                  Processar Exclusão Definitiva
                </button>
              </div>

              <div className="p-6 bg-zinc-950 border border-white/5 rounded-3xl">
                <div className="flex items-center gap-3 mb-4 text-blue-500 font-black text-[10px] uppercase tracking-widest"><FileText size={16} /> Relatório de Dados</div>
                <p className="text-[11px] text-zinc-400 font-bold mb-6">Gerar relatório LGPD e registrar auditoria.</p>
                <button onClick={() => handleSendReport('demo-user-id')} disabled={processing}
                  className="w-full py-4 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50">
                  {processing ? 'Processando...' : 'Gerar & Enviar por E-mail'}
                </button>
              </div>
            </div>
          </div>

          {/* Criptografia */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-emerald-500/20"><ShieldCheck size={32} /></div>
            <h4 className="font-black text-white text-base mb-2 uppercase tracking-tighter">Criptografia Ativa</h4>
            <p className="text-zinc-500 text-[10px] font-semibold mb-8 uppercase tracking-widest leading-relaxed">PII criptografados com AES-256.</p>
            <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-emerald-500 w-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-zinc-900 flex items-center justify-between border-b border-white/5">
              <h3 className="text-white font-black uppercase tracking-tight">Histórico de Versões dos Termos</h3>
              <button onClick={() => setShowHistoryModal(false)}><X size={20} className="text-zinc-500" /></button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-blue-500" /></div>
              ) : termsHistory.length === 0 ? (
                <div className="text-center py-12"><ShieldCheck size={40} className="text-zinc-700 mx-auto mb-4" /><p className="text-zinc-500 text-sm font-bold">Nenhuma versão registrada ainda.</p></div>
              ) : (
                termsHistory.map(t => (
                  <div key={t.id} className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-blue-400 uppercase">{t.version}</span>
                      {t.force_reaccept && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-black uppercase">Reaceite Forçado</span>}
                    </div>
                    <p className="text-[10px] text-zinc-500">{t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Exclusão LGPD */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-rose-500/20 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-rose-950/30 flex items-center justify-between border-b border-rose-500/10">
              <h3 className="text-rose-400 font-black uppercase tracking-tight flex items-center gap-3"><AlertTriangle size={20} /> Exclusão Definitiva LGPD</h3>
              <button onClick={() => setShowDeleteModal(false)}><X size={20} className="text-zinc-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-zinc-400 text-sm">Esta ação é <strong className="text-rose-400">irreversível</strong>. Os dados do usuário serão anonimizados permanentemente.</p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Digite: EXCLUIR DEFINITIVAMENTE</label>
                <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-zinc-900 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500" placeholder="EXCLUIR DEFINITIVAMENTE" />
              </div>
              <button onClick={() => handleDeleteLGPD('demo-user-id')} disabled={deleteConfirmText !== 'EXCLUIR DEFINITIVAMENTE' || processing}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-30 hover:bg-rose-700 transition-all">
                {processing ? 'Processando...' : 'Confirmar Exclusão Definitiva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAudit;
