import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, DollarSign, Users, Key, Image, AlignLeft, Eye, Ticket, Loader2 } from 'lucide-react';
import { paidEventService } from '../../services/paidEventService';
import { pixService } from '../../services/pixService';
import { PaidEvent, PaidEventStatus } from '../../types';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';

interface PaidEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  event: PaidEvent | null;
  churchId: string;
  user: any;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">{label}</label>
    {children}
  </div>
);

const PaidEventForm: React.FC<PaidEventFormProps> = ({ isOpen, onClose, onSaved, event, churchId, user }) => {
  const [form, setForm] = useState<any>({
    title: '', description: '', start_date: '', end_date: '', location: '',
    price: '', max_participants: '', pix_key: '', pix_receiver_name: '',
    pix_receiver_city: '', confirmation_message: 'Sua inscrição foi recebida! Aguarde a confirmação do pagamento.',
    payment_instructions: 'Realize o pagamento via Pix usando o QR Code abaixo e envie o comprovante no formulário.',
    status: 'draft', is_featured: true, coordenador_id: '', auxiliares_ids: []
  });
  const [saving, setSaving] = useState(false);
  const [pixPreview, setPixPreview] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const [membersList, setMembersList] = useState<{id: string, name: string, role: string}[]>([]);

  useEffect(() => {
    if (isOpen && churchId) {
      import('../../services/memberService').then(({ memberService }) => {
        memberService.getAll(churchId, undefined, user).then(list => {
          setMembersList(list.map(m => ({ id: m.id, name: m.name, role: m.role || 'Membro' })));
        }).catch(console.error);
      });
    }

    if (event) {
      setForm({
        ...event,
        price: event.price?.toString() || '',
        max_participants: event.max_participants?.toString() || '',
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        coordenador_id: event.coordenador_id || '',
        auxiliares_ids: event.auxiliares_ids || []
      });
      setBannerPreview(event.banner_url || '');
      if (event.pix_qrcode_payload) {
        pixService.generateQRCodeDataURL(event.pix_qrcode_payload).then(setPixPreview).catch(() => {});
      }
    } else {
      setForm({
        title: '', description: '', start_date: '', end_date: '', location: '',
        price: '', max_participants: '', pix_key: '', pix_receiver_name: '',
        pix_receiver_city: '', confirmation_message: 'Sua inscrição foi recebida! Aguarde a confirmação do pagamento.',
        payment_instructions: 'Realize o pagamento via Pix usando o QR Code abaixo e envie o comprovante no formulário.',
        status: 'draft', is_featured: true, coordenador_id: '', auxiliares_ids: []
      });
      setBannerPreview('');
      setPixPreview('');
    }
  }, [event, isOpen, churchId]);

  const handleGeneratePixPreview = async () => {
    if (!form.pix_key || !form.pix_receiver_name || !form.pix_receiver_city) return;
    try {
      const amount = parseFloat(form.price) || 0;
      const { qrCodeDataURL } = await pixService.generatePixQRCode(
        form.pix_key, form.pix_receiver_name, form.pix_receiver_city, amount
      );
      setPixPreview(qrCodeDataURL);
    } catch (error) {
      console.error('Erro ao gerar preview Pix:', error);
    }
  };

  useEffect(() => {
    if (form.pix_key && form.pix_receiver_name && form.pix_receiver_city) {
      const timer = setTimeout(handleGeneratePixPreview, 500);
      return () => clearTimeout(timer);
    }
  }, [form.pix_key, form.pix_receiver_name, form.pix_receiver_city, form.price]);

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setIsCropping(true);
    }
  };

  const handleCropConfirm = async () => {
    try {
      const croppedFile = await getCroppedImg(bannerPreview, croppedAreaPixels);
      if (croppedFile) {
        setBannerFile(croppedFile);
        setBannerPreview(URL.createObjectURL(croppedFile));
      }
      setIsCropping(false);
    } catch (error) {
      console.error('Erro ao recortar:', error);
      setIsCropping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, publishNow?: boolean) => {
    e.preventDefault();
    try {
      setSaving(true);
      let banner_url = event?.banner_url || undefined;
      if (bannerFile) {
        banner_url = await paidEventService.uploadBanner(bannerFile, churchId);
      }

      // Gerar payload Pix
      let pix_qrcode_payload: string | undefined;
      if (form.pix_key && form.pix_receiver_name && form.pix_receiver_city) {
        pix_qrcode_payload = pixService.generatePayload(
          form.pix_key, form.pix_receiver_name, form.pix_receiver_city, parseFloat(form.price) || 0
        );
      }

      const status = publishNow ? PaidEventStatus.PUBLISHED : form.status;

      const payload = {
        church_id: churchId,
        created_by: userId,
        title: form.title,
        description: form.description || null,
        banner_url: banner_url || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        location: form.location || null,
        price: parseFloat(form.price) || 0,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        pix_key: form.pix_key || null,
        pix_receiver_name: form.pix_receiver_name || null,
        pix_receiver_city: form.pix_receiver_city || null,
        pix_qrcode_payload: pix_qrcode_payload || null,
        confirmation_message: form.confirmation_message || null,
        payment_instructions: form.payment_instructions || null,
        status,
        is_featured: form.is_featured,
        coordenador_id: form.coordenador_id || null,
        auxiliares_ids: form.auxiliares_ids?.length > 0 ? form.auxiliares_ids : null,
      };

      if (event) {
        await paidEventService.update(event.id, payload);
      } else {
        await paidEventService.create(payload as any);
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      alert(error?.message || 'Erro ao salvar evento pago.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Field component movido para fora para não perder o foco
  const inputClass = "w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-600 transition-all";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{event ? 'Editar Evento Pago' : 'Novo Evento Pago'}</h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Módulo de Eventos Pagos</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all"><X size={20} /></button>
        </div>

        {/* Cropper overlay */}
        {isCropping && (
          <div className="absolute inset-0 z-[110] bg-zinc-950 flex flex-col">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-white font-black text-sm uppercase tracking-widest">Recortar Banner</h4>
              <button onClick={() => setIsCropping(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="relative flex-1 bg-black">
              <Cropper image={bannerPreview} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)} onZoomChange={setZoom} />
            </div>
            <div className="p-4 border-t border-white/5 flex items-center gap-4">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Zoom</span>
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-violet-600" />
              <button onClick={handleCropConfirm} className="px-6 py-3 bg-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-all">Confirmar</button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
          {/* Banner */}
          <div className="relative h-44 bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group cursor-pointer">
            {bannerPreview ? (
              <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                <Image size={36} />
                <span className="text-[10px] font-black uppercase tracking-widest">Clique para adicionar banner</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleBannerSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>

          <Field label="Título do Evento *">
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Encontro com Deus" className={inputClass} />
          </Field>

          <Field label="Descrição">
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detalhes sobre o evento..." className={`${inputClass} resize-none`} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de Início *">
              <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Data de Término">
              <input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
            </Field>
          </div>

          <Field label="Local">
            <input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex: Sítio Água Viva, Km 12" className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 gap-4 bg-violet-500/5 p-4 rounded-2xl border border-violet-500/10">
            <h4 className="text-violet-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Users size={14} /> Equipe do Evento</h4>
            <Field label="Coordenador Principal">
              <select value={form.coordenador_id || ''} onChange={e => setForm({ ...form, coordenador_id: e.target.value })} className={inputClass}>
                <option value="">Nenhum</option>
                {membersList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Auxiliares (Segure CTRL para selecionar vários)">
              <select multiple value={form.auxiliares_ids || []} onChange={e => {
                const selected = Array.from(e.target.selectedOptions as HTMLCollectionOf<HTMLOptionElement>, (option: HTMLOptionElement) => option.value);
                setForm({ ...form, auxiliares_ids: selected });
              }} className={`${inputClass} min-h-[100px]`}>
                {membersList.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor por Participante (R$) *">
              <input type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="250.00" className={inputClass} />
            </Field>
            <Field label="Vagas (máx.)">
              <input type="number" min="1" value={form.max_participants || ''} onChange={e => setForm({ ...form, max_participants: e.target.value })} placeholder="Ilimitado" className={inputClass} />
            </Field>
          </div>

          {/* Dados Pix */}
          <div className="border border-violet-500/20 rounded-2xl p-5 space-y-4 bg-violet-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-violet-400" />
              <h4 className="text-sm font-black text-violet-400 uppercase tracking-widest">Dados Pix</h4>
            </div>
            <Field label="Chave Pix *">
              <input required value={form.pix_key || ''} onChange={e => setForm({ ...form, pix_key: e.target.value })} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome do Recebedor *">
                <input required value={form.pix_receiver_name || ''} onChange={e => setForm({ ...form, pix_receiver_name: e.target.value })} placeholder="Nome completo" className={inputClass} />
              </Field>
              <Field label="Cidade do Recebedor *">
                <input required value={form.pix_receiver_city || ''} onChange={e => setForm({ ...form, pix_receiver_city: e.target.value })} placeholder="São Paulo" className={inputClass} />
              </Field>
            </div>
            {pixPreview && (
              <div className="flex flex-col items-center gap-2 pt-3 border-t border-violet-500/10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Preview QR Code Pix</p>
                <img src={pixPreview} alt="QR Code Pix" className="w-36 h-36 rounded-xl border border-white/10" />
              </div>
            )}
          </div>

          <Field label="Mensagem de Confirmação">
            <textarea value={form.confirmation_message || ''} onChange={e => setForm({ ...form, confirmation_message: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </Field>

          <Field label="Instruções de Pagamento">
            <textarea value={form.payment_instructions || ''} onChange={e => setForm({ ...form, payment_instructions: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-violet-600 w-5 h-5" />
            <span className="text-sm font-bold text-zinc-300">Exibir como destaque para membros</span>
          </label>

          {/* Botões */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3.5 bg-zinc-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5 disabled:opacity-50">
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            <button type="button" disabled={saving} onClick={(e) => handleSubmit(e as any, true)} className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:from-violet-700 hover:to-indigo-700 transition-all shadow-xl shadow-violet-500/20 disabled:opacity-50">
              <Eye size={14} /> Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaidEventForm;
