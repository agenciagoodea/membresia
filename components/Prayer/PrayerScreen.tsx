
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Stars, UserCircle2, Quote, Clock, Sparkles, X, ChevronLeft, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChurchStatus, PrayerStatus, PrayerRequest, ChurchTenant } from '../../types';
import { prayerService } from '../../services/prayerService';
import { churchService } from '../../services/churchService';
import { supabase } from '../../services/supabaseClient';

const PrayerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const effectiveSlug = slug || '';
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tenant, setTenant] = useState<ChurchTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPending, setHasPending] = useState(false);
  const lastRequestIdRef = React.useRef<string | null>(null);

  // URL para o QR Code (página de envio desta igreja)
  const shareUrl = `${window.location.origin}/#/prayer/new/${tenant?.slug || effectiveSlug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=000000&margin=10`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/app');
    };
    window.addEventListener('keydown', handleKeyDown);

    const loadData = async (isSilent = false) => {

      try {
        if (!isSilent) setLoading(true);
        // 1. Carregar Tenant
        let currentTenant: ChurchTenant | null = null;
        if (slug) {
          console.log('Buscando igreja com slug:', slug);
          currentTenant = await churchService.getBySlug(slug).catch(() => null);
        }

        // Se não houver slug ou falhar, busca a primeira do banco (Padrão)
        if (!currentTenant) {
          console.log('Sem slug ou erro, buscando igreja padrão...');
          currentTenant = await churchService.getFirst().catch(err => {
            console.warn('Nenhuma igreja no banco:', err);
            return null;
          });
        }
        setTenant(currentTenant);

        // 2. Carregar Pedidos
        if (currentTenant) {
          console.log('Carregando pedidos para:', currentTenant.name, '(ID:', currentTenant.id, ')');
          const data = await prayerService.getAll(currentTenant.id);
          console.log('Pedidos brutos:', data.length);

          // 1. Filtrar Aprovados ou Em Clamor
          // 2. Ordenar por data (mais recentes primeiro)
          const approved = data
            .filter(r =>
              (r.status === PrayerStatus.APPROVED ||
                r.status === PrayerStatus.IN_PRAYER) &&
              r.allowScreenBroadcast !== false
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          console.log('Pedidos aprovados para o telão:', approved.length);

          // Lógica inteligente de transição:
          // Se o pedido atual saiu da lista (foi atendido), volta para o início ou o anterior
          setRequests((prevRequests) => {
            const hasChanged = JSON.stringify(prevRequests) !== JSON.stringify(approved);
            if (hasChanged) {
              console.log('Lista de pedidos atualizada no telão. Ajustando index...');
              // Se o pedido que estava sendo exibido sumiu, ou a lista ficou vazia, reseta
              if (approved.length === 0) {
                setCurrentIndex(0);
                lastRequestIdRef.current = null;
              } else if (currentIndex >= approved.length) {
                setCurrentIndex(0);
              }

              // Se o pedido mais recente mudou, reseta para mostrar o mais novo
              if (approved.length > 0 && approved[0].id !== lastRequestIdRef.current) {
                lastRequestIdRef.current = approved[0].id;
                setCurrentIndex(0);
              }
            }
            return approved;
          });

          setHasPending(data.some(r => r.status === PrayerStatus.PENDING));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do telão:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Inscrição em tempo real com monitoramento de status
    const channel = prayerService.subscribeToPrayers((payload) => {
      console.log('Realtime detectado no Telão:', payload.eventType);
      loadData(true); // Carregar em background (sem spinner)
    });

    channel.subscribe((status) => {
      console.log('CONEXÃO REALTIME:', status);
      if (status === 'CHANNEL_ERROR') {
        console.error('Erro na conexão Realtime. Pode ser bloqueio do navegador ou VPN.');
      }

    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      supabase.removeChannel(channel);
    };
  }, [navigate, slug]);

  useEffect(() => {
    if (requests.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % requests.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [requests.length]);

  const current = requests[currentIndex];

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Sincronizando com o Trono...</p>
      </div>
    );
  }

  if (!current || !tenant) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 md:p-12 text-center relative overflow-y-auto scrollbar-hide">
        <button
          onClick={() => navigate('/app')}
          className="absolute top-8 left-8 p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all z-50 flex items-center gap-2 font-bold text-sm"
        >
          <ChevronLeft size={20} /> Sair do Modo Telão
        </button>

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-rose-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
          <div className="relative z-10 w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-3xl shadow-2xl">
            <Heart size={48} className="text-rose-500 fill-rose-500 animate-pulse" />
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 uppercase tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">Clamor Coletivo</h1>
        <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed mb-8">
          {hasPending
            ? <span>Existem pedidos <span className="text-rose-400 font-black underline">aguardando moderação</span>. Aprove-os no painel para exibi-los aqui.</span>
            : <span>Envie seu pedido agora mesmo. Aponte sua câmera para o <span className="text-white font-black underline decoration-rose-500">QR Code</span> e junte-se a nós em oração.</span>}
        </p>

        <div className="mb-10 bg-white p-4 rounded-[2rem] shadow-2xl ring-4 ring-white/5 animate-in zoom-in duration-700">
          <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
          <p className="text-zinc-950 font-black text-[10px] uppercase tracking-widest mt-2">Escaneie para orar</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 bg-white/5 px-8 py-4 rounded-full border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Clock className="text-rose-500" size={24} />
            <span className="text-lg font-black uppercase tracking-widest text-white/80">Momento de Fé</span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <Sparkles className="text-blue-400" size={24} />
            <span className="text-lg font-black uppercase tracking-widest text-white/80">{tenant?.name || 'Carregando...'}</span>
          </div>
        </div>
      </div>
    );
  }

  const displayName = current.isAnonymous ? "Irmão(ã) em Cristo" : current.name;

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden relative flex items-center justify-center font-sans selection:bg-rose-500">
      <button
        onClick={() => navigate('/app')}
        className="absolute top-8 left-8 p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all z-50 flex items-center gap-2 font-bold text-sm"
      >
        <ChevronLeft size={20} /> Sair do Modo Telão
      </button>

      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-blue-600 rounded-full blur-[300px] -translate-x-1/3 -translate-y-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[1000px] h-[1000px] bg-rose-600 rounded-full blur-[300px] translate-x-1/3 translate-y-1/3 animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      <div key={current.id} className="relative z-10 w-full max-w-[1400px] px-8 md:px-12 py-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">

        {/* Superior Label */}
        <div className="flex items-center gap-6 mb-12">
          <div className="w-24 h-1 bg-gradient-to-r from-transparent to-rose-500/50 rounded-full"></div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-3 rounded-2xl backdrop-blur-3xl shadow-2xl">
            <Heart size={24} className="text-rose-500 fill-rose-500" />
            <span className="text-xl font-black uppercase tracking-[0.4em] text-white">INTERCESSÃO</span>
          </div>
          <div className="w-24 h-1 bg-gradient-to-l from-transparent to-rose-500/50 rounded-full"></div>
        </div>

        <div className="flex flex-col xl:flex-row items-center gap-24 xl:gap-32 w-full">
          {/* Photo Container */}
          <div className="shrink-0 relative group">
            <div className="absolute -inset-8 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-[5rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>

            <div className="relative bg-slate-900 rounded-[2rem] border-[8px] border-white/5 shadow-2xl overflow-hidden flex items-center justify-center w-[350px] h-[350px] xl:w-[450px] xl:h-[450px]">
              {current.photo ? (
                <img
                  src={current.photo}
                  className="w-full h-full object-cover shadow-2xl"
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                  <UserCircle2 size={200} strokeWidth={0.5} />
                  <p className="text-lg font-black uppercase tracking-[0.5em] mt-4 opacity-20">Clamor</p>
                </div>
              )}
            </div>

            {/* Status Floating Badge */}
            <div className={`absolute -bottom-8 -right-8 w-40 h-40 rounded-[2.5rem] flex items-center justify-center shadow-3xl border-[12px] border-slate-950 transition-all duration-700 scale-110 ${current.status === PrayerStatus.IN_PRAYER ? 'bg-emerald-500' : 'bg-rose-600'
              }`}>
              {current.status === PrayerStatus.IN_PRAYER ? <Stars size={70} className="text-white animate-spin-slow" /> : <Heart size={70} className="text-white fill-white" />}
            </div>
          </div>

          {/* Content Side */}
          <div className="flex-1 text-center xl:text-left space-y-12">
            <div className="space-y-4">
              <p className={`text-3xl font-black uppercase tracking-[0.4em] flex items-center justify-center xl:justify-start gap-4 ${current.status === PrayerStatus.IN_PRAYER ? 'text-emerald-400' : 'text-rose-500'
                }`}>
                <span className="w-4 h-4 rounded-full bg-current animate-ping" />
                {current.status === PrayerStatus.IN_PRAYER ? 'INTERCEDENDO AGORA' : 'PEDIDO DE ORAÇÃO'}
              </p>
              <h2 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
                {displayName}
              </h2>
            </div>

            <div className="relative">
              <Quote className="absolute -left-12 -top-8 text-rose-500/20" size={80} />
              <p className="text-3xl xl:text-5xl text-slate-100 font-medium italic leading-[1.2] text-balance">
                "{current.request}"
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center xl:justify-start gap-8">
              {current.targetPerson === 'OTHER' && current.targetName && (
                <div className="flex items-center gap-6 bg-white/5 px-10 py-5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                  <span className="text-slate-500 text-lg font-black uppercase tracking-widest">PELA VIDA DE:</span>
                  <span className="text-white text-4xl font-black uppercase tracking-tight text-rose-500">{current.targetName}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-white/40 text-xl font-bold uppercase tracking-widest">
                <Heart size={24} className="text-rose-500" /> +{requests.length} Irmãos em Clamor
              </div>
            </div>
          </div>
        </div>

        {/* Cinematic Footer */}
        <div className="mt-8 md:mt-12 w-full flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl gap-6">
          <div className="flex items-center gap-4">
            {tenant.logo ? (
              <div className="w-12 h-12 rounded-xl bg-white p-2 shadow-2xl overflow-hidden flex items-center justify-center border border-white/10">
                <img src={tenant.logo} className="w-full h-full object-contain" alt="" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-2xl border border-white/10">
                {tenant.name.substring(0, 1)}
              </div>
            )}
            <div>
              <p className="text-xl font-black text-white leading-none mb-1 uppercase tracking-tight">{tenant.name}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Canal de Oração Oficial</p>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">PRÓXIMO PEDIDO EM</p>
              <div className="flex gap-2 justify-end">
                {requests.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-1000 ${i === currentIndex ? 'w-12 bg-white' : 'w-3 bg-white/20'}`}></div>
                ))}
              </div>
            </div>
            <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-2xl group relative overflow-hidden shrink-0">
              <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerScreen;
