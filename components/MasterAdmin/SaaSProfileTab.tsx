import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Target, Calendar, MapPin, Lock, Save, Camera, Smartphone, Heart, Users } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';
import { memberService } from '../../services/memberService';
import { supabase } from '../../services/supabaseClient';
import { Member } from '../../types';
import { maskCPF, maskPhone } from '../../utils/masks';

const SaaSProfileTab: React.FC<{ user: any }> = ({ user }) => {
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [profileData, setProfileData] = useState<any>({});
  const [photoPreview, setPhotoPreview] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const m = await memberService.getByEmail(user.email);
        if (m) {
          setMember(m);
          setProfileData({
            name: m.name || '', email: m.email || '', phone: maskPhone(m.phone || ''),
            cpf: maskCPF(m.cpf || ''), birthDate: m.birthDate || '', sex: m.sex || '',
            maritalStatus: m.maritalStatus || '', avatar: m.avatar || '',
            cep: m.cep || '', street: m.street || '', number: m.number || '',
            complement: m.complement || '', neighborhood: m.neighborhood || '',
            city: m.city || '', state: m.state || '',
          });
        } else {
          setProfileData({ name: user.name || '', email: user.email || '', avatar: user.avatar || '' });
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [user.email]);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    setProfileData((p: any) => ({ ...p, cep }));
    if (cep.length === 8) {
      setFetchingCep(true);
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if (!d.erro) setProfileData((p: any) => ({ ...p, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, state: d.uf }));
      } catch {} finally { setFetchingCep(false); }
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setPhotoPreview(reader.result as string); setIsCropping(true); };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    try {
      const croppedFile = await getCroppedImg(photoPreview, croppedAreaPixels);
      if (croppedFile) {
        setIsCropping(false);
        const url = await memberService.uploadAvatar(croppedFile);
        if (member?.id) {
          await memberService.update(member.id, { avatar: url });
          await supabase.auth.updateUser({ data: { profile: { ...user, avatar: url } } });
        }
        setProfileData((p: any) => ({ ...p, avatar: url }));
      }
    } catch (e) { console.error(e); alert('Erro ao salvar imagem.'); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data: any = { ...profileData };
      if (data.birthDate?.includes('/')) {
        const p = data.birthDate.split('/');
        data.birthDate = `${p[2]}-${p[1]}-${p[0]}`;
      }
      if (member?.id) {
        const updated = await memberService.update(member.id, data);
        if (updated) { setMember(updated); await supabase.auth.updateUser({ data: { profile: updated } }); }
      }
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) { alert('Senhas não coincidem!'); return; }
        await supabase.auth.updateUser({ password: profileData.newPassword });
        setProfileData((p: any) => ({ ...p, newPassword: '', confirmPassword: '' }));
      }
      alert('Perfil atualizado!');
    } catch (e: any) { alert('Erro: ' + e.message); } finally { setSaving(false); }
  };

  const inp = "w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all";
  const lbl = "text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <img src={profileData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || 'U')}&background=2563eb&color=fff&size=200`}
            className="w-28 h-28 rounded-[2rem] ring-4 ring-zinc-950 shadow-2xl object-cover" alt="" />
          <div className="absolute -bottom-2 -right-2 flex gap-1">
            <label htmlFor="saas-avatar" className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer border-2 border-zinc-950"><Camera size={16} /></label>
          </div>
          <input id="saas-avatar" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase">{profileData.name || 'Master Admin'}</h3>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">MASTER ADMIN</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2"><label className={lbl}>Nome Completo</label><input value={profileData.name || ''} onChange={e => setProfileData({...profileData, name: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>E-mail</label><input type="email" value={profileData.email || ''} onChange={e => setProfileData({...profileData, email: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Telefone</label><input value={profileData.phone || ''} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="(11) 99999-9999" className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>CPF</label><input value={profileData.cpf || ''} onChange={e => setProfileData({...profileData, cpf: e.target.value})} placeholder="000.000.000-00" className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Data de Nascimento</label><input type="date" value={profileData.birthDate || ''} onChange={e => setProfileData({...profileData, birthDate: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Gênero</label>
          <select value={profileData.sex || ''} onChange={e => setProfileData({...profileData, sex: e.target.value})} className={inp + ' appearance-none cursor-pointer'}>
            <option value="">Selecionar</option><option value="MASCULINO">Masculino</option><option value="FEMININO">Feminino</option>
          </select>
        </div>
        <div className="space-y-2"><label className={lbl}>Estado Civil</label>
          <select value={profileData.maritalStatus || ''} onChange={e => setProfileData({...profileData, maritalStatus: e.target.value})} className={inp + ' appearance-none cursor-pointer'}>
            <option value="">Selecionar</option>
            {['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Endereço */}
      <div className="pt-4 space-y-1"><div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-emerald-500 rounded-full" /><h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Endereço</h4></div></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2"><label className={lbl}>CEP</label><input value={profileData.cep || ''} onChange={handleCepChange} maxLength={9} placeholder="00000-000" className={inp} /></div>
        <div className="md:col-span-2 space-y-2"><label className={lbl}>Rua</label><input value={profileData.street || ''} onChange={e => setProfileData({...profileData, street: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Número</label><input value={profileData.number || ''} onChange={e => setProfileData({...profileData, number: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Bairro</label><input value={profileData.neighborhood || ''} onChange={e => setProfileData({...profileData, neighborhood: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Cidade</label><input value={profileData.city || ''} onChange={e => setProfileData({...profileData, city: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>UF</label><input value={profileData.state || ''} onChange={e => setProfileData({...profileData, state: e.target.value})} maxLength={2} className={inp} /></div>
      </div>

      {/* Segurança */}
      <div className="pt-4 space-y-1"><div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-rose-600 rounded-full" /><h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Segurança</h4></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2"><label className={lbl}>Nova Senha</label><input type="password" value={profileData.newPassword || ''} onChange={e => setProfileData({...profileData, newPassword: e.target.value})} className={inp} /></div>
        <div className="space-y-2"><label className={lbl}>Confirmar Senha</label><input type="password" value={profileData.confirmPassword || ''} onChange={e => setProfileData({...profileData, confirmPassword: e.target.value})} className={inp} /></div>
      </div>

      <div className="pt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
          <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>

      {isCropping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCropping(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden h-[500px] flex flex-col">
            <div className="relative flex-1"><Cropper image={photoPreview} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={(_, c) => setCroppedAreaPixels(c)} onZoomChange={setZoom} cropShape="round" /></div>
            <div className="p-4 bg-zinc-900 flex gap-4">
              <button onClick={() => setIsCropping(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-black uppercase">Cancelar</button>
              <button onClick={handleCropConfirm} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSProfileTab;
