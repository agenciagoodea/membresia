import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Save, Camera, Upload } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';
import { eventService } from '../../services/eventService';
import { ChurchEvent, Member, Cell, UserRole } from '../../types';
import MemberAutocomplete from '../Shared/MemberAutocomplete';
import CellAutocomplete from '../Shared/CellAutocomplete';
import { sanitizeUUID } from '../../utils/validationUtils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<ChurchEvent>) => Promise<void>;
  event: ChurchEvent | null;
  churchId: string;
  userId: string;
  allMembers: Member[];
  cells: Cell[];
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, event, churchId, userId, allMembers, cells }) => {
  const [formData, setFormData] = useState<Partial<ChurchEvent>>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    responsible_pastor_id: '',
    coordinator_id: '',
    assistant_ids: [],
    cell_ids: []
  });
  const [saving, setSaving] = useState(false);
  
  // Photo states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(event?.image_url || '');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        assistant_ids: event.assistant_ids || [],
        cell_ids: event.cell_ids || []
      });
      setPhotoPreview(event.image_url || '');
    } else {
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        church_id: churchId,
        created_by: userId,
        responsible_pastor_id: '',
        coordinator_id: '',
        assistant_ids: [],
        cell_ids: []
      });
      setPhotoPreview('');
    }
  }, [event, churchId, userId]);

  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setIsCropping(true);
    }
  };

  const handleCropConfirm = async () => {
    try {
      setIsProcessingCrop(true);
      const croppedArea = croppedAreaPixels;
      const croppedFile = await getCroppedImg(photoPreview, croppedArea);
      if (croppedFile) {
        setSelectedFile(croppedFile);
        setPhotoPreview(URL.createObjectURL(croppedFile));
      }
      setIsCropping(false);
    } catch (error) {
      console.error('Erro ao recortar imagem:', error);
    } finally {
      setIsProcessingCrop(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      let finalImageUrl = formData.image_url;

      // Upload nova foto se selecionada
      if (selectedFile) {
        finalImageUrl = await eventService.uploadPhoto(selectedFile, churchId);
      }

      const sanitizedData = {
        ...formData,
        image_url: finalImageUrl,
        responsible_pastor_id: sanitizeUUID(formData.responsible_pastor_id),
        coordinator_id: sanitizeUUID(formData.coordinator_id),
        assistant_ids: (formData.assistant_ids || []).filter(id => id && id.length > 0),
        cell_ids: (formData.cell_ids || []).filter(id => id && id.length > 0)
      };

      await onSave(sanitizedData);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      alert(error?.message || 'Erro ao salvar os dados do evento.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const pastors = allMembers.filter(m => m.role === UserRole.PASTOR || m.role === 'PASTOR');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">
              {event ? 'Editar Evento' : 'Novo Evento'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Agenda Ministerial & Responsabilidades
            </p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        {isCropping && (
          <div className="absolute inset-0 z-[110] bg-zinc-950 flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-white font-black uppercase tracking-widest text-sm">Recortar Foto (1080x1350)</h4>
              <button onClick={() => setIsCropping(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative flex-1 bg-black">
              <Cropper
                image={photoPreview}
                crop={crop}
                zoom={zoom}
                aspect={1080 / 1350}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-6 border-t border-white/5 bg-zinc-900/50 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Zoom</span>
                <input 
                  type="range" 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  value={zoom} 
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <button 
                onClick={handleCropConfirm}
                disabled={isProcessingCrop}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {isProcessingCrop ? 'Processando...' : 'Confirmar Recorte'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Foto e Campos Básicos */}
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 aspect-[4/5] w-full max-w-[200px]">
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-3">
                      <Upload size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Banner</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
                  <label htmlFor="event-camera" className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl cursor-pointer transition-all border border-white/5 group">
                    <Camera size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cam</span>
                  </label>
                  <label htmlFor="event-gallery" className="flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl cursor-pointer transition-all border border-white/5 group">
                    <Upload size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Gal</span>
                  </label>
                </div>

                <input id="event-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                <input id="event-gallery" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Título</label>
                  <input
                    required
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all uppercase"
                    placeholder="Nome do Evento"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.date || ''}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Horário</label>
                    <input
                      type="time"
                      value={formData.time || ''}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <MemberAutocomplete
                label="Pastor Responsável"
                allMembers={allMembers}
                selectedIds={formData.responsible_pastor_id ? [formData.responsible_pastor_id] : []}
                onSelect={(m) => setFormData({ ...formData, responsible_pastor_id: m.id })}
                onRemove={() => setFormData({ ...formData, responsible_pastor_id: '' })}
                placeholder="Buscar pastor..."
                roleFilter={[UserRole.PASTOR, UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN]}
              />

              <MemberAutocomplete
                label="Coordenador do Evento"
                allMembers={allMembers}
                selectedIds={formData.coordinator_id ? [formData.coordinator_id] : []}
                onSelect={(m) => setFormData({ ...formData, coordinator_id: m.id })}
                onRemove={() => setFormData({ ...formData, coordinator_id: '' })}
                placeholder="Buscar coordenador..."
              />

              <MemberAutocomplete
                label="Auxiliares (Equipe)"
                multiple
                allMembers={allMembers}
                selectedIds={formData.assistant_ids || []}
                onSelect={(m) => {
                  const current = formData.assistant_ids || [];
                  if (!current.includes(m.id)) {
                    setFormData({ ...formData, assistant_ids: [...current, m.id] });
                  }
                }}
                onRemove={(id) => {
                  const next = (formData.assistant_ids || []).filter(aid => aid !== id);
                  setFormData({ ...formData, assistant_ids: next });
                }}
                placeholder="Adicionar auxiliar..."
              />

              <CellAutocomplete
                label="Células Envolvidas"
                cells={cells}
                selectedIds={formData.cell_ids || []}
                onSelect={(c) => {
                  const current = formData.cell_ids || [];
                  if (!current.includes(c.id)) {
                    setFormData({ ...formData, cell_ids: [...current, c.id] });
                  }
                }}
                onRemove={(id) => {
                  const next = (formData.cell_ids || []).filter(cid => cid !== id);
                  setFormData({ ...formData, cell_ids: next });
                }}
                onSelectAll={() => {
                  setFormData({ ...formData, cell_ids: cells.map(c => c.id) });
                }}
                placeholder="Adicionar célula..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Local</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Templo Principal"
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Descrição</label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes adicionais..."
                rows={4}
                className="w-full bg-zinc-900 border border-white/5 rounded-[2rem] p-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all resize-none font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
