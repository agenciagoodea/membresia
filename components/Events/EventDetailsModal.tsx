
import React from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, User, Users, ExternalLink, Share2 } from 'lucide-react';
import { ChurchEvent } from '../../types';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event }) => {
  if (!isOpen || !event) return null;

  const isPaidEvent = event.type === 'paid_event';
  const isBirthday = event.type === 'birthday' || event.isBirthday;
  const isCellEvent = event.type === 'cell_event';

  const handleShare = () => {
    if (isPaidEvent && event.publicLink) {
      const text = `Inscreva-se no evento: ${event.title}\n\nGaranta sua vaga aqui:\n${event.publicLink}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 p-3 text-zinc-500 hover:text-white bg-black/40 backdrop-blur-md rounded-2xl transition-all border border-white/5"
        >
          <X size={20} />
        </button>

        {event.image_url && (
          <div className="w-full aspect-video overflow-hidden">
            <img src={event.image_url} className="w-full h-full object-cover" alt="" />
          </div>
        )}

        <div className="p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              isPaidEvent ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
              isBirthday ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              isCellEvent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {isPaidEvent ? 'Evento Pago' : 
               isBirthday ? 'Aniversariante' : 
               isCellEvent ? 'Célula' : 'Evento da Igreja'}
            </div>
          </div>

          <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-8 leading-none">
            {event.title}
          </h3>

          <div className="space-y-6 mb-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data</p>
                <p className="text-sm font-bold text-white uppercase">
                  {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  {event.endDate && event.endDate !== event.date && ` até ${new Date(event.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Horário</p>
                <p className="text-sm font-bold text-white uppercase">{event.time || 'Horário a definir'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Localização</p>
                <p className="text-sm font-bold text-white uppercase">{event.location || 'Local a definir'}</p>
              </div>
            </div>

            {event.description && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-zinc-400">
                  <AlignLeft size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Descrição</p>
                  <p className="text-sm text-zinc-400 leading-relaxed italic">"{event.description}"</p>
                </div>
              </div>
            )}

            {/* Dados Ministeriais do Evento */}
            {event.raw && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                {event.raw.responsible_pastor_name && (
                  <div className="flex items-center gap-3">
                    <User size={14} className="text-zinc-600" />
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Pastor</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{event.raw.responsible_pastor_name}</p>
                    </div>
                  </div>
                )}
                {event.raw.coordinator_name && (
                  <div className="flex items-center gap-3">
                    <Users size={14} className="text-zinc-600" />
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Coordenador</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{event.raw.coordinator_name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {isPaidEvent && event.publicLink && (
              <div className="flex gap-2">
                <a 
                  href={event.publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-white text-zinc-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-white/5"
                >
                  <ExternalLink size={18} /> Inscrever-se Agora
                </a>
                <button 
                  onClick={handleShare}
                  className="p-5 bg-zinc-900 text-zinc-400 hover:text-emerald-500 rounded-[1.5rem] border border-white/5 hover:border-emerald-500/20 transition-all"
                  title="Compartilhar"
                >
                  <Share2 size={20} />
                </button>
              </div>
            )}
            
            <button 
              onClick={onClose}
              className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest border border-white/5 hover:bg-zinc-800 transition-all"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
