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
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
          {s.active ? <><Sparkles size={14} /> Ativa</> : 'Inativa'}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
        </div>
      )}

      {/* Switch Ativação no Topo */}
      <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${s.active ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}>
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Módulo de IA</h3>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Ativar processamento neural</p>
          </div>
        </div>
        <button 
          onClick={() => setS({...s, active: !s.active})}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.active ? 'bg-blue-600' : 'bg-zinc-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className={lbl}>Provedor de IA</label>
            <select value={s.provider} onChange={e => setS({...s, provider: e.target.value})} className={inp + ' cursor-pointer'}>
              <option value="Gemini">Google Gemini (Recomendado)</option>
              <option value="OpenAI">OpenAI (Em breve)</option>
            </select>
          </div>

          <div>
            <label className={lbl}>Modelo</label>
            <select value={s.model} onChange={e => setS({...s, model: e.target.value})} className={inp + ' cursor-pointer'}>
              <option value="gemini-pro">gemini-pro (Padrão)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Rápido)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (Avançado)</option>
            </select>
          </div>

          <div>
            <label className={lbl}>API Key / Token</label>
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
            {!s.api_key && (
              <p className="text-[10px] text-amber-500/70 mt-2 flex items-center gap-1 font-bold italic">
                <AlertCircle size={10} /> Chave ausente. IA não funcionará.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
          <button onClick={handleTest} disabled={testing || !s.api_key}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all disabled:opacity-30 border border-white/5">
            {testing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />} {testing ? 'Validando...' : 'Testar Conexão'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              Crie uma chave de API (API Key) e copie o valor.
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">3</span>
              Cole a chave no campo ao lado e salve a configuração.
            </li>
          </ul>
        </div>

        <div className="bg-zinc-950/50 p-8 rounded-[2rem] border border-white/5 flex flex-col justify-center">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">O que a IA faz?</h3>
          <p className="text-xs text-zinc-500 leading-relaxed italic">
            "O módulo de IA permite gerar estudos de células baseados no tema da semana, criar esboços ministeriais e analisar o engajamento espiritual dos discípulos automaticamente."
          </p>
        </div>
      </div>
    </div>
  );
};

export default SaaSAITab;
