import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { saasService, SaasEmailSettings } from '../../services/saasService';

const SaaSEmailTab: React.FC = () => {
  const [s, setS] = useState<SaasEmailSettings>({ smtp_host: '', smtp_port: 465, smtp_user: '', smtp_password: '', smtp_secure: true, from_name: '', from_email: '', status: 'inativo' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saasService.getEmailSettings().then(d => { if (d) setS(p => ({ ...p, ...d, smtp_password: '' })); }).catch(e => console.error('Load email:', e)).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setMsg(null);
      const payload = { ...s };
      if (!payload.smtp_password) delete payload.smtp_password; // Manter senha anterior
      console.log('Salvando email:', payload);
      await saasService.updateEmailSettings(payload);
      setMsg({ type: 'success', text: 'Configurações de e-mail salvas!' });
    } catch (err: any) { console.error('Save email:', err); setMsg({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-violet-500 transition-all outline-none font-medium";
  const lbl = "text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20"><Mail className="text-violet-400" size={24} /></div>
        <div><h2 className="text-xl font-black text-white tracking-tight">Servidor de E-mail (SMTP)</h2><p className="text-xs text-zinc-500">Configure o envio de e-mails automáticos do SaaS.</p></div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className={lbl}>Servidor SMTP (Host) *</label><input required value={s.smtp_host || ''} onChange={e => setS({...s, smtp_host: e.target.value})} className={inp} placeholder="smtp.hostinger.com" /></div>
          <div><label className={lbl}>Porta SMTP *</label><input required type="number" value={s.smtp_port || 465} onChange={e => setS({...s, smtp_port: parseInt(e.target.value)})} className={inp} placeholder="465 ou 587" /></div>
          <div><label className={lbl}>Usuário SMTP *</label><input required value={s.smtp_user || ''} onChange={e => setS({...s, smtp_user: e.target.value})} className={inp} placeholder="contato@seudominio.com" /></div>
          <div><label className={lbl}>Senha SMTP {s.id ? '(vazio = manter)' : '*'}</label><input type="password" required={!s.id} value={s.smtp_password || ''} onChange={e => setS({...s, smtp_password: e.target.value})} className={inp} placeholder="••••••••" /></div>
          <div><label className={lbl}>Nome do Remetente *</label><input required value={s.from_name || ''} onChange={e => setS({...s, from_name: e.target.value})} className={inp} placeholder="Ecclesia SaaS" /></div>
          <div><label className={lbl}>E-mail do Remetente *</label><input required type="email" value={s.from_email || ''} onChange={e => setS({...s, from_email: e.target.value})} className={inp} placeholder="noreply@seudominio.com" /></div>
        </div>

        <div className="flex items-center gap-6 p-4 bg-zinc-950 border border-white/5 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={s.smtp_secure} onChange={e => setS({...s, smtp_secure: e.target.checked})} className="w-5 h-5 accent-violet-500 rounded" /><span className="text-sm font-bold text-white">SSL/TLS</span></label>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={s.status === 'ativo'} onChange={e => setS({...s, status: e.target.checked ? 'ativo' : 'inativo'})} className="w-5 h-5 accent-emerald-500 rounded" /><span className="text-sm font-bold text-white">Ativar envio</span></label>
          <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${s.status === 'ativo' ? 'text-emerald-400' : 'text-zinc-600'}`}>{s.status === 'ativo' ? '● ATIVO' : '○ INATIVO'}</span>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>

      {s.id && (
        <div className="mt-12 pt-8 border-t border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Send size={16} className="text-zinc-500" />
            Testar Conexão
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <input 
              type="email" 
              id="testEmail"
              className={inp} 
              placeholder="Digite um e-mail para receber o teste..." 
            />
            <button 
              onClick={async () => {
                const emailInput = document.getElementById('testEmail') as HTMLInputElement;
                if (!emailInput?.value) {
                  setMsg({ type: 'error', text: 'Informe um e-mail para teste.' });
                  return;
                }
                setSaving(true);
                setMsg(null);
                const res = await saasService.testEmailConnection(emailInput.value);
                setMsg({ type: res.ok ? 'success' : 'error', text: res.message });
                setSaving(false);
                if (res.ok) {
                  setS(prev => ({ ...prev, last_test_at: new Date().toISOString() }));
                }
              }}
              disabled={saving} 
              className="whitespace-nowrap flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 border border-white/10"
            >
              {saving ? <RefreshCw className="animate-spin" size={18} /> : 'Enviar Teste'}
            </button>
          </div>
          {s.last_test_at && (
            <p className="text-xs text-zinc-500 mt-3 font-medium">
              Último teste realizado em: {new Date(s.last_test_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SaaSEmailTab;
