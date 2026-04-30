import React, { useState, useEffect } from 'react';
import { CreditCard, Save, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { saasService, SaasPaymentSettings } from '../../services/saasService';

const SaaSPaymentTab: React.FC = () => {
  const [settings, setSettings] = useState<SaasPaymentSettings>({ environment: 'sandbox', checkout_type: 'transparent', status: 'inativo' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saasService.getPaymentSettings().then(d => { if (d) setSettings(p => ({ ...p, ...d })); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); setMsg(null); await saasService.updatePaymentSettings(settings); setMsg({ type: 'success', text: 'Credenciais salvas!' }); }
    catch (err: any) { setMsg({ type: 'error', text: err.message || 'Erro ao salvar.' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-blue-500" /></div>;

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none";
  const lbl = "text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20"><CreditCard className="text-blue-400" size={24} /></div>
        <div><h2 className="text-xl font-black text-white tracking-tight">Mercado Pago</h2><p className="text-sm text-zinc-400">Configure as credenciais do checkout transparente.</p></div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} <p className="text-sm font-medium">{msg.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className={lbl}>Public Key *</label><input required value={settings.mercado_pago_public_key || ''} onChange={e => setSettings({...settings, mercado_pago_public_key: e.target.value})} className={inp} placeholder="APP_USR-..." /></div>
          <div><label className={lbl}>Access Token *</label><input required type="password" value={settings.mercado_pago_access_token || ''} onChange={e => setSettings({...settings, mercado_pago_access_token: e.target.value})} className={inp} placeholder="APP_USR-..." /></div>
          <div><label className={lbl}>Webhook Secret</label><input value={settings.mercado_pago_webhook_secret || ''} onChange={e => setSettings({...settings, mercado_pago_webhook_secret: e.target.value})} className={inp} placeholder="Opcional" /></div>
          <div><label className={lbl}>Ambiente</label>
            <select value={settings.environment} onChange={e => setSettings({...settings, environment: e.target.value as any})} className={inp}>
              <option value="sandbox">Sandbox (Testes)</option><option value="production">Produção</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 p-4 bg-zinc-950 border border-white/5 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.status === 'ativo'} onChange={e => setSettings({...settings, status: e.target.checked ? 'ativo' : 'inativo'})} className="w-5 h-5 accent-emerald-500 rounded" />
            <span className="text-sm font-bold text-white">Integração Ativa</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} {saving ? 'Salvando...' : 'Salvar Credenciais'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SaaSPaymentTab;
