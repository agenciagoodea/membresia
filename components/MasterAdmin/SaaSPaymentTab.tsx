import React, { useState, useEffect } from 'react';
import { CreditCard, Save, RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { saasService, SaasPaymentSettings } from '../../services/saasService';

const SaaSPaymentTab: React.FC = () => {
  const [s, setS] = useState<SaasPaymentSettings>({ 
    environment: 'sandbox', 
    status: 'inativo',
    mercado_pago_application_id: '',
    mercado_pago_public_key: '',
    mercado_pago_access_token: '',
    mercado_pago_webhook_secret: ''
  });
  const [accountData, setAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connStatus, setConnStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  useEffect(() => {
    saasService.getPaymentSettings().then(d => { 
      if (d) setS(p => ({ ...p, ...d })); 
    }).catch(e => console.error('Load MP:', e)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true); setMsg(null);
      await saasService.updatePaymentSettings(s);
      setMsg({ type: 'success', text: 'Credenciais salvas com sucesso!' });
    } catch (err: any) { 
      console.error('Save MP:', err); 
      setMsg({ type: 'error', text: err.message }); 
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    try {
      setTesting(true); setMsg(null);
      const result = await saasService.testMercadoPagoConnection();
      setConnStatus(result.ok ? 'ok' : 'error');
      setMsg({ type: result.ok ? 'success' : 'error', text: result.message });
      if (result.ok && result.data) {
        setAccountData(result.data);
      }
    } catch (err: any) { 
      setConnStatus('error'); 
      setMsg({ type: 'error', text: err.message }); 
    } finally { setTesting(false); }
  };

  if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium";
  const lbl = "text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <CreditCard className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Mercado Pago</h2>
            <p className="text-xs text-zinc-500">Integração de Pagamentos e Assinaturas</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${connStatus === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : connStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
          {connStatus === 'ok' ? <><Wifi size={14} /> Conectado</> : connStatus === 'error' ? <><WifiOff size={14} /> Erro de Conexão</> : <><WifiOff size={14} /> Não Testado</>}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={lbl}>Ambiente</label>
                <select value={s.environment} onChange={e => setS({...s, environment: e.target.value as any})} className={inp + ' cursor-pointer'}>
                  <option value="sandbox">🧪 Sandbox (Ambiente de Testes)</option>
                  <option value="production">🚀 Produção (Dinheiro Real)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Application ID *</label>
                <input value={s.mercado_pago_application_id || ''} onChange={e => setS({...s, mercado_pago_application_id: e.target.value})} className={inp} placeholder="Ex: 123456789" />
              </div>
            </div>

            <div>
              <label className={lbl}>Public Key *</label>
              <input value={s.mercado_pago_public_key || ''} onChange={e => setS({...s, mercado_pago_public_key: e.target.value})} className={inp} placeholder="APP_USR-..." />
            </div>

            <div>
              <label className={lbl}>Access Token *</label>
              <input type="password" value={s.mercado_pago_access_token || ''} onChange={e => setS({...s, mercado_pago_access_token: e.target.value})} className={inp} placeholder="APP_USR-..." />
            </div>

            <div>
              <label className={lbl}>Webhook Secret Key</label>
              <input value={s.mercado_pago_webhook_secret || ''} onChange={e => setS({...s, mercado_pago_webhook_secret: e.target.value})} className={inp} placeholder="Chave de validação do Webhook (opcional)" />
            </div>

            <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={s.status === 'ativo'} onChange={e => setS({...s, status: e.target.checked ? 'ativo' : 'inativo'})} className="w-5 h-5 accent-emerald-500 rounded" />
                <span className="text-sm font-bold text-white">Integração Ativa</span>
              </label>
              <span className={`text-[10px] font-black uppercase tracking-widest ${s.status === 'ativo' ? 'text-emerald-400' : 'text-zinc-600'}`}>{s.status === 'ativo' ? '● ATIVO' : '○ INATIVO'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button onClick={handleTest} disabled={testing || !s.mercado_pago_access_token}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all disabled:opacity-30 border border-white/5">
              {testing ? <RefreshCw className="animate-spin" size={16} /> : <Wifi size={16} />} {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Salvar Credenciais' : 'Salvar Credenciais'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações da Conta */}
          <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-500" /> Informações da Conta
            </h3>
            {accountData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Vendedor</p>
                  <p className="text-sm font-bold text-white">{accountData.nickname}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">ID da Conta</p>
                  <p className="text-sm font-bold text-white">{accountData.id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">E-mail</p>
                  <p className="text-sm font-bold text-white truncate">{accountData.email}</p>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Site ID</p>
                    <p className="text-sm font-bold text-white">{accountData.site_id}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20">
                    {accountData.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Teste a conexão para ver os dados da conta vinculada.</p>
            )}
          </div>

          {/* Instruções */}
          <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[2rem]">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4">Instruções</h3>
            <ul className="space-y-3 text-[11px] text-zinc-400 font-medium leading-relaxed">
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Acesse o <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" className="text-blue-400 hover:underline">Painel do Desenvolvedor</a>.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Crie ou selecione sua aplicação.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Copie as credenciais da aba "Credenciais de Produção" ou "Teste".
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Configure a URL de Webhook: <br/>
                <code className="bg-black px-2 py-1 rounded mt-1 block text-[10px] text-zinc-300">
                  {window.location.origin}/api/webhooks/mercadopago
                </code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSPaymentTab;
