
import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  MessageCircle, 
  BrainCircuit, 
  ScrollText,
  RefreshCw,
  Loader2,
  Zap,
  Target,
  LineChart,
  ArrowRight,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { generatePastoralInsight, generateSermonDraft } from '../services/geminiService';
import { MOCK_TENANT } from '../constants';

const IAInsights: React.FC<{ user: any }> = ({ user }) => {
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loadingSermon, setLoadingSermon] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [sermon, setSermon] = useState<string | null>(null);
  const [theme, setTheme] = useState('');

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const context = `Igreja: ${MOCK_TENANT.name}, Membros: ${MOCK_TENANT.stats.totalMembers}, Células: ${MOCK_TENANT.stats.activeCells}.`;
    const result = await generatePastoralInsight(context);
    setInsight(result || 'Erro ao gerar insight');
    setLoadingInsight(false);
  };

  const handleGenerateSermon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme) return;
    setLoadingSermon(true);
    const result = await generateSermonDraft(theme);
    setSermon(result || 'Erro ao gerar esboço');
    setLoadingSermon(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
            Neural Insights <Sparkles className="text-blue-500 animate-pulse" size={32} />
          </h2>
          <p className="text-zinc-500 font-medium text-lg italic">Inteligência Artificial generativa aplicada ao crescimento do Reino.</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gemini Engine Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Pastoral Strategic Insights */}
        <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col group">
          <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <BrainCircuit size={200} />
          </div>
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20">
                <Target size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Consultoria Estratégica</h3>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Análise de Dados do Tenant</p>
              </div>
            </div>
          </div>

          {!insight && !loadingInsight && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-8 relative z-10">
              <div className="w-20 h-20 bg-zinc-950 rounded-3xl flex items-center justify-center border border-white/5 shadow-inner">
                <LineChart size={40} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm max-w-xs font-medium leading-relaxed italic">
                "Clique para processar os dados de membros e células e receber 3 estratégias de expansão."
              </p>
              <button 
                onClick={handleGenerateInsight}
                className="w-full py-5 bg-white text-zinc-950 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5"
              >
                Gerar Diagnóstico Agora
              </button>
            </div>
          )}

          {loadingInsight && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <Loader2 className="animate-spin text-blue-500" size={60} strokeWidth={1} />
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={24} />
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Cruzando dados ministeriais...</p>
            </div>
          )}

          {insight && !loadingInsight && (
            <div className="flex-1 space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative z-10">
              <div className="bg-zinc-950 p-8 rounded-[2rem] border border-white/5 whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed font-medium italic shadow-inner">
                {insight}
              </div>
              <button 
                onClick={() => setInsight(null)}
                className="w-full py-4 border border-white/5 text-zinc-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Nova Consulta
              </button>
            </div>
          )}
        </div>

        {/* Sermon Generator */}
        <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col group">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-emerald-600/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
              <ScrollText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Esboços Ministeriais</h3>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Baseado em Hermenêutica IA</p>
            </div>
          </div>

          <form onSubmit={handleGenerateSermon} className="mb-10 relative z-10">
            <div className="relative">
              <Terminal className="absolute left-5 top-5 text-zinc-600" size={20} />
              <input 
                type="text" 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Qual o tema da próxima célula?" 
                className="w-full bg-zinc-950 border border-white/5 rounded-[2rem] pl-14 pr-16 py-5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white font-bold transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={loadingSermon || !theme}
                className="absolute right-3 top-3 bottom-3 px-5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                {loadingSermon ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>

          {sermon && !loadingSermon && (
            <div className="flex-1 bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed font-medium italic shadow-inner animate-in zoom-in-95 duration-500">
              {sermon}
            </div>
          )}

          {loadingSermon && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="animate-spin text-emerald-500" size={60} strokeWidth={1} />
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Buscando referências bíblicas...</p>
            </div>
          )}

          {!sermon && !loadingSermon && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-800 opacity-20">
              <ScrollText size={100} strokeWidth={0.5} />
              <p className="mt-4 text-xs font-black uppercase tracking-widest">Aguardando Input</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Banner de Rodapé */}
      <div className="bg-blue-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
         <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
            <Sparkles size={250} />
         </div>
         <div className="space-y-4 max-w-2xl relative z-10">
            <h4 className="text-3xl font-black tracking-tighter uppercase leading-none">Próxima Geração de Liderança</h4>
            <p className="text-blue-100 font-bold leading-relaxed italic text-lg">
              "A tecnologia não substitui o Espírito Santo, ela remove a burocracia para que você tenha mais tempo para ouvir a voz de Deus."
            </p>
         </div>
         <button className="shrink-0 px-10 py-5 bg-zinc-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-3 relative z-10">
            Ver Roadmap IA <ArrowRight size={18} />
         </button>
      </div>
    </div>
  );
};

export default IAInsights;
