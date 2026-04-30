import React, { useState, useEffect } from 'react';
import { Palette, Save, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon, Globe } from 'lucide-react';
import { saasService, SaasSettings } from '../../services/saasService';
import { memberService } from '../../services/memberService';

const SaaSThemeTab: React.FC = () => {
  const [settings, setSettings] = useState<SaasSettings>({ site_name: 'Ecclesia', primary_color: '#3b82f6', secondary_color: '#1d4ed8', accent_color: '#6366f1' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    saasService.getSettings().then(d => { if (d) setSettings(p => ({ ...p, ...d })); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); setMsg(null); await saasService.updateSettings({ ...settings, updated_at: new Date().toISOString() }); setMsg({ type: 'success', text: 'Configurações salvas!' }); }
    catch (err: any) { setMsg({ type: 'error', text: err.message || 'Erro ao salvar.' }); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'logo_icon_url' | 'favicon_url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await memberService.uploadAvatar(file); setSettings(p => ({ ...p, [field]: url })); } catch { alert('Erro ao enviar imagem.'); }
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-blue-500" /></div>;

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const lbl = "text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20"><Palette className="text-violet-400" size={24} /></div>
        <div><h2 className="text-xl font-black text-white tracking-tight">Tema & Branding</h2><p className="text-sm text-zinc-400">Identidade visual, landing page e SEO.</p></div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} <p className="text-sm font-medium">{msg.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Branding */}
        <div><h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Identidade Visual</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ l: 'Logo Principal', f: 'logo_url' as const }, { l: 'Logo Ícone', f: 'logo_icon_url' as const }, { l: 'Favicon', f: 'favicon_url' as const }].map(item => (
              <div key={item.f} className="space-y-2">
                <label className={lbl}>{item.l}</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-zinc-950 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                    {settings[item.f] ? <img src={settings[item.f]!} className="w-full h-full object-contain" alt="" /> : <ImageIcon size={20} className="text-zinc-700" />}
                  </div>
                  <label className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-zinc-700 transition-all">
                    Enviar <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, item.f)} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cores */}
        <div><h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Cores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ l: 'Cor Primária', f: 'primary_color' as const }, { l: 'Cor Secundária', f: 'secondary_color' as const }, { l: 'Cor Destaque', f: 'accent_color' as const }].map(item => (
              <div key={item.f} className="space-y-2">
                <label className={lbl}>{item.l}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings[item.f] || '#3b82f6'} onChange={e => setSettings({...settings, [item.f]: e.target.value})} className="w-10 h-10 rounded-lg border-none cursor-pointer" />
                  <input value={settings[item.f] || ''} onChange={e => setSettings({...settings, [item.f]: e.target.value})} className={inp} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Landing Page */}
        <div><h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Landing Page</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={lbl}>Nome do SaaS</label><input value={settings.site_name || ''} onChange={e => setSettings({...settings, site_name: e.target.value})} className={inp} /></div>
            <div><label className={lbl}>CTA (Call to Action)</label><input value={settings.landing_cta_text || ''} onChange={e => setSettings({...settings, landing_cta_text: e.target.value})} className={inp} placeholder="Começar Agora" /></div>
            <div className="md:col-span-2"><label className={lbl}>Título Principal</label><input value={settings.landing_title || ''} onChange={e => setSettings({...settings, landing_title: e.target.value})} className={inp} /></div>
            <div className="md:col-span-2"><label className={lbl}>Subtítulo</label><input value={settings.landing_subtitle || ''} onChange={e => setSettings({...settings, landing_subtitle: e.target.value})} className={inp} /></div>
            <div className="md:col-span-2"><label className={lbl}>Descrição</label><textarea rows={3} value={settings.landing_description || ''} onChange={e => setSettings({...settings, landing_description: e.target.value})} className={inp + ' resize-none'} /></div>
          </div>
        </div>

        {/* SEO */}
        <div><h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">SEO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={lbl}>SEO Title</label><input value={settings.seo_title || ''} onChange={e => setSettings({...settings, seo_title: e.target.value})} className={inp} /></div>
            <div><label className={lbl}>SEO Keywords</label><input value={settings.seo_keywords || ''} onChange={e => setSettings({...settings, seo_keywords: e.target.value})} className={inp} placeholder="igreja, saas, células" /></div>
            <div className="md:col-span-2"><label className={lbl}>SEO Description</label><textarea rows={2} value={settings.seo_description || ''} onChange={e => setSettings({...settings, seo_description: e.target.value})} className={inp + ' resize-none'} /></div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} {saving ? 'Salvando...' : 'Publicar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SaaSThemeTab;
