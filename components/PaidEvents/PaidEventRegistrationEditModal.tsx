import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Camera, Upload } from 'lucide-react';
import { PaidEvent, PaidEventRegistration } from '../../types';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';

interface PaidEventRegistrationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  registration: PaidEventRegistration;
  event: PaidEvent;
}

const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const TRANSPORT_OPTIONS = ['Carro', 'Ônibus'];
const GENDER_OPTIONS = ['Masculino', 'Feminino'];

const PaidEventRegistrationEditModal: React.FC<PaidEventRegistrationEditModalProps> = ({
  isOpen, onClose, onSaved, registration, event
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: registration.full_name,
    email: registration.email || '',
    age: registration.age?.toString() || '',
    gender: registration.gender || '',
    phone: registration.phone,
    pastor_name: registration.pastor_name,
    discipler_name: registration.discipler_name || '',
    shirt_size: registration.shirt_size || '',
    transport_type: registration.transport_type || '',
    has_allergy: registration.has_allergy,
    allergy_description: registration.allergy_description || '',
    emergency_contact_name: registration.emergency_contact_name || '',
    emergency_contact_phone: registration.emergency_contact_phone || '',
    prayer_request: registration.prayer_request || '',
    observations: registration.observations || ''
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(registration.photo_url ? paidEventRegistrationService.getFileUrl('event-participant-photos', registration.photo_url) : '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofName, setProofName] = useState(registration.payment_proof_url || '');

  // Crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const applyPhoneMask = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
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
      if (cropped) {
        setPhotoFile(cropped);
        setPhotoPreview(URL.createObjectURL(cropped));
      }
      setIsCropping(false);
    } catch {
      setIsCropping(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      let photo_url = registration.photo_url;
      if (photoFile) {
        photo_url = await paidEventRegistrationService.uploadPhoto(photoFile, event.church_id);
      }

      let payment_proof_url = registration.payment_proof_url;
      if (proofFile) {
        payment_proof_url = await paidEventRegistrationService.uploadProof(proofFile, event.church_id);
      }

      const { supabase } = await import('../../services/supabaseClient');
      const { error } = await supabase
        .from('paid_event_registrations')
        .update({
          full_name: form.full_name,
          email: form.email || null,
          age: form.age ? parseInt(form.age) : null,
          gender: form.gender || null,
          phone: form.phone,
          pastor_name: form.pastor_name,
          discipler_name: form.discipler_name || null,
          shirt_size: form.shirt_size || null,
          transport_type: form.transport_type || null,
          has_allergy: form.has_allergy,
          allergy_description: form.has_allergy ? form.allergy_description : null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          prayer_request: form.prayer_request || null,
          observations: form.observations || null,
          photo_url,
          payment_proof_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (error) throw error;

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-600 outline-none";
  const labelClass = "text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-1 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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

      <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Editar Inscrição</h2>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{registration.registration_code}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Foto */}
          <div className="flex flex-col items-center gap-4 pb-4 border-b border-white/5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10">
              {photoPreview ? (
                <img src={photoPreview} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700"><Camera size={24} /></div>
              )}
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">
                <Camera size={14} className="text-violet-400" /> Trocar Foto
                <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={labelClass}>Nome Completo</label>
              <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Telefone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: applyPhoneMask(e.target.value)})} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Idade</label>
                <input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sexo</label>
                <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputClass}>
                  <option value="">Selecione</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Nome do Pastor</label>
              <input value={form.pastor_name} onChange={e => setForm({...form, pastor_name: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Nome do Discipulador</label>
              <input value={form.discipler_name} onChange={e => setForm({...form, discipler_name: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Tamanho da Blusa</label>
              <select value={form.shirt_size} onChange={e => setForm({...form, shirt_size: e.target.value})} className={inputClass}>
                <option value="">Selecione</option>
                {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Transporte</label>
              <select value={form.transport_type} onChange={e => setForm({...form, transport_type: e.target.value})} className={inputClass}>
                <option value="">Selecione</option>
                {TRANSPORT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.has_allergy} onChange={e => setForm({...form, has_allergy: e.target.checked})} className="accent-violet-600 w-5 h-5" />
                <span className="text-sm font-bold text-zinc-300">Possui alergias?</span>
              </label>
              {form.has_allergy && (
                <input value={form.allergy_description} onChange={e => setForm({...form, allergy_description: e.target.value})} className={inputClass} placeholder="Descreva as alergias" />
              )}
            </div>

            <div>
              <label className={labelClass}>Contato Emergência (Nome)</label>
              <input value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Telefone Emergência</label>
              <input value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: applyPhoneMask(e.target.value)})} className={inputClass} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Pedido de Oração</label>
              <textarea value={form.prayer_request} onChange={e => setForm({...form, prayer_request: e.target.value})} rows={2} className={`${inputClass} resize-none`} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Observações</label>
              <textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} rows={2} className={`${inputClass} resize-none`} />
            </div>

            <div className="md:col-span-2 pt-4 border-t border-white/5">
              <label className={labelClass}>Comprovante de Pagamento</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center gap-3 py-4 bg-zinc-900 border border-white/5 rounded-xl cursor-pointer hover:bg-zinc-800 transition-all">
                  <Upload size={18} className="text-violet-400" />
                  <span className="text-xs font-bold text-zinc-400 truncate max-w-[200px]">{proofFile ? proofFile.name : (proofName || 'Enviar novo comprovante')}</span>
                  <input type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setProofFile(e.target.files[0])} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-[2] flex items-center justify-center gap-3 py-4 bg-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-500/20 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaidEventRegistrationEditModal;
