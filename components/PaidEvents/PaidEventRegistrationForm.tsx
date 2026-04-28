import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, CheckCircle2, ArrowLeft, AlertTriangle } from 'lucide-react';
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

const PaidEventRegistrationForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PaidEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [pixQR, setPixQR] = useState('');

  // Form state
  const [form, setForm] = useState({
    full_name: '', age: '', gender: '', discipler_name: '', phone: '',
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

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        const data = await paidEventService.getBySlug(slug);
        if (!data) { setLoading(false); return; }
        setEvent(data);
        if (data.pix_key && data.pix_receiver_name && data.pix_receiver_city) {
          const { qrCodeDataURL } = await pixService.generatePixQRCode(
            data.pix_key, data.pix_receiver_name, data.pix_receiver_city, data.price
          );
          setPixQR(qrCodeDataURL);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!photoFile) { alert('Por favor, envie sua foto.'); return; }
    if (!form.full_name || !form.phone || !form.pastor_name) {
      alert('Preencha todos os campos obrigatórios.'); return;
    }

    try {
      setSubmitting(true);
      let photo_url = '';
      if (photoFile) {
        photo_url = await paidEventRegistrationService.uploadPhoto(photoFile, event.church_id);
      }

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
      });

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

  // Tela de sucesso
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

  return (
    <div className="min-h-screen bg-zinc-950">
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

      {/* Header */}
      <div className="bg-zinc-900 border-b border-white/5 p-4 md:p-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(`/evento/${slug}`)} className="p-2 text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">{event.title}</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Formulário de Inscrição</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Foto */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-28 h-28 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/10 group">
            {photoPreview ? (
              <img src={photoPreview} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700"><Camera size={32} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <label className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5">
              <Camera size={14} className="text-violet-400" /> Câmera
              <input type="file" accept="image/*" capture="user" onChange={handlePhotoSelect} className="hidden" />
            </label>
            <label className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5">
              <Upload size={14} className="text-emerald-400" /> Galeria
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
            </label>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold">* Foto obrigatória</p>
        </div>

        {/* Dados pessoais */}
        <div className="space-y-4">
          <div><label className={labelClass}>Nome Completo *</label><input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className={inputClass} placeholder="Seu nome completo" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Idade</label><input type="number" min="1" max="120" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className={inputClass} placeholder="Ex: 25" /></div>
            <div><label className={labelClass}>Sexo *</label>
              <select required value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputClass}>
                <option value="">Selecione</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div><label className={labelClass}>Telefone *</label><input required value={form.phone} onChange={e => setForm({...form, phone: applyPhoneMask(e.target.value)})} className={inputClass} placeholder="(11) 99999-9999" /></div>
          <div><label className={labelClass}>Nome do Pastor *</label><input required value={form.pastor_name} onChange={e => setForm({...form, pastor_name: e.target.value})} className={inputClass} placeholder="Nome do seu pastor" /></div>
          <div><label className={labelClass}>Nome do Discipulador</label><input value={form.discipler_name} onChange={e => setForm({...form, discipler_name: e.target.value})} className={inputClass} placeholder="Nome do seu discipulador" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Tamanho da Blusa *</label>
              <select required value={form.shirt_size} onChange={e => setForm({...form, shirt_size: e.target.value})} className={inputClass}>
                <option value="">Selecione</option>
                {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Transporte *</label>
              <select required value={form.transport_type} onChange={e => setForm({...form, transport_type: e.target.value})} className={inputClass}>
                <option value="">Selecione</option>
                {TRANSPORT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Alergia */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.has_allergy} onChange={e => setForm({...form, has_allergy: e.target.checked})} className="accent-violet-600 w-5 h-5" />
            <span className="text-sm font-bold text-zinc-300">Tem alergia a medicamento ou alimento?</span>
          </label>
          {form.has_allergy && (
            <div><label className={labelClass}>Quais alergias?</label><input value={form.allergy_description} onChange={e => setForm({...form, allergy_description: e.target.value})} className={inputClass} placeholder="Descreva suas alergias" /></div>
          )}
        </div>

        {/* Emergência */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Contato de Emergência (Nome) *</label><input required value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} className={inputClass} placeholder="Nome do parente" /></div>
          <div><label className={labelClass}>Telefone de Emergência *</label><input required value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: applyPhoneMask(e.target.value)})} className={inputClass} placeholder="(11) 99999-9999" /></div>
        </div>

        {/* Opcionais */}
        <div><label className={labelClass}>Pedido de Oração (Opcional)</label><textarea value={form.prayer_request} onChange={e => setForm({...form, prayer_request: e.target.value})} rows={2} className={`${inputClass} resize-none`} placeholder="Seu pedido de oração..." /></div>
        <div><label className={labelClass}>Observações (Opcional)</label><textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} rows={2} className={`${inputClass} resize-none`} placeholder="Alguma observação importante..." /></div>

        {/* Pagamento Pix */}
        {event.pix_key && (
          <PixQRCodeBox event={event} qrCodeDataURL={pixQR} />
        )}

        {/* Upload Comprovante */}
        <div className="space-y-2">
          <label className={labelClass}>Comprovante de Pagamento</label>
          <label className="flex items-center justify-center gap-3 py-4 bg-zinc-900 border border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-violet-500/30 transition-all">
            <Upload size={18} className="text-violet-400" />
            <span className="text-sm font-bold text-zinc-400">{proofName || 'Clique para enviar comprovante (PDF, JPG, PNG)'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofSelect} className="hidden" />
          </label>
          {!proofFile && (
            <p className="text-[10px] text-amber-500 flex items-center gap-1 ml-1"><AlertTriangle size={10} /> Você pode enviar o comprovante depois, mas sua inscrição ficará como "Aguardando".</p>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:from-violet-700 hover:to-indigo-700 transition-all shadow-xl shadow-violet-500/20 disabled:opacity-50">
          {submitting ? <><Loader2 className="animate-spin" size={18} /> Enviando...</> : 'Confirmar Inscrição'}
        </button>
      </form>
    </div>
  );
};

export default PaidEventRegistrationForm;
