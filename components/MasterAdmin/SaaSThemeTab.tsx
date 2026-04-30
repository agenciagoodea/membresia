import React, { useState, useEffect } from 'react';
import { Palette, Save, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { saasService, SaasSettings } from '../../services/saasService';
import { memberService } from '../../services/memberService';

const SaaSThemeTab: React.FC = () => {
  const [s, setS] = useState<SaasSettings>({ site_name: 'Ecclesia', primary_color: '#3b82f6', secondary_color: '#1d4ed8', accent_color: '#6366f1' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saasService.getSettings().then(d => { if (d) setS(p => ({ ...p, ...d })); }).catch(e => console.error('Load theme:', e)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true); setMsg(null);
      console.log('Salvando tema:', s);
      await saasService.updateSettings(s);
      setMsg({ type: 'success', text: 'Tema e landing page salvos com sucesso!' });
    } catch (err: any) { console.error('Save theme:', err); setMsg({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof SaasSettings) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await memberService.uploadAvatar(file); setS(p => ({ ...p, [field]: url })); } catch { alert('Erro ao enviar.'); }
  };

  if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>;

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium";
  const lbl = "text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20"><Palette className="text-violet-400" size={24} /></div>
        <div><h2 className="text-xl font-black text-white tracking-tight">Tema & Branding</h2><p className="text-xs text-zinc-500">Identidade visual, landing page e SEO</p></div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
        </div>
      )}

      {/* Logos */}
      <div><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Identidade Visual</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {([['Logo Principal', 'logo_url'], ['Logo Ícone', 'logo_icon_url'], ['Favicon', 'favicon_url']] as const).map(([label, field]) => (
            <div key={field} className="space-y-2">
              <label className={lbl}>{label}</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-zinc-950 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {s[field] ? <img src={s[field]!} className="w-full h-full object-contain" alt="" /> : <ImageIcon size={20} className="text-zinc-700" />}
                </div>
                <label className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-zinc-700 transition-all">
                  Enviar <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, field)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cores */}
      <div><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Cores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {([['Primária', 'primary_color'], ['Secundária', 'secondary_color'], ['Destaque', 'accent_color']] as const).map(([label, field]) => (
            <div key={field} className="space-y-2">
              <label className={lbl}>Cor {label}</label>
              <div className="flex items-center gap-3">
                <input type="color" value={s[field] || '#3b82f6'} onChange={e => setS({...s, [field]: e.target.value})} className="w-10 h-10 rounded-lg border-none cursor-pointer" />
                <input value={s[field] || ''} onChange={e => setS({...s, [field]: e.target.value})} className={inp} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Landing */}
      <div><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Landing Page</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className={lbl}>Nome do SaaS</label><input value={s.site_name || ''} onChange={e => setS({...s, site_name: e.target.value})} className={inp} /></div>
          <div><label className={lbl}>CTA</label><input value={s.landing_cta_text || ''} onChange={e => setS({...s, landing_cta_text: e.target.value})} className={inp} placeholder="Começar Agora" /></div>
          <div className="md:col-span-2"><label className={lbl}>Título</label><input value={s.landing_title || ''} onChange={e => setS({...s, landing_title: e.target.value})} className={inp} /></div>
          <div className="md:col-span-2"><label className={lbl}>Subtítulo</label><input value={s.landing_subtitle || ''} onChange={e => setS({...s, landing_subtitle: e.target.value})} className={inp} /></div>
          <div className="md:col-span-2"><label className={lbl}>Descrição</label><textarea rows={3} value={s.landing_description || ''} onChange={e => setS({...s, landing_description: e.target.value})} className={inp + ' resize-none'} /></div>
        </div>
      </div>

      {/* SEO */}
      <div><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">SEO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className={lbl}>Title</label><input value={s.seo_title || ''} onChange={e => setS({...s, seo_title: e.target.value})} className={inp} /></div>
          <div><label className={lbl}>Keywords</label><input value={s.seo_keywords || ''} onChange={e => setS({...s, seo_keywords: e.target.value})} className={inp} placeholder="igreja, saas, células" /></div>
          <div className="md:col-span-2"><label className={lbl}>Description</label><textarea rows={2} value={s.seo_description || ''} onChange={e => setS({...s, seo_description: e.target.value})} className={inp + ' resize-none'} /></div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} {saving ? 'Salvando...' : 'Publicar Alterações'}
        </button>
      </div>
    </div>
  );
};

export default SaaSThemeTab;
