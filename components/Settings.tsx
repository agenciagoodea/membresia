import React, { useState, useEffect } from 'react';
import {
  User,
  Settings as SettingsIcon,
  Shield,
  Database,
  Bell,
  Globe,
  CreditCard,
  Save,
  Camera,
  LogOut,
  Zap,
  MapPin,
  Building,
  Map,
  Home,
  Heart,
  X,
  Activity,
  Lock,
  Calendar,
  ChevronRight,
  Mail,
  Phone,
  Target,
  Users,
  Check
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './Shared/cropImage';
import { memberService } from '../services/memberService';
import { churchService } from '../services/churchService';
import { supabase } from '../services/supabaseClient';
import { Member, ChurchTenant, UserRole } from '../types';

const Settings: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [church, setChurch] = useState<ChurchTenant | null>(null);

  // Estados dos formulários controlados
  const [profileData, setProfileData] = useState<Partial<Member>>({});
  const [churchData, setChurchData] = useState<Partial<ChurchTenant>>({});

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [fetchingCep, setFetchingCep] = useState(false);

  // Cropper states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    setProfileData((prev: any) => ({ ...prev, cep }));

    if (cep.length === 8) {
      try {
        setFetchingCep(true);
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setProfileData((prev: any) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  useEffect(() => {
    if (!user?.churchId) {
      // Sem churchId: usar dados do próprio objeto user (metadata)
      setProfileData({
        name: user?.name || user?.user_metadata?.name || '',
        email: user?.email || user?.user_metadata?.email || '',
        phone: user?.phone || '',
        avatar: user?.avatar || user?.user_metadata?.avatar_url || ''
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      // 1. Inicializar imediatamente com o que temos do Props
      setProfileData({
        name: user.name || user.user_metadata?.name || '',
        email: user.email || user.user_metadata?.email || '',
        phone: user.phone || user.user_metadata?.phone || '',
        avatar: user.avatar || user.user_metadata?.avatar_url || '',
        cpf: user.cpf || user.user_metadata?.cpf || '',
        birthDate: user.birthDate || user.user_metadata?.birth_date || '',
        // Garantir campos de endereço iniciais do cache
        cep: user.cep || user.user_metadata?.cep || '',
        street: user.street || user.user_metadata?.street || '',
        number: user.number || user.user_metadata?.number || '',
        neighborhood: user.neighborhood || user.user_metadata?.neighborhood || '',
        city: user.city || user.user_metadata?.city || '',
        state: user.state || user.user_metadata?.state || ''
      });

      let effectiveChurchId = user.churchId;
      let myProfile = null;

      // 2. Se não temos church_id no user, tentar buscar o membro pelo email globalmente para recuperar o ID
      if (!effectiveChurchId || effectiveChurchId === 'undefined' || typeof effectiveChurchId !== 'string') {
        const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
        if (userEmail) {
          myProfile = await memberService.getByEmail(userEmail).catch(() => null);
          if (myProfile?.churchId) {
            effectiveChurchId = myProfile.churchId;
          }
        }
      }

      // Validar church_id efetivo
      if (!effectiveChurchId || effectiveChurchId === 'undefined' || effectiveChurchId.length < 30) {
        if (myProfile) {
          setMember(myProfile);
          setProfileData(prev => ({ ...prev, ...myProfile }));
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar em paralelo: dados da igreja + membros
        const [churchRes, membersList] = await Promise.all([
          churchService.getById(effectiveChurchId).catch(() => null),
          memberService.getAll(effectiveChurchId).catch(() => [])
        ]);

        if (!cancelled) {
          if (churchRes) {
            setChurch(churchRes);
            setChurchData(churchRes);
          }
          setAllMembers(membersList);

          // Se ainda não temos o perfil (não buscamos globalmente), buscar na lista da igreja
          if (!myProfile) {
            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
            myProfile = membersList.find(m => m.email?.toLowerCase().trim() === userEmail);
          }

          if (myProfile) {
            setMember(myProfile);
            setProfileData(prev => ({
              ...prev,
              ...myProfile,
              name: myProfile.name || prev.name,
              email: myProfile.email || prev.email,
              phone: myProfile.phone || prev.phone
            }));
          }
        }
      } catch (error) {
        if (!cancelled) console.error('Erro ao buscar configurações:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user?.id, user?.churchId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (activeTab === 'PROFILE') {
        if (member?.id) {
          // Atualiza Perfil na tabela members
          const updated = await memberService.update(member.id, profileData);
          setMember(updated);
        } else {
          // Para MASTER_ADMIN ou usuários sem registro na tabela: salvar no Auth metadata
          const { error: authError } = await supabase.auth.updateUser({
            data: {
              name: profileData.name,
              phone: profileData.phone,
              cpf: profileData.cpf,
              birth_date: profileData.birthDate,
            }
          });
          if (authError) throw authError;
          
          // Se for Master Admin, atualizar também o objeto virtual em cache para refletir na UI imediatamente
          await supabase.auth.updateUser({
            data: { profile: { ...user, ...profileData } }
          });
        }
        alert('Perfil pessoal atualizado com sucesso!');
      } else if (activeTab === 'CHURCH' && church?.id) {
        // Atualiza Igreja
        const updated = await churchService.update(church.id, churchData);
        setChurch(updated);
        alert('Dados da igreja atualizados com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Resumo do erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido ao salvar.'));
    } finally {
      setSaving(false);
    }
  };

  const onCropComplete = React.useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropCancel = () => {
    setIsCropping(false);
    setPhotoPreview('');
    setSelectedFile(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    try {
      setIsProcessingCrop(true);
      const croppedImageFile = await getCroppedImg(
        photoPreview,
        croppedAreaPixels
      );

      if (croppedImageFile) {
        setIsCropping(false);
        setSaving(true);
        const url = await memberService.uploadAvatar(croppedImageFile);

        // Salvar na tabela members se houver membro cadastrado
        if (member?.id) {
          const updated = await memberService.update(member.id, { avatar: url });
          setMember(updated);
        } else {
          // Para MASTER_ADMIN: salvar no user_metadata do Auth
          await supabase.auth.updateUser({ data: { avatar_url: url } });
        }

        setProfileData(prev => ({ ...prev, avatar: url }));
        setPhotoPreview('');
        setSelectedFile(null);
        alert('Foto de perfil atualizada com sucesso!');
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao recortar ou salvar imagem.");
    } finally {
      setIsProcessingCrop(false);
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'PROFILE', label: 'Meu Perfil', icon: <User size={18} /> },
    ...(user.role !== UserRole.MASTER_ADMIN ? [{ id: 'CHURCH', label: 'Dados da Igreja', icon: <Globe size={18} /> }] : []),
    { id: 'SECURITY', label: 'Segurança & API', icon: <Lock size={18} /> },
  ];

  // Ajustar perfil para Agência Goodea se for Master Admin
  const activeUser = user.role === UserRole.MASTER_ADMIN ? {
    ...user,
    name: 'Agência Goodea',
    avatar: 'https://ui-avatars.com/api/?name=Agencia+Goodea&background=2563eb&color=fff&size=200'
  } : user;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Configurações</h2>
          <p className="text-zinc-500 font-medium text-lg italic">Console de controle da sua instância e perfil pessoal.</p>
        </div>
        {(activeTab === 'PROFILE' || (activeTab === 'CHURCH' && activeUser.role === UserRole.CHURCH_ADMIN)) && (
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={`flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="lg:w-72 space-y-1.5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl border border-white/5' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                }`}
            >
              <div className="flex items-center gap-4">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && <ChevronRight size={14} className="text-blue-500" />}
            </button>
          ))}
          <div className="pt-8 mt-8 border-t border-white/5">
            <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-all">
              <LogOut size={18} /> Sair da Conta
            </button>
          </div>
        </div>

        <div className="flex-1 bg-zinc-900 rounded-[3rem] border border-white/5 p-6 md:p-10 shadow-2xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-black tracking-[0.5em] animate-pulse">
              Sincronizando Banco de Dados...
            </div>
          ) : (
            <>
              {activeTab === 'PROFILE' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="relative group cursor-pointer">
                      <img 
                        src={profileData.avatar || activeUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || activeUser.name || 'User')}&background=2563eb&color=fff&size=200`} 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || activeUser.name || 'User')}&background=2563eb&color=fff&size=200`; }}
                        className="w-32 h-32 rounded-full ring-4 ring-zinc-950 shadow-2xl object-cover transition-transform group-hover:scale-105" 
                        alt="Avatar" 
                      />
                      <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Camera className="text-white" size={24} />
                      </label>
                      <input id="avatar-upload" type="file" accept="image/*" className="hidden" aria-hidden="true" onChange={handlePhotoSelect} disabled={saving} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight break-all">{profileData.name || activeUser.name}</h3>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">{member?.role || activeUser.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Campos Básicos */}
                    <div className="space-y-4 md:col-span-2">
                      <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-2">Informações Básicas</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome de Exibição / Civil</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.name || ''} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail Ministerial de Acesso</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail size={16} className="text-zinc-600" />
                        </div>
                        <input type="email" value={profileData.email || ''} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone size={16} className="text-zinc-600" />
                        </div>
                        <input type="tel" value={profileData.phone || ''} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} placeholder="(11) 99999-9999" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF</label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                           <Target size={16} className="text-zinc-600" />
                         </div>
                         <input value={profileData.cpf || ''} onChange={e => setProfileData({ ...profileData, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                       </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Calendar size={16} className="text-zinc-600" />
                        </div>
                        <input type="date" value={profileData.birthDate || ''} onChange={e => setProfileData({ ...profileData, birthDate: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estado Civil</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Heart size={16} className="text-zinc-600" />
                        </div>
                        <select
                          value={profileData.maritalStatus || 'Solteiro(a)'}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setProfileData({ ...profileData, maritalStatus: newStatus, spouseId: newStatus === 'Casado(a)' ? profileData.spouseId : '' });
                          }}
                          className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                        >
                          {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'].map(status => (
                            <option key={status} value={status} className="bg-zinc-900">{status}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {profileData.maritalStatus === 'Casado(a)' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cônjuge</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Users size={16} className="text-zinc-600" />
                          </div>
                          <select
                            value={profileData.spouseId || ''}
                            onChange={(e) => setProfileData({ ...profileData, spouseId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-zinc-900">Selecione o Cônjuge</option>
                            {allMembers.filter(m => m.id !== member?.id).map(m => (
                              <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Endereço Residencial */}
                    <div className="space-y-4 md:col-span-2 pt-6">
                      <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-2">Endereço Residencial</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CEP</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Map size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.cep || ''} onChange={handleCepChange} maxLength={9} placeholder="00000-000" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                        {fetchingCep && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Home size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.street || ''} onChange={e => setProfileData({ ...profileData, street: e.target.value })} placeholder="Nome da rua" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Número</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <MapPin size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.number || ''} onChange={e => setProfileData({ ...profileData, number: e.target.value })} placeholder="123" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Complemento</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.complement || ''} onChange={e => setProfileData({ ...profileData, complement: e.target.value })} placeholder="Apto, Bloco, etc" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bairro</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Map size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.neighborhood || ''} onChange={e => setProfileData({ ...profileData, neighborhood: e.target.value })} placeholder="Bairro" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cidade</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.city || ''} onChange={e => setProfileData({ ...profileData, city: e.target.value })} placeholder="Cidade" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">UF</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <MapPin size={16} className="text-zinc-600" />
                        </div>
                        <input value={profileData.state || ''} onChange={e => setProfileData({ ...profileData, state: e.target.value })} placeholder="SP" maxLength={2} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'CHURCH' && (
                <div className={`space-y-10 animate-in fade-in duration-300 ${activeUser.role !== UserRole.CHURCH_ADMIN ? 'opacity-80 pointer-events-none' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="w-32 h-32 rounded-[2rem] bg-zinc-950 border border-white/5 shadow-2xl flex items-center justify-center p-2 relative overflow-hidden group cursor-pointer">
                      {churchData.logo ? (
                        <img src={churchData.logo} className="w-full h-full object-contain" alt="Church Logo" />
                      ) : (
                        <Building size={48} className="text-zinc-800" />
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Alterar Logo</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight break-all">{churchData.name || 'Sua Igreja'}</h3>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">Tenant ID: {churchData.slug}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Razão Social / Nome da Igreja</label>
                      <input value={churchData.name || ''} onChange={e => setChurchData({ ...churchData, name: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CNPJ Institucional</label>
                      <input value={churchData.cnpj || ''} onChange={e => setChurchData({ ...churchData, cnpj: e.target.value })} placeholder="00.000.000/0001-00" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail de Contato da Igreja</label>
                      <input type="email" value={churchData.email || ''} onChange={e => setChurchData({ ...churchData, email: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Responsável Legal</label>
                      <input value={churchData.responsibleName || ''} onChange={e => setChurchData({ ...churchData, responsibleName: e.target.value })} placeholder="Nome do representante..." className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>

                    {/* Endereço da Igreja */}
                    <div className="space-y-4 md:col-span-2 pt-6">
                      <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-2">Endereço da Instituição</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CEP</label>
                      <input value={churchData.addressDetails?.cep || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, cep: e.target.value } as any })} maxLength={9} placeholder="00000-000" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                      <input value={churchData.addressDetails?.street || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, street: e.target.value } as any })} placeholder="Nome da rua" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Número</label>
                      <input value={churchData.addressDetails?.number || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, number: e.target.value } as any })} placeholder="123" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Complemento</label>
                      <input value={churchData.addressDetails?.complement || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, complement: e.target.value } as any })} placeholder="Apto, Bloco, etc" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Bairro</label>
                      <input value={churchData.addressDetails?.neighborhood || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, neighborhood: e.target.value } as any })} placeholder="Bairro" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cidade</label>
                      <input value={churchData.addressDetails?.city || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, city: e.target.value } as any })} placeholder="Cidade" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">UF</label>
                      <input value={churchData.addressDetails?.state || ''} onChange={e => setChurchData({ ...churchData, addressDetails: { ...churchData.addressDetails, state: e.target.value } as any })} placeholder="UF" maxLength={2} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'SECURITY' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div className="p-8 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-inner">
                    <div className="flex items-center gap-4 mb-6">
                      <Zap size={24} className="text-amber-500" />
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">API Key Geral de Integração</h4>
                    </div>
                    <p className="text-zinc-500 text-sm mb-6 leading-relaxed italic">Esta chave habilita os módulos de Neural Insights e Sermão IA. O mantenedor gerencia esses tokens internamente. Mantenha-a em sigilo absoluto.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <input type="password" value="••••••••••••••••••••••••••••••" readOnly className="w-full sm:flex-1 bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono text-zinc-400" />
                      <button className="w-full sm:w-auto px-6 py-4 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">Regerar T-Key</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== 'PROFILE' && activeTab !== 'CHURCH' && activeTab !== 'SECURITY' && (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-800 italic uppercase font-black tracking-[0.5em] animate-pulse">
                  Em Desenvolvimento
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isCropping && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto pt-4 md:pt-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleCropCancel} />

          <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Recortar Foto</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Ajuste a imagem para o perfil</p>
              </div>
              <button onClick={handleCropCancel} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col h-[500px]">
              <div className="relative flex-1 bg-zinc-950">
                <Cropper
                  image={photoPreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              <div className="p-6 bg-zinc-900 border-t border-white/5 flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <button
                  onClick={handleCropCancel}
                  className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCropConfirm}
                  disabled={isProcessingCrop}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isProcessingCrop ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Check size={16} /> Confirmar & Salvar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
