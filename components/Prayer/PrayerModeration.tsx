
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  MoreVertical, 
  UserPlus, 
=======
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  MoreVertical,
  UserPlus,
>>>>>>> 1ecc747 (1.0 Ficha)
  Phone,
  MessageSquare,
  Check,
  ShieldAlert,
  Stars,
  Monitor,
  Plus,
  HeartHandshake,
  Trash2,
  ExternalLink,
  UserCheck,
  Eye,
  EyeOff,
  ChevronDown,
  X
} from 'lucide-react';
<<<<<<< HEAD
import { MOCK_PRAYER_REQUESTS } from '../../constants';
import { PrayerStatus, PrayerRequest } from '../../types';
=======
import { MOCK_PRAYER_REQUESTS, MOCK_TENANT } from '../../constants';
import { LadderStage, PrayerStatus, PrayerRequest, UserRole, MemberOrigin } from '../../types';
import { prayerService } from '../../services/prayerService';
import { memberService } from '../../services/memberService';
>>>>>>> 1ecc747 (1.0 Ficha)

const PrayerModeration: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('ALL');
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
<<<<<<< HEAD
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('ecclesia_prayer_requests') || '[]');
    setRequests([...MOCK_PRAYER_REQUESTS, ...stored]);
  }, []);

  const updateStatus = (id: string, status: PrayerStatus) => {
    const updated = requests.map(r => r.id === id ? {...r, status} : r);
    setRequests(updated);
    
    const stored = JSON.parse(localStorage.getItem('ecclesia_prayer_requests') || '[]');
    if (stored.some((r: any) => r.id === id)) {
      localStorage.setItem('ecclesia_prayer_requests', JSON.stringify(stored.map((r: any) => r.id === id ? {...r, status} : r)));
    }
    setActiveMenuId(null);
  };

  const removeRequest = (id: string) => {
    if(confirm('Excluir permanentemente?')) {
      const updated = requests.filter(r => r.id !== id);
      setRequests(updated);
      const stored = JSON.parse(localStorage.getItem('ecclesia_prayer_requests') || '[]');
      localStorage.setItem('ecclesia_prayer_requests', JSON.stringify(stored.filter((r: any) => r.id !== id)));
    }
  };

  const handleImportToWin = (request: PrayerRequest) => {
    alert(`Sucesso! ${request.name} foi importado para a Escada do Sucesso (Stage: GANHAR).`);
    updateStatus(request.id, PrayerStatus.ANSWERED);
=======
  const [memberEmails, setMemberEmails] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const [requestsData, membersData] = await Promise.all([
          prayerService.getAll(MOCK_TENANT.id),
          memberService.getAll(MOCK_TENANT.id)
        ]);
        setRequests(requestsData);
        setMemberEmails(new Set(membersData.map(m => m.email.toLowerCase()).filter(e => e)));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadRequests();
  }, []);

  const updateStatus = async (id: string, status: PrayerStatus) => {
    try {
      await prayerService.updateStatus(id, status);
      const updated = requests.map(r => r.id === id ? { ...r, status } : r);
      setRequests(updated);
      setActiveMenuId(null);
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pedido. Detalhes: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const removeRequest = async (id: string) => {
    if (confirm('Excluir permanentemente este pedido de oração?')) {
      try {
        await prayerService.delete(id);
        const updated = requests.filter(r => r.id !== id);
        setRequests(updated);
      } catch (error: any) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir o pedido.');
      }
    }
  };

  const handleImportToWin = async (request: PrayerRequest) => {
    try {
      // 0. Verificar se já existe membro com este e-mail
      if (request.email && memberEmails.has(request.email.toLowerCase())) {
        // Se já existe, apenas marcamos o pedido como atendido/direcionado localmente para o UI
        await prayerService.updateStatus(request.id, PrayerStatus.ANSWERED);
        const updated = requests.map(r => r.id === request.id ? { ...r, status: PrayerStatus.ANSWERED } : r);
        setRequests(updated);
        return;
      }

      // 1. Criar o membro no banco (Estágio GANHAR)
      await memberService.create({
        church_id: MOCK_TENANT.id,
        name: request.name,
        email: request.email,
        phone: request.phone,
        role: UserRole.MEMBER_VISITOR,
        stage: LadderStage.WIN,
        cellId: '', // Ainda sem célula definida
        joinedDate: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name)}&background=random`,
        origin: MemberOrigin.PRAYER_REQUEST,
        stageHistory: [{
          stage: LadderStage.WIN,
          date: new Date().toISOString(),
          recordedBy: 'Conversão via Pedido de Oração',
          notes: `Importado do clamor: "${request.request.substring(0, 50)}..."`
        }]
      });

      // 2. Atualizar lista de e-mails local
      if (request.email) {
        setMemberEmails(prev => new Set([...prev, request.email.toLowerCase()]));
      }

      // 3. Marcar pedido como atendido
      await prayerService.updateStatus(request.id, PrayerStatus.ANSWERED);

      // 3. Atualizar estado local
      const updated = requests.map(r => r.id === request.id ? { ...r, status: PrayerStatus.ANSWERED } : r);
      setRequests(updated);

      // 4. Notificar sem redirecionar (conforme o usuário solicitou que o botão fique verde)
      // alert(`Sucesso! ${request.name} agora é um novo decidido.`);
    } catch (error: any) {
      console.error('Erro ao importar membro:', error);
      alert('Erro ao realizar a importação: ' + (error.message || 'Erro inesperado'));
    }
>>>>>>> 1ecc747 (1.0 Ficha)
  };

  const filtered = requests.filter(r => filter === 'ALL' ? true : r.status === filter);

  const getStatusColor = (status: PrayerStatus) => {
<<<<<<< HEAD
    switch(status) {
=======
    switch (status) {
>>>>>>> 1ecc747 (1.0 Ficha)
      case PrayerStatus.PENDING: return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
      case PrayerStatus.APPROVED: return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
      case PrayerStatus.IN_PRAYER: return 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]';
      case PrayerStatus.ANSWERED: return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      default: return 'bg-zinc-700';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Moderação de Clamor</h2>
          <p className="text-zinc-500 font-medium text-lg italic">Curadoria de fé para o telão e acompanhamento pastoral.</p>
        </div>
<<<<<<< HEAD
        <button 
          onClick={() => navigate('/prayer-screen')} 
=======
        <button
          onClick={() => navigate('/prayer-screen')}
>>>>>>> 1ecc747 (1.0 Ficha)
          className="flex items-center gap-3 px-8 py-4 bg-zinc-900 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-2xl"
        >
          <Monitor size={18} className="text-blue-500" /> Abrir Modo Telão
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { label: 'Todos', filter: 'ALL', activeClass: 'bg-white text-zinc-950 shadow-white/10' },
          { label: 'Pendentes', filter: PrayerStatus.PENDING, activeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
          { label: 'Aprovados', filter: PrayerStatus.APPROVED, activeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
          { label: 'Em Clamor', filter: PrayerStatus.IN_PRAYER, activeClass: 'bg-indigo-500 text-white shadow-indigo-500/20' },
          { label: 'Atendidos', filter: PrayerStatus.ANSWERED, activeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
        ].map((s) => (
<<<<<<< HEAD
          <button 
            key={s.label} 
            onClick={() => setFilter(s.filter)} 
            className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap border ${
              filter === s.filter ? s.activeClass + ' scale-105' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10'
            }`}
=======
          <button
            key={s.label}
            onClick={() => setFilter(s.filter)}
            className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap border ${filter === s.filter ? s.activeClass + ' scale-105' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10'
              }`}
>>>>>>> 1ecc747 (1.0 Ficha)
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.map((req) => (
          <div key={req.id} className="bg-zinc-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col xl:flex-row xl:items-center gap-10 hover:bg-zinc-800/80 transition-all relative overflow-hidden group">
            {/* Status Glow Bar */}
            <div className={`absolute top-0 bottom-0 left-0 w-2 ${getStatusColor(req.status)}`} />

            <div className="relative shrink-0 flex items-center justify-center">
              {req.photo ? (
                <div className="relative">
<<<<<<< HEAD
                  <img src={req.photo} className="w-28 h-28 rounded-3xl object-cover ring-4 ring-zinc-950 shadow-2xl" alt="" />
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-zinc-950 ${getStatusColor(req.status)}`}>
                     <Check size={14} className="text-white" />
=======
                  <img src={req.photo} className="w-28 h-28 rounded-full ring-4 ring-zinc-950 shadow-2xl object-cover aspect-square" alt="" />
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-zinc-950 ${getStatusColor(req.status)}`}>
                    <Check size={14} className="text-white" />
>>>>>>> 1ecc747 (1.0 Ficha)
                  </div>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-3xl bg-zinc-950 border border-white/5 flex flex-col items-center justify-center text-zinc-700">
                  <UserPlus size={40} strokeWidth={1} />
                  <span className="text-[8px] font-black uppercase mt-1 opacity-50">Sem Foto</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-5 mb-5">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                    {req.isAnonymous ? (
                      <span className="flex items-center gap-2 text-zinc-500 italic font-medium text-lg uppercase tracking-widest">[ Anônimo ]</span>
                    ) : req.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
<<<<<<< HEAD
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Registrado em: {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
=======
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Registrado em: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
>>>>>>> 1ecc747 (1.0 Ficha)
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {req.requestPastoralCall && (
<<<<<<< HEAD
                  <div className="flex items-center gap-3 px-5 py-2 bg-indigo-600/10 text-indigo-400 rounded-2xl text-[9px] font-black uppercase border border-indigo-500/20 shadow-lg shadow-indigo-500/10 animate-pulse">
                    <UserPlus size={14} /> Acompanhamento Solicitado
=======
                  <div className="flex items-center gap-3 px-5 py-2 bg-emerald-500 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/40 animate-pulse border border-emerald-400/50">
                    <UserPlus size={14} className="animate-bounce" /> Acompanhamento Solicitado
>>>>>>> 1ecc747 (1.0 Ficha)
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <a href={`tel:${req.phone}`} className="p-3.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl bg-zinc-950 border border-white/5 transition-all"><Phone size={18} /></a>
<<<<<<< HEAD
                  <button className="p-3.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl bg-zinc-950 border border-white/5 transition-all"><MessageSquare size={18} /></button>
=======
                  <a
                    href={`https://wa.me/55${req.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl bg-zinc-950 border border-white/5 transition-all"
                  >
                    <MessageSquare size={18} />
                  </a>
>>>>>>> 1ecc747 (1.0 Ficha)
                </div>
              </div>

              <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 mb-6 shadow-inner">
                <p className="text-zinc-200 text-lg font-medium italic leading-relaxed">"{req.request}"</p>
              </div>
<<<<<<< HEAD
              
              <div className="flex flex-wrap items-center gap-8">
                 <div className="flex items-center gap-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                   <ShieldAlert size={16} className="text-emerald-500/50" /> Protocolo LGPD Ativo
                 </div>
                 <div className="flex items-center gap-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                   {req.showOnScreen ? <Eye size={16} className="text-blue-500" /> : <EyeOff size={16} className="text-zinc-700" />} 
                   {req.showOnScreen ? 'Público no Telão' : 'Sigilo Ministerial'}
                 </div>
                 {req.requestPastoralCall && (
                   <button 
                     onClick={() => handleImportToWin(req)} 
                     className="flex items-center gap-2.5 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 border border-indigo-400/20"
                   >
                     <UserCheck size={16} /> Importar para "GANHAR"
                   </button>
                 )}
=======

              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  <ShieldAlert size={16} className="text-emerald-500/50" /> Protocolo LGPD Ativo
                </div>
                <div className="flex items-center gap-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  {req.showOnScreen ? <Eye size={16} className="text-blue-500" /> : <EyeOff size={16} className="text-zinc-700" />}
                  {req.showOnScreen ? 'Público no Telão' : 'Sigilo Ministerial'}
                </div>
                {req.requestPastoralCall && (
                  (() => {
                    const isAlreadyMember = req.email && memberEmails.has(req.email.toLowerCase());
                    const isSent = req.status === PrayerStatus.ANSWERED || isAlreadyMember;

                    return (
                      <button
                        disabled={isSent}
                        onClick={() => handleImportToWin(req)}
                        className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all shadow-xl border ${isSent
                          ? 'bg-emerald-600 text-white border-emerald-400/40 shadow-emerald-500/20 cursor-default'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20 border-indigo-400/20 active:scale-95'
                          }`}
                      >
                        {isSent ? <Check size={16} /> : <UserCheck size={16} />}
                        {isSent ? 'Direcionado para "GANHAR"' : 'Enviar para "GANHAR"'}
                      </button>
                    );
                  })()
                )}
>>>>>>> 1ecc747 (1.0 Ficha)
              </div>
            </div>

            <div className="flex items-center gap-4 border-t xl:border-t-0 xl:border-l border-white/5 pt-8 xl:pt-0 xl:pl-10">
              <div className="flex flex-col gap-4 w-full xl:w-56">
<<<<<<< HEAD
                <button 
                  onClick={() => updateStatus(req.id, PrayerStatus.APPROVED)} 
                  className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                >
                  <CheckCircle2 size={18} /> APROVAR AGORA
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === req.id ? null : req.id)} 
=======
                {req.status === PrayerStatus.PENDING && (
                  <button
                    onClick={() => updateStatus(req.id, PrayerStatus.APPROVED)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                  >
                    <CheckCircle2 size={18} /> APROVAR AGORA
                  </button>
                )}

                {req.status === PrayerStatus.APPROVED && (
                  <button
                    onClick={() => updateStatus(req.id, PrayerStatus.IN_PRAYER)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                  >
                    <Stars size={18} /> ENVIAR P/ O TELÃO
                  </button>
                )}

                {req.status === PrayerStatus.IN_PRAYER && (
                  <button
                    onClick={() => updateStatus(req.id, PrayerStatus.ANSWERED)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
                  >
                    <Check size={18} /> CONFRONTAR / ENCERRAR
                  </button>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === req.id ? null : req.id)}
>>>>>>> 1ecc747 (1.0 Ficha)
                    className="flex-1 py-4 bg-zinc-950 border border-white/10 text-zinc-400 rounded-2xl text-[10px] font-black uppercase hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    OPÇÕES <ChevronDown size={14} className={activeMenuId === req.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
<<<<<<< HEAD
                  <button 
                    onClick={() => removeRequest(req.id)} 
=======
                  <button
                    onClick={() => removeRequest(req.id)}
>>>>>>> 1ecc747 (1.0 Ficha)
                    className="p-4 text-zinc-600 hover:text-rose-500 bg-zinc-950 border border-white/5 rounded-2xl hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {activeMenuId === req.id && (
                  <div className="absolute right-8 bottom-8 bg-zinc-900 border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] p-2 min-w-[240px] animate-in slide-in-from-bottom-4 duration-300">
                    <p className="text-[9px] font-black text-zinc-600 uppercase px-4 py-2 border-b border-white/5 mb-1 tracking-widest">Alterar Fluxo</p>
                    <button onClick={() => updateStatus(req.id, PrayerStatus.IN_PRAYER)} className="w-full text-left p-4 text-xs font-bold hover:bg-indigo-500 text-zinc-300 hover:text-white flex items-center gap-3 rounded-2xl transition-all">
                      <Stars size={16} /> Enviar p/ Clamor Vivo
                    </button>
                    <button onClick={() => updateStatus(req.id, PrayerStatus.ANSWERED)} className="w-full text-left p-4 text-xs font-bold hover:bg-emerald-500 text-zinc-300 hover:text-white flex items-center gap-3 rounded-2xl transition-all">
                      <Check size={16} /> Marcar como Atendido
                    </button>
                    <div className="h-px bg-white/5 my-2 mx-2" />
                    <button onClick={() => updateStatus(req.id, PrayerStatus.REJECTED)} className="w-full text-left p-4 text-xs font-bold hover:bg-rose-500 text-zinc-300 hover:text-white flex items-center gap-3 rounded-2xl transition-all">
                      <XCircle size={16} /> Rejeitar Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-40 text-center bg-zinc-900 border border-dashed border-white/5 rounded-[3rem]">
            <HeartHandshake size={80} className="mx-auto mb-6 text-zinc-800 opacity-50" />
            <p className="text-zinc-500 font-black uppercase tracking-[0.4em] text-sm italic">Nenhum pedido nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrayerModeration;
