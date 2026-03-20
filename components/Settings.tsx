import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Check,
  Baby,
  Smartphone,
  ArrowUpRight,
  Users2,
  ShieldCheck,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './Shared/cropImage';
import { memberService } from '../services/memberService';
import { churchService } from '../services/churchService';
import { cellService } from '../services/cellService';
import { supabase } from '../services/supabaseClient';
import { m12Service } from '../services/m12Service';
import { Member, ChurchTenant, UserRole, Cell, LadderStage, M12Activity } from '../types';

const Settings: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [church, setChurch] = useState<ChurchTenant | null>(null);
  const [showM12Modal, setShowM12Modal] = useState(false);

  // Estados dos formulários controlados
  const [profileData, setProfileData] = useState<Partial<Member>>({});
  const [churchData, setChurchData] = useState<Partial<ChurchTenant>>({});

  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allCells, setAllCells] = useState<Cell[]>([]);
  const [winActivities, setWinActivities] = useState<M12Activity[]>([]);
  const [fetchingCep, setFetchingCep] = useState(false);

  const calculateAge = (dateString: string) => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Cropper states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setProfileData({
        name: user.name || user.user_metadata?.name || '',
        email: user.email || user.user_metadata?.email || '',
        phone: user.phone || user.user_metadata?.phone || '',
        avatar: user.avatar || user.user_metadata?.avatar_url || '',
        cpf: user.cpf || user.user_metadata?.cpf || '',
        birthDate: user.birthDate || user.user_metadata?.birth_date || '',
        sex: user.sex || user.user_metadata?.sex || '',
        maritalStatus: user.maritalStatus || user.user_metadata?.marital_status || '',
        spouseId: user.spouseId || user.user_metadata?.spouse_id || '',
        hasChildren: user.hasChildren || user.user_metadata?.has_children || false,
        children: user.children || user.user_metadata?.children || [],
        cep: user.cep || user.user_metadata?.cep || '',
        street: user.street || user.user_metadata?.street || '',
        state: user.state || user.user_metadata?.state || '',
        origin: user.origin || user.user_metadata?.origin || '',
        conversionDate: user.conversionDate || user.user_metadata?.conversion_date || '',
        cellId: user.cellId || user.user_metadata?.cell_id || '',
        disciplerId: user.disciplerId || user.user_metadata?.discipler_id || '',
        pastorId: user.pastorId || user.user_metadata?.pastor_id || '',
        newPassword: '',
        confirmPassword: '',
        // Garantir que campos removidos não causem inconsistência na UI local
        holySpiritBaptism: null,
        waterBaptismDate: null,
      });

      let effectiveChurchId = user.churchId;
      let myProfile = null;

      if (!effectiveChurchId || effectiveChurchId === 'undefined' || typeof effectiveChurchId !== 'string') {
        const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
        if (userEmail) {
          myProfile = await memberService.getByEmail(userEmail).catch(() => null);
          if (myProfile?.churchId) {
            effectiveChurchId = myProfile.churchId;
          }
        }
      }

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
        const [churchRes, membersList, cellsList, m12Acts] = await Promise.all([
          churchService.getBySlug(user.churchSlug || user.user_metadata?.church_slug).catch(() => null),
          memberService.getAll(effectiveChurchId).catch(() => []),
          cellService.getAll(effectiveChurchId).catch(() => []),
          m12Service.getActivities(effectiveChurchId).catch(() => [])
        ]);

        if (!cancelled) {
          if (churchRes) {
            setChurch(churchRes);
            setChurchData(churchRes);
          }
          setAllMembers(membersList);
          setAllCells(cellsList);
          setWinActivities(m12Acts.filter(a => a.stage === LadderStage.WIN && a.isActive));

          if (!myProfile) {
            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
            myProfile = membersList.find(m => m.email?.toLowerCase().trim() === userEmail);
          }

          if (myProfile) {
            setMember(myProfile);
            // Sincronizar Origem com Respostas M12
            const responses = await m12Service.getMemberResponses(myProfile.id).catch(() => []);
            const winActs = m12Acts.filter(a => a.stage === LadderStage.WIN && a.isActive);
            const originAct = winActs.find(a => a.label.toLowerCase().includes('origem') || a.label.toLowerCase().includes('conheceu') || a.label.toLowerCase().includes('aceitou'));
            const originResponse = originAct ? responses.find(r => r.activity_id === originAct.id)?.value : null;

            const normalizedSex = (myProfile.sex === 'M' ? 'MASCULINO' : (myProfile.sex === 'F' ? 'FEMININO' : myProfile.sex)) || 'MASCULINO';

            setProfileData(prev => ({
              ...prev,
              ...myProfile,
              name: myProfile.name || prev.name,
              email: myProfile.email || prev.email,
              phone: myProfile.phone || prev.phone,
              sex: normalizedSex as any,
              origin: originResponse || myProfile.origin || prev.origin
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

  const handleCellChange = (cellId: string) => {
    const linkedCell = allCells.find(c => c.id === cellId);
    const updates: any = { cellId };

    if (linkedCell && linkedCell.leaderIds && linkedCell.leaderIds.length > 0) {
      // Filtrar líderes pelo gênero do usuário para definir o discipulador
      const leaders = linkedCell.leaderIds
        .map(id => allMembers.find(m => m.id === id))
        .filter(m => m && m.sex === profileData.sex);

      if (leaders.length > 0) {
        const leaderMember = leaders[0];
        if (leaderMember) {
          updates.disciplerId = leaderMember.id;
          if (leaderMember.pastorId) {
            // Verificar gênero do pastor também
            const pastorMember = allMembers.find(m => m.id === leaderMember.pastorId);
            if (pastorMember && pastorMember.sex === profileData.sex) {
              updates.pastorId = pastorMember.id;
            }
          }
        }
      }
    }
    setProfileData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (member?.id) {
        const wasProfileIncomplete = member.firstAccessCompleted === false;
        const updateData: any = { 
          ...profileData, 
          firstAccessCompleted: true,
          // Limpeza explícita conforme solicitado pelo usuário
          holySpiritBaptism: null,
          waterBaptismDate: null,
          waterBaptismPlace: null
        };

        // Persistência Tripla para Sincronização M12
        const originAct = winActivities.find(a => a.label.toLowerCase().includes('origem') || a.label.toLowerCase().includes('conheceu') || a.label.toLowerCase().includes('aceitou'));
        if (originAct && profileData.origin) {
          // 1. Salvar na tabela de respostas estruturadas
          await m12Service.saveMemberResponse(member.id, originAct.id, profileData.origin).catch(err => console.error('Erro ao sincronizar atividade:', err));
          
          // 2. Sincronizar milestoneValues para compatibilidade com MyM12Activities
          updateData.milestoneValues = {
            ...(member.milestoneValues || {}),
            [originAct.label]: profileData.origin
          };
          
          // 3. Garantir que esteja marcado como concluído nas atividades
          updateData.completedMilestones = Array.from(new Set([...(member.completedMilestones || []), originAct.label]));
        }

        const updated = await memberService.update(member.id, updateData);
        setMember(updated);
        await supabase.auth.updateUser({
          data: { profile: { ...user, ...updated, firstAccessCompleted: true } }
        });
        if (profileData.newPassword) {
          if (profileData.newPassword !== profileData.confirmPassword) {
            alert('As senhas não coincidem!');
            setSaving(false);
            return;
          }
          const { error: pwdError } = await supabase.auth.updateUser({ password: profileData.newPassword });
          if (pwdError) throw pwdError;
          setProfileData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
        }
        if (wasProfileIncomplete) setShowM12Modal(true);
        else alert('Perfil pessoal atualizado com sucesso!');
      } else {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            name: profileData.name,
            phone: profileData.phone,
            cpf: profileData.cpf,
            birth_date: profileData.birthDate,
            sex: profileData.sex,
            marital_status: profileData.maritalStatus,
            spouse_id: profileData.spouseId,
            has_children: profileData.hasChildren,
            children: profileData.children,
            conversion_date: profileData.conversionDate,
            origin: profileData.origin,
          }
        });
        if (authError) throw authError;
        alert('Perfil pessoal atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
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
      const croppedImageFile = await getCroppedImg(photoPreview, croppedAreaPixels);
      if (croppedImageFile) {
        setIsCropping(false);
        setSaving(true);
        const url = await memberService.uploadAvatar(croppedImageFile);
        if (member?.id) {
          const updated = await memberService.update(member.id, { avatar: url });
          setMember(updated);
          await supabase.auth.updateUser({ data: { profile: { ...user, ...updated, avatar: url } } });
        }
        setProfileData(prev => ({ ...prev, avatar: url }));
        alert('Foto de perfil atualizada!');
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar imagem.");
    } finally {
      setIsProcessingCrop(false);
      setSaving(false);
    }
  };

  const activeUser = user.role === UserRole.MASTER_ADMIN ? {
    ...user,
    name: user.name || 'Agência Goodea',
    avatar: user.avatar || user.avatar_url || 'https://ui-avatars.com/api/?name=Agencia+Goodea&background=2563eb&color=fff&size=200'
  } : user;

  return (
    <React.Fragment>
      <div className="space-y-10 animate-in fade-in duration-700">
        
        {/* Modal M12 */}
        {showM12Modal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowM12Modal(false)} />
            <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl p-8">
              <h2 className="text-2xl font-black text-white uppercase mb-4">Cadastro Concluído!</h2>
              <p className="text-zinc-400 text-sm mb-6">Finalize seu desenvolvimento informando suas atividades.</p>
              <button 
                onClick={() => { setShowM12Modal(false); navigate('/app/my-activities'); }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 mb-2"
              >
                Ir para Atividades
              </button>
              <button onClick={() => setShowM12Modal(false)} className="w-full py-3 text-zinc-500 font-bold uppercase">Depois</button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Meu Perfil</h2>
            <p className="text-zinc-500 font-medium text-lg italic">Mantenha seus dados atualizados.</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-[3rem] border border-white/5 p-6 md:p-10 shadow-2xl">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-black tracking-[0.5em] animate-pulse">
              Sincronizando...
            </div>
          )}

          {!loading && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="relative group">
                  <img 
                    src={profileData.avatar || activeUser.avatar || `https://ui-avatars.com/api/?name=User&background=2563eb&color=fff&size=200`} 
                    className="w-32 h-32 rounded-[2.5rem] ring-4 ring-zinc-950 shadow-2xl object-cover" 
                    alt="Avatar" 
                  />
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <label htmlFor="avatar-upload-gallery" className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center cursor-pointer border-2 border-zinc-950"><Smartphone size={18} /></label>
                    <label htmlFor="avatar-upload-camera" className="w-10 h-10 bg-zinc-800 text-white rounded-2xl flex items-center justify-center cursor-pointer border-2 border-zinc-950"><Camera size={18} /></label>
                  </div>
                  <input id="avatar-upload-gallery" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  <input id="avatar-upload-camera" type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase">{profileData.name || activeUser.name}</h3>
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{member?.role || activeUser.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informações Básicas */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs border-b border-white/5 pb-2">Informações Básicas</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User size={16} className="text-zinc-600" /></div>
                    <input value={profileData.name || ''} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail size={16} className="text-zinc-600" /></div>
                    <input type="email" value={profileData.email || ''} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone size={16} className="text-zinc-600" /></div>
                    <input type="tel" value={profileData.phone || ''} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} placeholder="(11) 99999-9999" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Target size={16} className="text-zinc-600" /></div>
                    <input value={profileData.cpf || ''} onChange={e => setProfileData({ ...profileData, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Calendar size={16} className="text-zinc-600" /></div>
                    <input type="date" value={profileData.birthDate || ''} onChange={e => setProfileData({ ...profileData, birthDate: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Conversão</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Zap size={16} className="text-zinc-600" /></div>
                    <input type="date" value={profileData.conversionDate || ''} onChange={e => setProfileData({ ...profileData, conversionDate: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                  </div>
                </div>

                {/* Vínculos & Família */}
                <div className="space-y-4 md:col-span-2 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Vínculos & Família</h4>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Gênero</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Users size={16} className="text-zinc-600" /></div>
                      <select value={profileData.sex || ''} onChange={e => setProfileData({ ...profileData, sex: e.target.value as any })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer">
                        <option value="" className="bg-zinc-900">Selecionar Gênero</option>
                        <option value="MASCULINO" className="bg-zinc-900">MASCULINO</option>
                        <option value="FEMININO" className="bg-zinc-900">FEMININO</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estado Civil</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Heart size={16} className="text-zinc-600" /></div>
                      <select
                        value={profileData.maritalStatus || ''}
                        onChange={(e) => setProfileData({ ...profileData, maritalStatus: e.target.value, spouseId: (['Casado(a)', 'Noivo(a)', 'Moram Juntos'].includes(e.target.value)) ? profileData.spouseId : '' })}
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-900">Selecionar Estado Civil</option>
                        {['Solteiro(a)', 'Casado(a)', 'Noivo(a)', 'Moram Juntos', 'Divorciado(a)', 'Viúvo(a)'].map(status => (
                          <option key={status} value={status} className="bg-zinc-900">{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(['Casado(a)', 'Noivo(a)', 'Moram Juntos'].includes(profileData.maritalStatus || '')) ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cônjuge / Parceiro(a)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User size={16} className="text-zinc-600" /></div>
                        <select value={profileData.spouseId || ''} onChange={(e) => setProfileData({ ...profileData, spouseId: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer">
                          <option value="" className="bg-zinc-900 text-zinc-500">Selecione o Parceiro</option>
                          {allMembers
                            .filter(m => m.id !== member?.id)
                            .filter(m => {
                              if (profileData.sex === 'MASCULINO') return m.sex === 'FEMININO' && (!m.spouseId || m.spouseId === '' || m.spouseId === member?.id);
                              if (profileData.sex === 'FEMININO') return m.sex === 'MASCULINO' && (!m.spouseId || m.spouseId === '' || m.spouseId === member?.id);
                              return true;
                            })
                            .map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)
                          }
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 opacity-50">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cônjuge / Parceiro(a)</label>
                      <div className="bg-zinc-950/30 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-zinc-700 cursor-not-allowed">
                        Não aplicável
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <div className="p-6 bg-zinc-950 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500"><Baby size={24} /></div>
                      <div>
                        <p className="text-white font-black uppercase tracking-tight">Possui Filhos?</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Habilite para cadastrar dependentes.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setProfileData({ ...profileData, hasChildren: !profileData.hasChildren })} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${profileData.hasChildren ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${profileData.hasChildren ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  {profileData.hasChildren && (
                    <div className="mt-6 p-8 bg-zinc-950/50 border border-white/5 rounded-[2.5rem] space-y-8 animate-in slide-in-from-top-4">
                       <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dependentes / Filhos</h5>
                          <button onClick={() => setProfileData({ ...profileData, children: [...(profileData.children || []), { id: Math.random().toString(36).substr(2, 9), name: '', birthDate: '', photo: '' }] })} className="px-5 py-2.5 bg-blue-600/10 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-500/10">+ Adicionar Dependente</button>
                       </div>
                       <div className="space-y-8">
                          {(profileData.children || []).map((child: any, idx: number) => (
                            <div key={child.id} className="p-6 bg-zinc-900/50 rounded-[2rem] border border-white/5 relative group">
                               <button onClick={() => { const next = (profileData.children || []).filter((_: any, i: number) => i !== idx); setProfileData({ ...profileData, children: next }); }} className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><X size={18} /></button>
                               <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                  <div className="md:col-span-3 flex flex-col items-center gap-2">
                                     <div onClick={() => document.getElementById(`child-photo-${idx}`)?.click()} className="w-20 h-20 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center cursor-pointer overflow-hidden">
                                        {child.photo ? <img src={child.photo} className="w-full h-full object-cover" alt="" /> : <Camera size={20} className="text-zinc-800" />}
                                        <input id={`child-photo-${idx}`} type="file" className="hidden" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const url = await memberService.uploadAvatar(file); const next = [...(profileData.children || [])]; next[idx].photo = url; setProfileData({ ...profileData, children: next }); } }} />
                                     </div>
                                     <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Foto</span>
                                  </div>
                                  <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="md:col-span-2"><input value={child.name} onChange={e => { const next = [...(profileData.children || [])]; next[idx].name = e.target.value; setProfileData({ ...profileData, children: next }); }} placeholder="Nome completo" className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white" /></div>
                                     <div><input type="date" value={child.birthDate} onChange={e => { const next = [...(profileData.children || [])]; next[idx].birthDate = e.target.value; setProfileData({ ...profileData, children: next }); }} className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white" /></div>
                                     <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] tracking-tight bg-blue-600/5 px-4 rounded-xl border border-blue-500/10">Idade: {child.birthDate ? calculateAge(child.birthDate) : '--'} Anos</div>
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>

                {/* FICHA MINISTERIAL (GANHAR) */}
                <div className="space-y-4 md:col-span-2 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">FICHA MINISTERIAL (GANHAR)</h4>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Como nos conheceu / Como aceitou a Jesus?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {((winActivities.find(a => a.configOptions && a.configOptions.length > 0)?.configOptions || (winActivities.length > 0 ? winActivities.map(a => a.label) : ['EVANGELISMO', 'VISITA', 'PEDIDO DE ORAÇÃO', 'OUTRA IGREJA', 'REDES SOCIAIS', 'AMIGOS / FAMÍLIA', 'OUTROS']))).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setProfileData({ ...profileData, origin: option })}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                          profileData.origin === option 
                            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50' 
                            : 'bg-zinc-950 border-white/5 hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        {profileData.origin === option && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
                             <Check size={10} className="text-white font-black" />
                          </div>
                        )}
                        <div className={`p-2 rounded-xl transition-all ${profileData.origin === option ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:scale-110'}`}>
                           <Globe size={16} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-tight text-center leading-tight ${profileData.origin === option ? 'text-white' : 'text-zinc-500'}`}>
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vínculos Ministeriais */}
                <div className="space-y-4 md:col-span-2 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                    <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Vínculos Ministeriais</h4>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Célula</label>
                  <select value={profileData.cellId || ''} onChange={e => handleCellChange(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-zinc-900">Selecionar Célula</option>
                    {allCells.map(cell => <option key={cell.id} value={cell.id} className="bg-zinc-900">{cell.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estágio na Escada (M12)</label>
                  <div className="relative">
                    <input 
                      disabled 
                      value={profileData.stage || 'GANHAR'} 
                      className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-zinc-500 outline-none cursor-not-allowed uppercase tracking-widest" 
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center">
                      <Lock size={14} className="text-zinc-700" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Meu Discpulador</label>
                  <select value={profileData.disciplerId || ''} onChange={e => setProfileData({ ...profileData, disciplerId: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-zinc-900">Selecionar Discipulador</option>
                    {allMembers
                      .filter(m => m.id !== member?.id)
                      .filter(m => {
                        if (!profileData.sex) return true;
                        return m.sex === profileData.sex;
                      })
                      .map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)
                    }
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Meu Pastor</label>
                  <select value={profileData.pastorId || ''} onChange={e => setProfileData({ ...profileData, pastorId: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-zinc-900">Selecionar Pastor</option>
                    {allMembers
                      .filter(m => (m.role === UserRole.PASTOR || m.role === UserRole.CHURCH_ADMIN))
                      .filter(m => {
                        if (!profileData.sex) return true;
                        return m.sex === profileData.sex;
                      })
                      .map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)
                    }
                  </select>
                </div>

                {/* Endereço */}
                <div className="space-y-4 md:col-span-2 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Endereço Residencial</h4>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CEP</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><MapPin size={16} className="text-zinc-600" /></div>
                    <input value={profileData.cep || ''} onChange={handleCepChange} maxLength={9} placeholder="00000-000" className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rua</label>
                    <input value={profileData.street || ''} onChange={e => setProfileData({ ...profileData, street: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Número</label>
                    <input value={profileData.number || ''} onChange={e => setProfileData({ ...profileData, number: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Complemento</label>
                    <input value={profileData.complement || ''} onChange={e => setProfileData({ ...profileData, complement: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>

                {/* Bairro, Cidade, UF na mesma linha */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Bairro</label>
                    <input value={profileData.neighborhood || ''} onChange={e => setProfileData({ ...profileData, neighborhood: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Cidade</label>
                    <input value={profileData.city || ''} onChange={e => setProfileData({ ...profileData, city: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">UF</label>
                    <input value={profileData.state || ''} onChange={e => setProfileData({ ...profileData, state: e.target.value })} maxLength={2} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white" />
                  </div>
                </div>

                {/* Segurança */}
                <div className="space-y-4 md:col-span-2 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
                    <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Segurança</h4>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha Atual do Cadastro</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Shield size={16} className="text-zinc-600" /></div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        disabled 
                        value={member?.password || '********'} 
                        className="w-full bg-zinc-950/40 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-zinc-500 outline-none cursor-not-allowed" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-blue-500 transition-colors pointer-events-auto"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nova Senha (Mudar)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={16} className="text-zinc-600" /></div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={profileData.newPassword || ''} 
                        onChange={e => setProfileData({ ...profileData, newPassword: e.target.value })} 
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-blue-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={16} className="text-zinc-600" /></div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={profileData.confirmPassword || ''} 
                        onChange={e => setProfileData({ ...profileData, confirmPassword: e.target.value })} 
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-blue-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 pt-10 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-12 py-5 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 active:scale-95"
                  >
                    <Save size={20} /> {saving ? 'Salvando Perfil...' : 'Salvar Alterações do Perfil'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isCropping && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleCropCancel} />
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden h-[600px] flex flex-col">
              <div className="p-6 bg-zinc-900 flex justify-between">
                <h3 className="text-white font-black uppercase">Recortar Foto</h3>
                <button onClick={handleCropCancel}><X /></button>
              </div>
              <div className="relative flex-1">
                <Cropper image={photoPreview} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} cropShape="round" />
              </div>
              <div className="p-6 bg-zinc-900 border-t border-white/5 flex gap-4">
                <button onClick={handleCropConfirm} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default Settings;
