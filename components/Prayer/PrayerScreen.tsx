
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Stars, UserCircle2, Quote, Clock, Sparkles, X, ChevronLeft } from 'lucide-react';
import { MOCK_PRAYER_REQUESTS, MOCK_TENANT } from '../../constants';
import { PrayerStatus, PrayerRequest } from '../../types';
import { prayerService } from '../../services/prayerService';

const PrayerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/app');
    };
    window.addEventListener('keydown', handleKeyDown);

    const loadPrayers = async () => {
      try {
        const data = await prayerService.getAll(MOCK_TENANT.id);
        const approved = data.filter(r =>
          (r.status === PrayerStatus.APPROVED || r.status === PrayerStatus.IN_PRAYER) && (r.showOnScreen !== false)
        );
        setRequests(approved);
      } catch (error) {
        console.error('Erro ao carregar orações:', error);
      }
    };

    loadPrayers();

    const subscription = prayerService.subscribeToPrayers(() => {
      loadPrayers();
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (requests.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % requests.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [requests.length]);

  const current = requests[currentIndex];

  if (!current) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-20 text-center relative overflow-hidden">
        <button
          onClick={() => navigate('/app')}
          className="absolute top-8 left-8 p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all z-50 flex items-center gap-2 font-bold text-sm"
        >
          <ChevronLeft size={20} /> Sair do Modo Telão
        </button>

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-rose-500 rounded-full blur-[150px] opacity-30 animate-pulse"></div>
          <div className="relative z-10 w-40 h-40 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl shadow-2xl">
            <Heart size={100} className="text-rose-500 fill-rose-500 animate-pulse" />
          </div>
        </div>
        <h1 className="text-8xl font-black mb-8 uppercase tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">Clamor Coletivo</h1>
        <p className="text-4xl text-slate-400 font-medium max-w-3xl leading-relaxed">
          Envie seu pedido agora mesmo. Aponte sua câmera para o <span className="text-white font-black underline decoration-rose-500">QR Code</span> e junte-se a nós em oração.
        </p>
        <div className="mt-20 flex items-center gap-12 bg-white/5 px-12 py-6 rounded-full border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Clock className="text-rose-500" size={32} />
            <span className="text-2xl font-black uppercase tracking-widest text-white/80">Momento de Fé</span>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <div className="flex items-center gap-4">
            <Sparkles className="text-blue-400" size={32} />
            <span className="text-2xl font-black uppercase tracking-widest text-white/80">{MOCK_TENANT.name}</span>
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

      <div key={current.id} className="relative z-10 w-full max-w-[1600px] px-24 py-12 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">

        {/* Superior Label */}
        <div className="flex items-center gap-12 mb-24">
          <div className="w-48 h-1.5 bg-gradient-to-r from-transparent to-rose-500/50 rounded-full"></div>
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-12 py-5 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
            <Heart size={32} className="text-rose-500 fill-rose-500" />
            <span className="text-3xl font-black uppercase tracking-[0.6em] text-white">INTERCESSÃO</span>
          </div>
          <div className="w-48 h-1.5 bg-gradient-to-l from-transparent to-rose-500/50 rounded-full"></div>
        </div>

        <div className="flex flex-col xl:flex-row items-center gap-24 xl:gap-32 w-full">
          {/* Photo Container */}
          <div className="shrink-0 relative group">
            <div className="absolute -inset-8 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-[5rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>

            <div className="relative bg-slate-900 rounded-[2rem] border-[8px] border-white/5 shadow-2xl overflow-hidden flex items-center justify-center w-[500px] h-[500px] xl:w-[500px] xl:h-[500px]">
              {current.photo ? (
                <img
                  src={current.photo}
                  className="w-full h-full object-cover shadow-2xl"
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                  <UserCircle2 size={300} strokeWidth={0.5} />
                  <p className="text-xl font-black uppercase tracking-[0.5em] mt-8 opacity-20">Clamor</p>
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
              <Quote className="absolute -left-16 -top-12 text-rose-500/20" size={120} />
              <p className="text-5xl xl:text-6xl text-slate-100 font-medium italic leading-[1.2] text-balance">
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
        <div className="mt-32 w-full flex items-center justify-between px-16 py-8 bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-2xl">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-white p-4 shadow-2xl overflow-hidden flex items-center justify-center">
              <img src={MOCK_TENANT.logo} className="w-full h-full object-contain" alt="" />
            </div>
            <div>
              <p className="text-4xl font-black text-white leading-none mb-1">{MOCK_TENANT.name}</p>
              <p className="text-lg text-slate-400 font-bold uppercase tracking-[0.5em]">Visionary Cloud Experience</p>
            </div>
          </div>

          <div className="flex items-center gap-12">
            <div className="text-right">
              <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2">PRÓXIMO PEDIDO EM</p>
              <div className="flex gap-3 justify-end">
                {requests.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all duration-1000 ${i === currentIndex ? 'w-16 bg-white' : 'w-4 bg-white/20'}`}></div>
                ))}
              </div>
            </div>
            <div className="w-32 h-32 bg-white rounded-3xl p-1 shadow-2xl group relative overflow-hidden">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-white text-center p-2">
                <Sparkles size={24} className="text-rose-500 mb-1" />
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">ESCANEIE<br />ENVIE ORAÇÃO</span>
              </div>
              <div className="absolute inset-0 bg-white p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center border-2 border-slate-100">
                  <Heart size={32} className="text-rose-500 p-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerScreen;
