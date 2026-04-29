import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, CheckCircle2, ArrowLeft, AlertTriangle, Mail, Search } from 'lucide-react';
import { paidEventService } from '../../services/paidEventService';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { pixService } from '../../services/pixService';
import { PaidEvent, PaymentStatus } from '../../types';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';
import PixQRCodeBox from './PixQRCodeBox';

const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const TRANSPORT_OPTIONS = ['Carro', 'Ônibus'];
const GENDER_OPTIONS = ['Masculino', 'Feminino'];

// Componente de autocomplete com busca lazy (mínimo 3 caracteres)
const LazyAutocomplete: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  searchFn: (q: string) => Promise<string[]>;
  inputClass: string;
  labelClass: string;
}> = ({ label, value, onChange, placeholder, required, searchFn, inputClass, labelClass }) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const handleInput = (v: string) => {
    setQuery(v);
    onChange(v);
    if (v.length < 3) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchFn(v);
        setSuggestions(results);
        setOpen(results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>{label}{required && ' *'}</label>
      <div className="relative mt-1">
        <input
          required={required}
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-4 inset-y-0 flex items-center">
            <Loader2 size={14} className="animate-spin text-violet-400" />
          </div>
        )}
        {!loading && query.length > 0 && query.length < 3 && (
          <div className="absolute right-4 inset-y-0 flex items-center">
            <span className="text-[10px] text-zinc-600 font-bold">{3 - query.length} letras</span>
          </div>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-5 py-3 text-sm font-bold text-zinc-200 hover:bg-violet-600/10 hover:text-white transition-all border-b border-white/5 last:border-none"
            >
              <Search size={12} className="inline mr-2 text-violet-400" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PaidEventRegistrationForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PaidEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [pixQR, setPixQR] = useState('');
  const [churchId, setChurchId] = useState('');
  const [step, setStep] = useState(1);

  // Form state
  const [form, setForm] = useState({
    full_name: '', email: '', age: '', gender: '', discipler_name: '', phone: '',
    pastor_name: '', shirt_size: '', transport_type: '',
    has_allergy: false, allergy_description: '', emergency_contact_name: '',
    emergency_contact_phone: '', prayer_request: '', observations: ''
  });

  // Files
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofName, setProofName] = useState('');

  // Crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Pastores para datalist
  const [pastorsList, setPastorsList] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        const data = await paidEventService.getBySlug(slug);
        if (!data) { setLoading(false); return; }
        setEvent(data);
        setChurchId(data.church_id);

        if (data.pix_key && data.pix_receiver_name && data.pix_receiver_city) {
          const { qrCodeDataURL } = await pixService.generatePixQRCode(
            data.pix_key, data.pix_receiver_name, data.pix_receiver_city, data.price
          );
          setPixQR(qrCodeDataURL);
        }

        import('../../services/supabaseClient').then(async ({ supabase }) => {
          const { data: pData } = await supabase
            .from('members')
            .select('name')
            .eq('church_id', data.church_id)
            .in('role', ['PASTOR', 'MASTER_ADMIN', 'CHURCH_ADMIN', 'ADMINISTRADOR DA IGREJA'])
            .order('name');
          if (pData) setPastorsList(pData.map((p: any) => p.name));
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const searchDisciplers = async (query: string): Promise<string[]> => {
    if (!churchId || query.length < 3) return [];
    const { supabase } = await import('../../services/supabaseClient');
    const { data } = await supabase
      .from('members')
      .select('name')
      .eq('church_id', churchId)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);
    return (data || []).map((m: any) => m.name);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setIsCropping(true);
    }
  };

  const handleCropConfirm = async () => {
    try {
      const cropped = await getCroppedImg(photoPreview, croppedAreaPixels);
      if (cropped) { setPhotoFile(cropped); setPhotoPreview(URL.createObjectURL(cropped)); }
      setIsCropping(false);
    } catch { setIsCropping(false); }
  };

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
      setProofName(e.target.files[0].name);
    }
  };

  const applyPhoneMask = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  };

  const validateStep2 = () => {
    if (!photoFile) { alert('A foto é obrigatória.'); return false; }
    if (!form.full_name) { alert('O nome completo é obrigatório.'); return false; }
    if (!form.phone) { alert('O telefone é obrigatório.'); return false; }
    if (!form.pastor_name) { alert('O nome do pastor é obrigatório.'); return false; }
    if (!form.gender) { alert('O sexo é obrigatório.'); return false; }
    if (!form.shirt_size) { alert('O tamanho da blusa é obrigatório.'); return false; }
    if (!form.transport_type) { alert('A opção de transporte é obrigatória.'); return false; }
    if (!form.emergency_contact_name || !form.emergency_contact_phone) { alert('Os dados de contato de emergência são obrigatórios.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!event) return;
    try {
      setSubmitting(true);
      const photo_url = photoFile
        ? await paidEventRegistrationService.uploadPhoto(photoFile, event.church_id)
        : '';

      let payment_proof_url = '';
      let payment_status: PaymentStatus = PaymentStatus.AWAITING_PROOF;
      if (proofFile) {
        payment_proof_url = await paidEventRegistrationService.uploadProof(proofFile, event.church_id);
        payment_status = PaymentStatus.PROOF_SENT;
      }

      const result = await paidEventRegistrationService.create({
        church_id: event.church_id,
        event_id: event.id,
        photo_url,
        full_name: form.full_name,
        email: form.email || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender as any || undefined,
        discipler_name: form.discipler_name || undefined,
        phone: form.phone,
        pastor_name: form.pastor_name,
        shirt_size: form.shirt_size as any || undefined,
        transport_type: form.transport_type as any || undefined,
        has_allergy: form.has_allergy,
        allergy_description: form.has_allergy ? form.allergy_description : undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        prayer_request: form.prayer_request || undefined,
        observations: form.observations || undefined,
        payment_proof_url: payment_proof_url || undefined,
        payment_status
      }, event);

      setRegCode(result.registration_code);
      setSuccess(true);
    } catch (error: any) {
      console.error('Erro ao inscrever:', error);
      alert(error?.message || 'Erro ao enviar inscrição.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-violet-500" size={48} /></div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Evento não encontrado</h1>
          <p className="text-zinc-500">Este evento não está disponível para inscrição.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Inscrição Realizada!</h1>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-3">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seu código de inscrição</p>
            <p className="text-2xl font-black text-violet-400 tracking-widest">{regCode}</p>
            <p className="text-sm text-zinc-400 mt-4">{event.confirmation_message || 'Sua inscrição foi recebida! Aguarde a confirmação do pagamento.'}</p>
            {form.email && (
              <p className="text-xs text-emerald-400 font-bold mt-2">
                ✉️ Um e-mail de confirmação foi enviado para {form.email}
              </p>
            )}
          </div>
          <button onClick={() => navigate(`/evento/${slug}`)} className="text-sm text-zinc-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
            ← Voltar ao evento
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-600 transition-all";
  const labelClass = "text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1";

  const eventPeriod = paidEventRegistrationService.formatEventPeriod(event.start_date, event.end_date);
  const bannerUrl = paidEventRegistrationService.getFileUrl('paid-event-banners', event.banner_url || '');

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Cropper overlay */}
      {isCropping && (
        <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h4 className="text-white font-black text-sm uppercase tracking-widest">Recortar Foto</h4>
            <button onClick={() => setIsCropping(false)} className="text-zinc-500 hover:text-white text-sm font-bold">Cancelar</button>
          </div>
          <div className="relative flex-1 bg-black">
            <Cropper image={photoPreview} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={(_, p) => setCroppedAreaPixels(p)} onZoomChange={setZoom} />
          </div>
          <div className="p-4 border-t border-white/5 flex items-center gap-4">
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-violet-600" />
            <button onClick={handleCropConfirm} className="px-6 py-3 bg-violet-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-violet-700 transition-all">Confirmar</button>
          </div>
        </div>
      )}

      {/* Header com Progresso */}
      <div className="bg-zinc-900 border-b border-white/5 p-4 md:p-6 sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(`/evento/${slug}`)} className="p-2 text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[200px]">{event.title}</h1>
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Inscrição · Passo {step} de 3</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative h-64 rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
              {bannerUrl ? (
                <img src={bannerUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              <div className="absolute bottom-6 left-8 right-8">
                <span className="px-3 py-1 bg-violet-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Evento</span>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{event.title}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data e Período</p>
                <p className="text-sm font-bold text-white uppercase tracking-tight">{eventPeriod}</p>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Localização</p>
                <p className="text-sm font-bold text-white uppercase tracking-tight truncate">{event.location || 'Local a definir'}</p>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Investimento</p>
                <p className="text-xl font-black text-emerald-400">R$ {event.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Disponibilidade</p>
                <p className="text-sm font-bold text-white uppercase tracking-tight">Vagas Limitadas</p>
              </div>
            </div>

            {event.description && (
              <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Sobre o Evento</p>
                <div className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</div>
              </div>
            )}

            <button onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-3 py-5 bg-violet-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-500/20">
              Continuar para Dados
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Foto */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden bg-zinc-900 border-4 border-zinc-900 ring-2 ring-white/10 group shadow-2xl">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700"><Camera size={40} /></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <label className="flex items-center justify-center gap-2 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">
                  <Camera size={16} className="text-violet-400" /> Câmera
                  <input type="file" accept="image/*" capture="user" onChange={handlePhotoSelect} className="hidden" />
                </label>
                <label className="flex items-center justify-center gap-2 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">
                  <Upload size={16} className="text-emerald-400" /> Galeria
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">* Foto obrigatória para o crachá</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className={labelClass}>Nome Completo *</label>
                  <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className={inputClass} placeholder="Seu nome completo" />
                </div>

                <div>
                  <label className={labelClass}>E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} placeholder="seuemail@exemplo.com" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Idade</label>
                    <input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className={inputClass} placeholder="Ex: 25" />
                  </div>
                  <div>
                    <label className={labelClass}>Sexo *</label>
                    <select required value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputClass}>
                      <option value="">Selecione</option>
                      {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Telefone *</label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: applyPhoneMask(e.target.value)})} className={inputClass} placeholder="(11) 99999-9999" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nome do Pastor *</label>
                    <input required list="pastors-list" value={form.pastor_name} onChange={e => setForm({...form, pastor_name: e.target.value})} className={inputClass} placeholder="Nome do seu pastor" />
                    <datalist id="pastors-list">
                      {pastorsList.map((p, i) => <option key={i} value={p} />)}
                    </datalist>
                  </div>
                  <LazyAutocomplete
                    label="Nome do Discipulador"
                    value={form.discipler_name}
                    onChange={v => setForm({...form, discipler_name: v})}
                    placeholder="Busque por 3+ letras..."
                    searchFn={searchDisciplers}
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tamanho da Blusa *</label>
                    <select required value={form.shirt_size} onChange={e => setForm({...form, shirt_size: e.target.value})} className={inputClass}>
                      <option value="">Selecione</option>
                      {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Transporte *</label>
                    <select required value={form.transport_type} onChange={e => setForm({...form, transport_type: e.target.value})} className={inputClass}>
                      <option value="">Selecione</option>
                      {TRANSPORT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-3xl space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.has_allergy} onChange={e => setForm({...form, has_allergy: e.target.checked})} className="accent-violet-600 w-5 h-5" />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-tight">Tem alergias?</span>
                  </label>
                  {form.has_allergy && (
                    <input value={form.allergy_description} onChange={e => setForm({...form, allergy_description: e.target.value})} className={inputClass} placeholder="Descreva suas alergias" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Contato Emergência (Nome) *</label>
                    <input required value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} className={inputClass} placeholder="Nome do parente" />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone Emergência *</label>
                    <input required value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: applyPhoneMask(e.target.value)})} className={inputClass} placeholder="(11) 99999-9999" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Pedido de Oração (Opcional)</label>
                  <textarea value={form.prayer_request} onChange={e => setForm({...form, prayer_request: e.target.value})} rows={2} className={`${inputClass} resize-none`} placeholder="Seu pedido de oração..." />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-5 bg-zinc-900 text-zinc-400 rounded-3xl text-sm font-black uppercase tracking-widest border border-white/5">
                Voltar
              </button>
              <button onClick={() => validateStep2() && setStep(3)} className="flex-[2] py-5 bg-violet-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-500/20">
                Próximo: Pagamento
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 text-center">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Valor da Inscrição</p>
              <p className="text-4xl font-black text-white">R$ {event.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            {event.pix_key && (
              <PixQRCodeBox event={event} qrCodeDataURL={pixQR} />
            )}

            <div className="space-y-4">
              <label className={labelClass}>Comprovante de Pagamento</label>
              <label className="flex flex-col items-center justify-center gap-3 py-10 bg-zinc-900 border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:border-violet-500/30 transition-all group">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-violet-400 transition-all">
                  <Upload size={32} />
                </div>
                <span className="text-sm font-bold text-zinc-400">{proofName || 'Enviar comprovante (Opcional)'}</span>
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">PDF, JPG ou PNG</p>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofSelect} className="hidden" />
              </label>
              {!proofFile && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-500/80 font-bold uppercase leading-relaxed">Você pode enviar o comprovante agora ou depois, mas sua vaga só será garantida após a confirmação.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 py-5 bg-zinc-900 text-zinc-400 rounded-3xl text-sm font-black uppercase tracking-widest border border-white/5">
                Voltar
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-[2] flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:from-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50">
                {submitting ? <><Loader2 className="animate-spin" size={18} /> Finalizando...</> : 'Finalizar Inscrição'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaidEventRegistrationForm;
