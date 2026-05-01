
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

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `${event.title}\n📅 ${new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}\n📍 ${event.location || 'Local a definir'}\n\nConfira os detalhes aqui:`,
      url: event.publicLink || window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const shareText = `${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Link copiado para a área de transferência!');
        if (isPaidEvent || event.publicLink) {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
        }
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-2.5 md:p-3 text-zinc-500 hover:text-white bg-black/40 backdrop-blur-md rounded-2xl transition-all border border-white/5"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto scrollbar-hide flex-1">
          {event.image_url && (
            <div className="w-full aspect-video overflow-hidden shrink-0">
              <img src={event.image_url} className="w-full h-full object-cover" alt="" />
            </div>
          )}

          <div className="p-6 md:p-10">
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

            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase mb-8 leading-tight">
              {event.title}
            </h3>

            <div className="space-y-5 md:space-y-6 mb-10">
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
          </div>
        </div>

        <div className="p-6 md:p-8 bg-zinc-950 border-t border-white/5 shrink-0">
          <div className="flex flex-col gap-3">
            {event.publicLink ? (
              <div className="flex gap-2">
                <a 
                  href={event.publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 py-4 md:py-5 bg-white text-zinc-950 rounded-[1.25rem] md:rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-white/5"
                >
                  <ExternalLink size={18} /> {isPaidEvent ? 'Inscrever-se Agora' : 'Acessar Link'}
                </a>
                <button 
                  onClick={handleShare}
                  className="p-4 md:p-5 bg-zinc-900 text-zinc-400 hover:text-emerald-500 rounded-[1.25rem] md:rounded-[1.5rem] border border-white/5 hover:border-emerald-500/20 transition-all"
                  title="Compartilhar"
                >
                  <Share2 size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-3 py-4 md:py-5 bg-zinc-900 text-zinc-300 rounded-[1.25rem] md:rounded-[1.5rem] font-black text-xs uppercase tracking-widest border border-white/5 hover:bg-zinc-800 transition-all shadow-xl"
              >
                <Share2 size={18} /> Compartilhar Evento
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="w-full py-4 md:py-5 bg-zinc-950 text-zinc-500 rounded-[1.25rem] md:rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-white/5 hover:bg-zinc-900 transition-all"
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
