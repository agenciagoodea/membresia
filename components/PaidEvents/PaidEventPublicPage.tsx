import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Users, Clock, Ticket, Loader2, ArrowRight } from 'lucide-react';
import { paidEventService } from '../../services/paidEventService';
import { paidEventRegistrationService } from '../../services/paidEventRegistrationService';
import { PaidEvent } from '../../types';

const PaidEventPublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PaidEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) { setError('Evento não encontrado.'); setLoading(false); return; }
      try {
        const data = await paidEventService.getBySlug(slug);
        if (!data) { setError('Evento não encontrado ou não está mais disponível.'); setLoading(false); return; }
        setEvent(data);
        if (data.max_participants) {
          const count = await paidEventRegistrationService.countConfirmed(data.id);
          setSpotsLeft(data.max_participants - count);
        }
      } catch (err) {
        setError('Erro ao carregar evento.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-500" size={48} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Ticket size={64} className="text-zinc-800 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Evento não encontrado</h1>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <div className="relative">
        {event.banner_url ? (
          <div className="h-[40vh] md:h-[50vh] overflow-hidden relative">
            <img src={event.banner_url} className="w-full h-full object-cover" alt={event.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          </div>
        ) : (
          <div className="h-[30vh] bg-gradient-to-br from-violet-900/30 to-indigo-900/30 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-4 py-1.5 bg-violet-600 rounded-full">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Evento Pago</span>
            </div>
            {isSoldOut && (
              <div className="px-4 py-1.5 bg-rose-600 rounded-full">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Esgotado</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">{event.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 space-y-8">
        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
            <Calendar size={20} className="text-violet-400 mx-auto mb-2" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data</p>
            <p className="text-xs font-bold text-white">{formatDate(event.start_date)}</p>
          </div>
          {event.location && (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
              <MapPin size={20} className="text-violet-400 mx-auto mb-2" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Local</p>
              <p className="text-xs font-bold text-white">{event.location}</p>
            </div>
          )}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
            <DollarSign size={20} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Investimento</p>
            <p className="text-lg font-black text-emerald-400">{formatCurrency(event.price)}</p>
          </div>
          {event.max_participants && (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center">
              <Users size={20} className="text-amber-400 mx-auto mb-2" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Vagas</p>
              <p className="text-lg font-black text-white">{spotsLeft !== null ? `${spotsLeft} restantes` : event.max_participants}</p>
            </div>
          )}
        </div>

        {/* Descrição */}
        {event.description && (
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Sobre o Evento</h3>
            <p className="text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4">
          <button
            onClick={() => navigate(`/evento/${slug}/inscricao`)}
            disabled={isSoldOut}
            className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
              isSoldOut
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-xl shadow-violet-500/20 hover:shadow-violet-500/30'
            }`}
          >
            {isSoldOut ? 'Inscrições Esgotadas' : (
              <>Quero me Inscrever <ArrowRight size={18} /></>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Powered by Ecclesia SaaS</p>
        </div>
      </div>
    </div>
  );
};

export default PaidEventPublicPage;
