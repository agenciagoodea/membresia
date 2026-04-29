import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, DollarSign, Users, Ticket, Loader2,
  ArrowRight, Share2, MessageCircle, Copy, Check, Clock,
  ChevronRight, QrCode, Info
} from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) { setError('Evento não encontrado.'); setLoading(false); return; }
      try {
        const data = await paidEventService.getBySlug(slug);
        if (!data) { setError('Evento não encontrado ou não está mais disponível.'); setLoading(false); return; }
        setEvent(data);

        // SEO dinâmico
        document.title = `${data.title} — Inscrições Abertas`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', data.description?.substring(0, 155) || `Inscreva-se no evento ${data.title}`);

        if (data.max_participants) {
          const count = await paidEventRegistrationService.countActive(data.id);
          setSpotsLeft(data.max_participants - count);
        }
      } catch (err) {
        setError('Erro ao carregar evento.');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Reset title on unmount
    return () => { document.title = 'Ecclesia'; };
  }, [slug]);

  const formatDate = (d: string) => paidEventRegistrationService.formatDateOnly(d);

  const formatDateShort = (d: string) => {
    const parts = d.split('T')[0].split('-');
    if (parts.length !== 3) return d;
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleShare = (type: 'copy' | 'whatsapp') => {
    const url = window.location.href;
    if (type === 'copy') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      const msg = encodeURIComponent(
        `🎟️ *${event?.title}*\n\n` +
        (event?.description ? `${event.description.substring(0, 200)}...\n\n` : '') +
        `📅 ${event?.start_date ? formatDate(event.start_date) : ''}\n` +
        (event?.location ? `📍 ${event.location}\n` : '') +
        `💰 ${formatCurrency(event?.price || 0)}\n\n` +
        `Garanta sua vaga 👇\n${url}`
      );
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    }
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-500" size={48} />
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest animate-pulse">Carregando evento...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center mx-auto">
            <Ticket size={36} className="text-zinc-700" />
          </div>
          <h1 className="text-2xl font-black text-white">Evento não encontrado</h1>
          <p className="text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;
  const isAlmostFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10;
  const occupancyPct = event.max_participants && spotsLeft !== null
    ? Math.round(((event.max_participants - spotsLeft) / event.max_participants) * 100)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ───── HERO ───── */}
      <div className="relative">
        {event.banner_url ? (
          <div className="h-[45vh] md:h-[55vh] overflow-hidden relative">
            <img src={event.banner_url} className="w-full h-full object-cover" alt={event.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ) : (
          <div className="h-[30vh] bg-gradient-to-br from-violet-950 via-indigo-950 to-zinc-950 relative overflow-hidden">
            {/* Padrão decorativo */}
            <div className="absolute inset-0 opacity-10">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute rounded-full border border-violet-400/30"
                  style={{ width: `${200 + i * 80}px`, height: `${200 + i * 80}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          </div>
        )}

        {/* Share button */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(v => !v)}
              className="p-3 bg-black/40 backdrop-blur-sm text-white rounded-2xl border border-white/10 hover:bg-black/60 transition-all"
              title="Compartilhar"
            >
              <Share2 size={18} />
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[180px] animate-in zoom-in-95 duration-150 z-20">
                <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-bold text-zinc-200">
                  <MessageCircle size={16} className="text-emerald-400" /> WhatsApp
                </button>
                <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-bold text-zinc-200 border-t border-white/5">
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-zinc-400" />}
                  {copied ? 'Link copiado!' : 'Copiar link'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Título sobre o hero */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-violet-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                Evento Pago
              </span>
              {isSoldOut && (
                <span className="px-3 py-1 bg-rose-600 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                  Esgotado
                </span>
              )}
              {isAlmostFull && !isSoldOut && (
                <span className="px-3 py-1 bg-amber-500 rounded-full text-[10px] font-black text-white uppercase tracking-widest animate-pulse">
                  🔥 Últimas {spotsLeft} vagas!
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-lg">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ───── CONTENT ───── */}
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-8 space-y-6">

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center space-y-2 group hover:border-violet-500/20 transition-all">
            <Calendar size={20} className="text-violet-400 mx-auto" />
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Data</p>
              <p className="text-xs font-black text-white mt-0.5 leading-tight">{formatDateShort(event.start_date)}</p>
            </div>
          </div>

          {event.location && (
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center space-y-2 hover:border-violet-500/20 transition-all">
              <MapPin size={20} className="text-violet-400 mx-auto" />
              <div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Local</p>
                <p className="text-xs font-black text-white mt-0.5 leading-tight truncate">{event.location}</p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 text-center space-y-2 hover:border-emerald-500/20 transition-all">
            <DollarSign size={20} className="text-emerald-400 mx-auto" />
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Valor</p>
              <p className="text-base font-black text-emerald-400 mt-0.5">{formatCurrency(event.price)}</p>
            </div>
          </div>

          {event.max_participants && (
            <div className={`bg-zinc-900 border rounded-2xl p-4 text-center space-y-2 transition-all ${isSoldOut ? 'border-rose-500/20' : isAlmostFull ? 'border-amber-500/20' : 'border-white/5 hover:border-violet-500/20'}`}>
              <Users size={20} className={`mx-auto ${isSoldOut ? 'text-rose-400' : isAlmostFull ? 'text-amber-400' : 'text-blue-400'}`} />
              <div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vagas</p>
                <p className={`text-base font-black mt-0.5 ${isSoldOut ? 'text-rose-400' : isAlmostFull ? 'text-amber-400' : 'text-white'}`}>
                  {isSoldOut ? 'Esgotado' : spotsLeft !== null ? `${spotsLeft} restantes` : event.max_participants}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de ocupação */}
        {occupancyPct !== null && event.max_participants && (
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ocupação</p>
              <span className={`text-sm font-black ${occupancyPct >= 90 ? 'text-rose-400' : occupancyPct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {occupancyPct}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${occupancyPct >= 90 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : occupancyPct >= 70 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-600 font-bold">
              {event.max_participants - (spotsLeft ?? 0)} confirmados de {event.max_participants} vagas
            </p>
          </div>
        )}

        {/* Descrição */}
        {event.description && (
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-zinc-500" />
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sobre o Evento</h2>
            </div>
            <p className="text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap text-sm">{event.description}</p>
          </div>
        )}

        {/* Instruções de pagamento */}
        {event.payment_instructions && (
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode size={14} className="text-violet-400" />
              <h2 className="text-xs font-black text-violet-300 uppercase tracking-widest">Instruções de Pagamento</h2>
            </div>
            <p className="text-zinc-300 font-medium leading-relaxed text-sm">{event.payment_instructions}</p>
          </div>
        )}

        {/* Data completa */}
        <div className="flex items-start gap-4 p-5 bg-zinc-900 border border-white/5 rounded-2xl">
          <div className="w-12 h-12 bg-violet-600/10 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={20} className="text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Quando</p>
            <p className="text-sm font-bold text-white capitalize">{formatDate(event.start_date)}</p>
            {event.end_date && event.end_date !== event.start_date && (
              <p className="text-xs text-zinc-500 mt-0.5">até {formatDate(event.end_date)}</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 space-y-3">
          <button
            onClick={() => navigate(`/evento/${slug}/inscricao`)}
            disabled={isSoldOut}
            className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-200 ${
              isSoldOut
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isSoldOut ? (
              'Inscrições Esgotadas'
            ) : (
              <>
                <Ticket size={18} />
                Quero me Inscrever
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            onClick={() => handleShare('whatsapp')}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all"
          >
            <MessageCircle size={16} className="text-emerald-400" />
            Compartilhar no WhatsApp
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-white/5">
          <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Powered by Ecclesia SaaS</p>
        </div>
      </div>
    </div>
  );
};

export default PaidEventPublicPage;
