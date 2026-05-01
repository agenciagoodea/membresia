import React, { useState, useEffect } from 'react';
import { Sparkles, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff, Bot } from 'lucide-react';
import { saasService, SaasAiSettings } from '../../services/saasService';

const SaaSAITab: React.FC = () => {
  const [s, setS] = useState<SaasAiSettings>({ provider: 'Gemini', model: 'gemini-pro', active: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saasService.getAiSettings().then(d => { 
      if (d) setS(p => ({ ...p, ...d })); 
    }).catch(e => console.error('Load AI:', e)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true); setMsg(null);
      await saasService.updateAiSettings(s);
      setMsg({ type: 'success', text: 'Configurações de IA salvas com sucesso!' });
    } catch (err: any) { 
      console.error('Save AI:', err); 
      setMsg({ type: 'error', text: err.message }); 
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!s.api_key) return;
    try {
      setTesting(true); setMsg(null);
      const result = await saasService.testAiConnection(s.provider, s.api_key, s.model);
      setMsg({ type: result.ok ? 'success' : 'error', text: result.message });
    } catch (err: any) { 
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
            <Bot className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Inteligência Artificial</h2>
            <p className="text-xs text-zinc-500">Módulo de Estudo de Célula e Insights</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
          {s.active ? 'IA Ativa' : 'IA Inativa'}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5 space-y-6">
            <div>
              <label className={lbl}>Provedor de IA</label>
              <select value={s.provider} onChange={e => setS({...s, provider: e.target.value})} className={inp + ' cursor-pointer'}>
                <option value="Gemini">Google Gemini (Recomendado)</option>
                <option value="OpenAI">OpenAI (Breve)</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Modelo</label>
              <select value={s.model} onChange={e => setS({...s, model: e.target.value})} className={inp + ' cursor-pointer'}>
                <option value="gemini-pro">gemini-pro (Padrão)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Mais rápido)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Mais inteligente)</option>
              </select>
            </div>

            <div>
              <label className={lbl}>API Key</label>
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"} 
                  value={s.api_key || ''} 
                  onChange={e => setS({...s, api_key: e.target.value})} 
                  className={inp} 
                  placeholder="Insira sua chave de API..." 
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={s.active} onChange={e => setS({...s, active: e.target.checked})} className="w-5 h-5 accent-blue-500 rounded" />
                <span className="text-sm font-bold text-white">Ativar Módulo de IA</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleTest} disabled={testing || !s.api_key}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all disabled:opacity-30 border border-white/5">
              {testing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />} {testing ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Salvar Configuração' : 'Salvar Configuração'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[2rem]">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={16} /> Como obter sua chave?
            </h3>
            <ul className="space-y-4 text-xs text-zinc-400 font-medium leading-relaxed">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">1</span>
                Acesse o <a href="https://aistudio.google.com/" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a>.
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">2</span>
                Faça login com sua conta Google.
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">3</span>
                Clique em "Get API Key" no menu lateral.
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">4</span>
                Crie uma nova chave e cole no campo ao lado.
              </li>
            </ul>
          </div>

          <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">O que a IA faz?</h3>
            <p className="text-xs text-zinc-500 leading-relaxed italic">
              "O módulo de IA permite gerar estudos de células baseados no tema da semana, criar esboços ministeriais e analisar o engajamento espiritual dos discípulos automaticamente."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSAITab;
