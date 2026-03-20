
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Heart, Camera, ShieldCheck, CheckCircle2, User, UserPlus, Eye, EyeOff, Phone, Mail, MessageSquare, ChevronLeft, Monitor, X, Loader2 } from 'lucide-react';
import { PrayerStatus, ChurchTenant } from '../../types';
import { prayerService } from '../../services/prayerService';
import { churchService } from '../../services/churchService';
import { useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const Switch = ({ active, onChange }: { active: boolean; onChange: () => void }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 relative border ${active ? 'bg-blue-600 border-blue-400/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-zinc-950 border-white/10'
      }`}
  >
    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${active ? 'translate-x-6' : 'translate-x-0'
      }`} />
  </div>
);

const PrayerForm: React.FC<{ isInline?: boolean; onComplete?: () => void; user?: any }> = ({ isInline, onComplete, user }) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<ChurchTenant | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    request: '',
    consent: false,
    photo: '', // This will now store the URL
    isAnonymous: false,
    targetPerson: 'SELF' as 'SELF' | 'OTHER',
    targetName: '',
    allowScreenBroadcast: true,
    requestPastoralCall: false,
    addressDetails: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        consent: true // Membro logado já aceitou termos ao se cadastrar/usar o sistema
      }));
    }
  }, [user]);

  React.useEffect(() => {
    const loadTenant = async () => {
      try {
        if (slug) {
          const data = await churchService.getBySlug(slug).catch(() => null);
          setTenant(data);
        }

        // Se sem slug ou falhar, busca a primeira do banco
        if (!tenant) {
          const data = await churchService.getFirst().catch(() => null);
          setTenant(data);
        }
      } catch (error) {
        console.error('Erro ao carregar igreja:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTenant();
  }, [slug]);

  const handleCepBlur = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          addressDetails: {
            ...prev.addressDetails!,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) {
      alert("Por favor, autorize o tratamento de dados para continuar.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    // Simulação de progresso de upload
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      let photoUrl = formData.photo;

      if (selectedFile) {
        setProgress(30); // Initial progress for upload
        photoUrl = await prayerService.uploadPhoto(selectedFile);
        setProgress(60); // Mid progress
      }

      await prayerService.create({
        church_id: tenant?.id || '',
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        request: formData.request,
        photo: photoUrl,
        status: PrayerStatus.PENDING,
        consentLGPD: formData.consent,
        isAnonymous: formData.isAnonymous,
        targetPerson: formData.targetPerson,
        targetName: formData.targetName,
        allowScreenBroadcast: formData.allowScreenBroadcast,
        requestPastoralCall: formData.requestPastoralCall,
        addressDetails: formData.addressDetails,
        createdAt: new Date().toISOString()
      });

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setSubmitted(true);
        setIsSubmitting(false);
      }, 500);

    } catch (error: any) {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      console.error('Erro ao enviar pedido:', error);

      let message = 'Erro ao enviar pedido de oração. Tente novamente.';
      if (error?.message === 'Failed to fetch') {
        message = 'Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.';
      }

      alert(message);
    }
  };

  if (submitted) {
    if (isInline && onComplete) {
      onComplete();
    }
    return (
      <div className={`${isInline ? 'py-12' : 'min-h-screen'} bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500`}>
        <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)] border border-emerald-500/20">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Clamor Registrado!</h2>
        <p className="text-zinc-500 max-w-sm font-medium leading-relaxed italic text-lg">
          Nossa equipe de intercessão foi notificada. <br />Deus ouve o seu coração.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-xs">
          <button onClick={() => setSubmitted(false)} className="flex-1 px-8 py-5 bg-zinc-900 text-zinc-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all border border-white/5">
            Novo Pedido
          </button>
          {!isInline && (
            <button onClick={() => navigate('/app')} className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
              Painel Geral
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={48} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`${isInline ? 'pb-10 pt-4 px-0' : 'min-h-screen py-20 px-6'} bg-zinc-950 flex flex-col items-center relative overflow-hidden`}>
      {!isInline && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] -z-10" />
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className={`${isInline ? 'absolute rounded-[3.5rem]' : 'fixed'} inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300`}>
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
              <div
                className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
                style={{ borderRightColor: 'transparent' }}
              />
              <Heart size={48} className="absolute inset-0 m-auto text-blue-500 animate-pulse" />
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Enviando seu Clamor...</h3>
              <p className="text-zinc-500 font-bold italic">Sua fé está sendo registrada em nossos céus tecnológicos.</p>
            </div>

            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">{progress}% Concluído</p>
          </div>
        </div>
      )}

      {!isInline && (
        <button onClick={() => navigate(-1)} className="fixed top-8 left-8 p-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl text-zinc-500 hover:text-white shadow-2xl transition-all z-50 flex items-center gap-3 font-black text-xs uppercase tracking-widest">
          <ChevronLeft size={18} /> Voltar
        </button>
      )}

      <div className="w-full relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {!isInline && (
          <div className="text-center mb-16">
            {tenant?.logo ? (
              <img src={tenant.logo} className="w-24 h-24 rounded-3xl mx-auto mb-8 shadow-2xl object-contain bg-zinc-900 p-3 border border-white/10" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-3xl mx-auto mb-8 bg-blue-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl border border-white/10 italic">
                {tenant?.name?.substring(0, 1) || '?'}
              </div>
            )}
            <h1 className="text-5xl font-black text-white mb-3 tracking-tighter uppercase leading-none text-center">Clamor Coletivo</h1>
            <p className="text-zinc-500 font-bold italic text-lg text-center">Central de Pedidos de Clamor — {tenant?.name || 'Comunidade'}</p>
          </div>
        )}

        {isInline && (
          <div className="mb-10 animate-in slide-in-from-left-4">
            <h1 className="font-black text-white text-3xl mb-2 flex items-center gap-4 uppercase tracking-tighter">
              <div className="w-2 h-8 bg-blue-600 rounded-full" /> Novo Pedido de Fé
            </h1>
            <p className="text-zinc-500 font-bold italic text-sm">Conecte seu clamor ao altar da igreja.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`${isInline ? 'bg-zinc-900/50 p-8 md:p-12 border-white/5 rounded-[3.5rem]' : 'bg-zinc-900 p-10 md:p-16 border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem]'} border space-y-12 transition-all`}>

          <div className="space-y-8">
            <div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">
              <div className="w-8 h-px bg-blue-500/30" />
              <span className="flex items-center gap-2"><User size={14} /> Quem está pedindo?</span>
              <div className="w-full h-px bg-blue-500/30 flex-1" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nome Identificado</label>
                <input 
                  required 
                  readOnly={!!user}
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  className={`w-full bg-zinc-950 border border-white/5 rounded-[1.5rem] px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-white shadow-inner ${!!user ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  placeholder="Ex: Roberto Silva" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">WhatsApp de Contato</label>
                  <input 
                    required 
                    readOnly={!!user}
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    className={`w-full bg-zinc-950 border border-white/5 rounded-[1.5rem] px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-white shadow-inner ${!!user ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">E-mail Pessoal</label>
                  <input 
                    required 
                    readOnly={!!user}
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    className={`w-full bg-zinc-950 border border-white/5 rounded-[1.5rem] px-8 py-5 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-white shadow-inner ${!!user ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    placeholder="voce@igreja.com" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em]">
              <div className="w-8 h-px bg-rose-500/30" />
              <span className="flex items-center gap-2"><Heart size={14} /> Motivo do Clamor</span>
              <div className="w-full h-px bg-rose-500/30 flex-1" />
            </div>

            <div className="flex bg-zinc-950 p-2 rounded-[1.5rem] border border-white/5">
              <button type="button" onClick={() => setFormData({ ...formData, targetPerson: 'SELF' })} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.targetPerson === 'SELF' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Em meu Favor</button>
              <button type="button" onClick={() => setFormData({ ...formData, targetPerson: 'OTHER' })} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.targetPerson === 'OTHER' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Por outra Vida</button>
            </div>

            {formData.targetPerson === 'OTHER' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nome do Destinatário</label>
                <input required value={formData.targetName} onChange={e => setFormData({ ...formData, targetName: e.target.value })} className="w-full bg-zinc-950 border border-white/5 rounded-[1.5rem] px-8 py-5 text-sm font-bold text-white outline-none shadow-inner" placeholder="Ex: Família Santos" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Descrição da Necessidade</label>
              <textarea required value={formData.request} onChange={e => setFormData({ ...formData, request: e.target.value })} rows={5} className="w-full bg-zinc-950 border border-white/5 rounded-[2rem] px-8 py-6 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none font-medium text-zinc-300 italic leading-relaxed shadow-inner" placeholder="Como podemos interceder por você?"></textarea>
            </div>

            <div onClick={() => fileInputRef.current?.click()} className="group border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all bg-zinc-950 min-h-[200px] relative overflow-hidden shadow-inner">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} className="max-h-48 rounded-3xl shadow-2xl ring-4 ring-zinc-900" alt="" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl" onClick={(e) => { e.stopPropagation(); setPhotoPreview(''); setSelectedFile(null); }}><X className="text-white" size={32} /></div>
                </div>
              ) : (
                <div className="text-center group-hover:scale-110 transition-transform">
                  <Camera size={48} className="text-zinc-800 mx-auto mb-4" />
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Anexar Prova de Fé (Foto)</p>
                  <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase italic tracking-tighter">Irá aparecer no telão principal</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-white/5">
            <div className="grid grid-cols-1 gap-4">
              <div
                onClick={() => setFormData({ ...formData, allowScreenBroadcast: !formData.allowScreenBroadcast })}
                className="flex items-center justify-between p-6 bg-zinc-950 rounded-[2rem] border border-white/5 cursor-pointer hover:bg-zinc-800/50 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${formData.allowScreenBroadcast ? 'bg-blue-600 border-blue-500/20 text-white shadow-lg' : 'bg-zinc-800 border-white/5 text-zinc-500'}`}>
                    {formData.allowScreenBroadcast ? <Monitor size={22} /> : <EyeOff size={22} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">Transmitir no telão?</p>
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Seu pedido aparecerá nos monitores de oração</p>
                  </div>
                </div>
                <Switch active={formData.allowScreenBroadcast} onChange={() => setFormData({ ...formData, allowScreenBroadcast: !formData.allowScreenBroadcast })} />
              </div>

              {!user && (
                <>
                  <div
                    onClick={() => setFormData({ ...formData, requestPastoralCall: !formData.requestPastoralCall })}
                    className="flex items-center justify-between p-6 bg-indigo-600/5 rounded-[2rem] border border-indigo-500/10 cursor-pointer hover:bg-indigo-600/10 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><UserPlus size={22} /></div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">Acompanhamento Pastoral</p>
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest italic">Desejo ser acompanhado por um pastor</p>
                      </div>
                    </div>
                    <Switch active={formData.requestPastoralCall} onChange={() => setFormData({ ...formData, requestPastoralCall: !formData.requestPastoralCall })} />
                  </div>

                  {formData.requestPastoralCall && (
                    <div className="space-y-6 pt-6 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-4 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">
                        <div className="w-8 h-px bg-indigo-500/30" />
                        <span className="flex items-center gap-2"><MapPin size={14} /> Localização para Acompanhamento</span>
                        <div className="w-full h-px bg-indigo-500/30 flex-1" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">CEP</label>
                          <div className="relative">
                            <input
                              value={formData.addressDetails?.cep}
                              onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails!, cep: e.target.value } })}
                              onBlur={e => handleCepBlur(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                              placeholder="00000-000"
                            />
                            {loadingCep && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Bairro</label>
                          <input
                            value={formData.addressDetails?.neighborhood}
                            onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails!, neighborhood: e.target.value } })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none"
                            placeholder="Nome do bairro"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Logradouro (Rua/Avenida)</label>
                        <input
                          value={formData.addressDetails?.street}
                          onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails!, street: e.target.value } })}
                          className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none"
                          placeholder="Rua, número, etc."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Cidade</label>
                          <input
                            value={formData.addressDetails?.city}
                            onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails!, city: e.target.value } })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none"
                            placeholder="Cidade"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Estado</label>
                          <input
                            value={formData.addressDetails?.state}
                            onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails!, state: e.target.value } })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none"
                            placeholder="UF"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {!user && (
              <div
                onClick={() => setFormData({ ...formData, consent: !formData.consent })}
                className="flex items-start gap-4 px-4 cursor-pointer group"
              >
                <div className="pt-1">
                  <Switch active={formData.consent} onChange={() => setFormData({ ...formData, consent: !formData.consent })} />
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-widest italic pt-1.5">
                  Autorizo o tratamento dos dados pela {tenant?.name || 'Igreja'} conforme as leis de proteção de dados para fins exclusivos de cuidado espiritual e intercessão.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-7 bg-white text-zinc-950 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send size={24} className="group-hover:translate-x-3 transition-transform" />
              {isSubmitting ? 'ENVIANDO...' : 'LANÇAR PEDIDO DE FÉ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrayerForm;
