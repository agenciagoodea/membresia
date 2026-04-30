
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  UserCog,
  ShieldAlert,
  Loader2,
  User,
  UserPlus,
  Users,
  LayoutDashboard,
  LogOut,
  Plus,
  Heart,
  Settings as SettingsIcon,
  Monitor,
  ExternalLink,
  ChevronLeft,
  DollarSign,
  Tv
} from 'lucide-react';
import {
  MASTER_NAV_ITEMS,
  PASTOR_NAV_ITEMS,
  LEADER_NAV_ITEMS,
  MEMBER_NAV_ITEMS
} from './constants';
import { authService } from './services/authService';
import { prayerService } from './services/prayerService';
import { memberService } from './services/memberService';
import { UserRole, PrayerStatus } from './types';
import { supabase } from './services/supabaseClient';
const Login = lazy(() => import('./components/Auth/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Members = lazy(() => import('./components/Members'));
const Cells = lazy(() => import('./components/Cells'));
const Finance = lazy(() => import('./components/Finance'));
const IAInsights = lazy(() => import('./components/IAInsights'));
const SuccessLadder = lazy(() => import('./components/Ladder/SuccessLadder'));
const MyM12Activities = lazy(() => import('./components/Member/MyM12Activities.tsx'));
const ChurchesManager = lazy(() => import('./components/MasterAdmin/ChurchesManager'));
const PlansManager = lazy(() => import('./components/MasterAdmin/PlansManager'));
const SecurityAudit = lazy(() => import('./components/MasterAdmin/SecurityAudit'));
const LandingPageSettings = lazy(() => import('./components/MasterAdmin/LandingPageSettings'));
const PrayerForm = lazy(() => import('./components/Prayer/PrayerForm'));
const PrayerScreen = lazy(() => import('./components/Prayer/PrayerScreen'));
const PrayerModeration = lazy(() => import('./components/Prayer/PrayerModeration'));
const LandingPage = lazy(() => import('./components/Marketing/LandingPage'));
const PublicRegistration = lazy(() => import('./components/Marketing/PublicRegistration'));
const Settings = lazy(() => import('./components/Settings'));
const SaaSSettings = lazy(() => import('./components/MasterAdmin/SaaSSettings'));
const AdminsManager = lazy(() => import('./components/MasterAdmin/AdminsManager'));
const Events = lazy(() => import('./components/Events/Events'));
const PaidEventsManager = lazy(() => import('./components/PaidEvents/PaidEventsManager'));
const PaidEventPublicPage = lazy(() => import('./components/PaidEvents/PaidEventPublicPage'));
const PaidEventRegistrationForm = lazy(() => import('./components/PaidEvents/PaidEventRegistrationForm'));
import CompleteProfileModal from './components/Shared/CompleteProfileModal';

import { ChurchProvider } from './contexts/ChurchContext';

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-12">
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <div className="absolute inset-0 blur-2xl bg-blue-600/20 animate-pulse rounded-full" />
      </div>
      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Carregando Módulo...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, user, loading }: { children: React.ReactNode, user: any, loading: boolean }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Só redirecionar se não estiver carregando — evita race condition pós-login
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Enquanto carregando ou resolvendo o perfil, não renderizar nada
  if (loading || !user) return null;
  return <>{children}</>;
};

const QuickActionsMenu = ({ user }: { user: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isMaster = user.role === UserRole.MASTER_ADMIN;

  const actions = isMaster ? [
    { label: 'Nova Igreja', icon: <Plus size={16} />, path: '/app/churches' },
    { label: 'Gerenciar Planos', icon: <DollarSign size={16} />, path: '/app/plans' },
  ] : [
    { label: 'Novo Membro', icon: <User size={16} />, path: '/app/members', state: { openNewMember: true } },
    { label: 'Moderador Orações', icon: <Heart size={16} />, path: '/app/prayer-moderation' },
    { label: 'Solicitar Oração', icon: <Plus size={16} />, path: '/prayer/new' },
    ...((user.role === UserRole.MASTER_ADMIN || user.role === UserRole.CHURCH_ADMIN) ? [
      { label: 'Abrir Telão', icon: <Monitor size={16} />, path: '/prayer-screen' }
    ] : [])
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 ${isMaster ? 'bg-white text-zinc-950' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'} rounded-2xl text-sm font-bold hover:opacity-90 transition-all`}
      >
        <Plus size={18} />
        <span className="hidden sm:inline">Ações</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-60 bg-zinc-900 border border-white/10 rounded-[2rem] shadow-2xl z-20 py-3 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[10px] font-black text-zinc-500 uppercase px-5 py-2 border-b border-white/5 mb-2 tracking-widest">Menu de Atividade</p>
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.state) {
                    navigate(action.path, { state: action.state });
                  } else {
                    navigate(action.path);
                  }
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-blue-500">{action.icon}</span>
                  {action.label}
                </div>
                <ChevronRight size={12} className="text-zinc-600" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, toggle, user }: { isOpen: boolean, toggle: () => void, user: any }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = user.role;

  let navItems;
  switch (role) {
    case UserRole.MASTER_ADMIN: navItems = MASTER_NAV_ITEMS; break;
    case UserRole.CHURCH_ADMIN:
    case UserRole.PASTOR: navItems = PASTOR_NAV_ITEMS; break;
    case UserRole.CELL_LEADER_DISCIPLE: navItems = LEADER_NAV_ITEMS; break;
    default: navItems = MEMBER_NAV_ITEMS;
  }

  // Perfil mestre para o Master Admin
  const activeUser = role === UserRole.MASTER_ADMIN ? {
    ...user,
    name: user.name || 'AGÊNCIA GOODEA',
    avatar: user.avatar || user.avatar_url || 'https://ui-avatars.com/api/?name=Agencia+Goodea&background=2563eb&color=fff&size=200'
  } : user;

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-white/5 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20">E</div>
          <div>
            <h1 className="font-black text-white text-xl leading-tight tracking-tighter">Ecclesia</h1>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Black Edition</span>
          </div>
          <button onClick={toggle} className="lg:hidden ml-auto text-zinc-500">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            let path = '/app';
            if (item.id === 'prayer-screen-demo' || item.id === 'prayer-screen-link') path = '/prayer-screen';
            else if (item.id === 'settings' || item.id === 'profile' || item.id === 'master-settings') path = '/app/settings';
            else if (item.id !== 'dashboard' && item.id !== 'master-dashboard') path = `/app/${item.id}`;

            const isActive = location.pathname === path;

            return (
              <Link
                key={item.id}
                to={path}
                onClick={() => {
                  if (window.innerWidth < 1024) toggle();
                }}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-zinc-500 transition-colors'}>{item.icon}</span>
                  {item.label === 'Enviar Oração' ? 'Solicitar Oração' : item.label}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <div onClick={async () => { await authService.signOut(); navigate('/login'); }} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-500/10 cursor-pointer transition-all group text-zinc-400 hover:text-rose-400">
            <LogOut size={20} />
            <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Encerrar Sessão</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-950 border border-white/5 shadow-inner group cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => navigate('/app/settings')}>
            <img 
              src={activeUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name)}&background=2563eb&color=fff&size=200`} 
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name || 'User')}&background=2563eb&color=fff&size=200`; }}
              className="w-11 h-11 rounded-full ring-2 ring-white/10 shadow-lg object-cover" 
              alt="" 
            />
            <div className="flex-1 overflow-hidden font-black uppercase">
              <p className="text-[11px] text-white truncate tracking-tighter uppercase">{activeUser.name}</p>
              <p className="text-[8px] text-zinc-500 tracking-widest mt-0.5">{activeUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ user, onMenuToggle, notificationsCount = 0 }: { user: any, onMenuToggle: () => void, notificationsCount?: number }) => {
  const isMaster = user.role === UserRole.MASTER_ADMIN;
  const activeUser = isMaster ? {
    ...user,
    name: user.name || 'AGÊNCIA GOODEA',
    avatar: user.avatar || user.avatar_url || 'https://ui-avatars.com/api/?name=Agencia+Goodea&background=2563eb&color=fff&size=200'
  } : user;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button onClick={onMenuToggle} className="lg:hidden p-2.5 text-zinc-400 hover:bg-white/5 rounded-xl transition-all">
          <Menu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-3 bg-zinc-900 px-5 py-2.5 rounded-2xl border border-white/5 focus-within:ring-2 focus-within:ring-blue-600 focus-within:bg-zinc-800 transition-all group w-80">
          <Search size={18} className="text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          <input type="text" placeholder="Busca inteligente..." className="bg-transparent border-none outline-none text-sm w-full font-medium text-zinc-200" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-2xl border border-white/5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none pt-0.5">SaaS Online</span>
        </div>

        <div className="flex items-center gap-4 border-l border-white/5 pl-6">
          <button className="relative p-2.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Bell size={20} />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-black border-2 border-zinc-950 rounded-full flex items-center justify-center animate-bounce">
                {notificationsCount}
              </span>
            )}
          </button>

          {user.role !== UserRole.MEMBER_VISITOR && <QuickActionsMenu user={user} />}

          <div className="w-px h-8 bg-white/5 mx-2" />

          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">{activeUser.name}</p>
              <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">{activeUser.role}</p>
            </div>
            <img 
              src={activeUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name)}&background=2563eb&color=fff&size=200`} 
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name || 'User')}&background=2563eb&color=fff&size=200`; }}
              className="w-10 h-10 rounded-full ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all object-cover" 
              alt="" 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPrayersCount, setPendingPrayersCount] = useState(0);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const profileResolvedRef = React.useRef(false);

  // --- FUNÇÃO AUXILIAR: Resolver perfil a partir da sessão ---
  const resolveProfile = React.useCallback(async (session: any) => {
    if (!session?.user) return null;

    // 1. Tentar cache no metadata (Zero latência)
    const cached = session.user.user_metadata?.profile;
    // Se temos cache e ele já tem church_id (ou é MASTER_ADMIN que não precisa), retornar
    if (cached && (cached.churchId || cached.role === UserRole.MASTER_ADMIN)) {
      return cached;
    }

    // 2. Fallback: buscar no banco (essencial para novos vínculos feitos pelo Master Admin)
    if (session.user.email) {
      const fresh = await memberService.getByEmail(session.user.email);
      if (fresh) {
        // Atualiza cache de metadados para as próximas sessões
        supabase.auth.updateUser({ data: { profile: fresh } }).catch(() => {});
        return fresh;
      }
    }

    // 3. Last resort: retornar dados do Auth (para Master Admin ou novos usuários ainda não vinculados)
    const virtualProfile = {
      id: session.user.id,
      name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || 'Usuário',
      email: session.user.email,
      role: session.user.user_metadata?.role || UserRole.MASTER_ADMIN,
      churchId: session.user.user_metadata?.church_id || session.user.user_metadata?.churchId || null,
      church_id: session.user.user_metadata?.church_id || session.user.user_metadata?.churchId || null,
      avatar: session.user.user_metadata?.avatar_url || ''
    };
    return virtualProfile;
  }, []);

  useEffect(() => {
    // Timer de segurança reduzido para 2s
    const safetyTimer = setTimeout(() => setLoading(false), 2000);

    // Função para buscar dados frescos em background (avatar etc)
    const syncFreshProfile = async (email: string) => {
      if (!email || profileResolvedRef.current) return;
      try {
        const fresh = await memberService.getByEmail(email);
        if (fresh) {
          setCurrentUser((prev: any) => {
            if (prev?.avatar !== fresh.avatar || prev?.name !== fresh.name || prev?.role !== fresh.role) {
              supabase.auth.updateUser({ data: { profile: fresh } }).catch(() => {});
              return fresh;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn('Silent sync failed', e);
      } finally {
        profileResolvedRef.current = true;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Evento de Autenticação:', event);
      clearTimeout(safetyTimer);

      if (event === 'INITIAL_SESSION') {
        if (session) {
          const profile = await resolveProfile(session);
          if (profile) {
             setCurrentUser(profile);
             // Background sync to ensure avatar is up to date (e.g. if admin changed it)
             if (profile.role !== UserRole.MASTER_ADMIN && session.user.email) {
               syncFreshProfile(session.user.email);
             }
          }
        }
        setLoading(false);
        profileResolvedRef.current = true;
      } else if (event === 'SIGNED_IN') {
        const profile = await resolveProfile(session);
        if (profile) {
           setCurrentUser(profile);
           if (profile.role !== UserRole.MASTER_ADMIN && session.user?.email) {
             syncFreshProfile(session.user.email);
           }
           // Exibir modal de completar perfil se necessário (exceto admins)
           if (
             profile.role !== UserRole.MASTER_ADMIN &&
             profile.role !== UserRole.CHURCH_ADMIN &&
             profile.firstAccessCompleted === false &&
             !sessionStorage.getItem('profile_modal_dismissed')
           ) {
             setShowCompleteProfileModal(true);
           }
        }
        profileResolvedRef.current = true;
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        const updated = session?.user?.user_metadata?.profile;
        if (updated) setCurrentUser(updated);
      } else if (event === 'SIGNED_OUT') {
        profileResolvedRef.current = false;
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [resolveProfile]);

  useEffect(() => {
    if (currentUser?.churchId) {
      loadPendingCount();
    }
  }, [currentUser?.churchId]);

  const loadPendingCount = async () => {
    if (!currentUser?.churchId) return;
    try {
      const { count, error } = await supabase
        .from('prayers')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', currentUser.churchId)
        .eq('status', PrayerStatus.PENDING);

      if (!error) setPendingPrayersCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar total de pendentes:', error);
    }
  };  useEffect(() => {
    if (!currentUser?.churchId) return;

    const subscription = prayerService.subscribeToPrayers((payload) => {
      console.log('Realtime Evento Global (Badge/Som):', payload.eventType);

      if (payload.eventType === 'INSERT') {
        // Tocar som em qualquer lugar da aplicação
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Erro ao tocar som no App:', e));
        }
      }

      loadPendingCount();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.churchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/prayer/new/:slug" element={<PrayerForm />} />
          <Route path="/prayer-screen/:slug" element={<PrayerScreen />} />
          <Route path="/cadastro/:slug" element={<PublicRegistration />} />
          {/* Fallbacks sem slug para compatibilidade temporária */}
          <Route path="/prayer/new" element={<PrayerForm />} />
          <Route path="/prayer-screen" element={<PrayerScreen />} />
          <Route path="/cadastro" element={<PublicRegistration />} />
          {/* Rotas públicas de Eventos Pagos */}
          <Route path="/evento/:slug" element={<PaidEventPublicPage />} />
          <Route path="/evento/:slug/inscricao" element={<PaidEventRegistrationForm />} />

          <Route path="/app/*" element={
            <ProtectedRoute user={currentUser} loading={loading}>
              <ChurchProvider user={currentUser}>
                <div className="min-h-screen bg-zinc-950 flex">
                  {/* Modal de completar perfil — primeiro acesso */}
                  {showCompleteProfileModal && (
                    <CompleteProfileModal
                      userName={currentUser?.name}
                      onDismiss={() => setShowCompleteProfileModal(false)}
                    />
                  )}
                  <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} user={currentUser} />
                  <main className="flex-1 lg:ml-72 flex flex-col min-h-screen">
                    <Header user={currentUser} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} notificationsCount={pendingPrayersCount} />
                    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full">
                      <Routes>
                        <Route path="/" element={<Dashboard user={currentUser} />} />

                        {/* Rotas Administrativas de Igreja */}
                        {(currentUser?.role === UserRole.MASTER_ADMIN || currentUser?.role === UserRole.CHURCH_ADMIN || currentUser?.role === UserRole.PASTOR) && (
                          <>
                            <Route path="/members" element={<Members user={currentUser} />} />
                            <Route path="/prayer-moderation" element={<PrayerModeration user={currentUser} />} />
                          </>
                        )}

                      {/* Rotas de Célula (Líderes, Pastores e Admins) */}
                      {currentUser?.role !== UserRole.MEMBER_VISITOR && (
                        <>
                          <Route path="/cells" element={<Cells user={currentUser} />} />
                          <Route path="/ladder" element={<SuccessLadder user={currentUser} />} />
                          <Route path="/m12-config" element={<Dashboard user={currentUser} activeTab="m12-config" />} />
                          <Route path="/ia-insights" element={<IAInsights user={currentUser} />} />
                        </>
                      )}

                      {/* Rotas Financeiras e Configurações (Apenas Admins, Pastores e Master) */}
                      {(currentUser?.role === UserRole.MASTER_ADMIN || currentUser?.role === UserRole.CHURCH_ADMIN || currentUser?.role === UserRole.PASTOR) && (
                        <Route path="/finance" element={<Finance user={currentUser} />} />
                      )}

                      {/* Rotas de Master Admin (SaaS Global) */}
                        {currentUser?.role === UserRole.MASTER_ADMIN && (
                          <>
                            <Route path="/churches" element={<ChurchesManager />} />
                            <Route path="/admins" element={<AdminsManager />} />
                            <Route path="/plans" element={<PlansManager />} />
                            <Route path="/security" element={<SecurityAudit />} />
                          </>
                        )}

                      <Route path="/settings" element={
                        currentUser?.role === 'MASTER ADMIN'
                          ? <SaaSSettings user={currentUser} />
                          : <Settings user={currentUser} />
                      } />
                      <Route path="/events" element={<Events user={currentUser} />} />
                      {/* Rota de Eventos Pagos (Pastor/Admin) */}
                      {(currentUser?.role === UserRole.MASTER_ADMIN || currentUser?.role === UserRole.CHURCH_ADMIN || currentUser?.role === UserRole.PASTOR) && (
                        <Route path="/paid-events" element={<PaidEventsManager user={currentUser} />} />
                      )}

                        {/* Rotas de Membro/Líder */}
                        <Route path="/my-activities" element={<MyM12Activities user={currentUser} />} />
                        <Route path="/prayer-request-new" element={<Dashboard user={currentUser} activeTab="prayer-request-new" />} />

                        {currentUser?.role === UserRole.MEMBER_VISITOR && (
                        <>
                          <Route path="/my-progress" element={<Dashboard user={currentUser} activeTab="PROGRESS" />} />
                          <Route path="/my-cell-detail" element={<Dashboard user={currentUser} activeTab="CELL" />} />
                          <Route path="/my-prayers" element={<Dashboard user={currentUser} activeTab="PRAYERS" />} />
                        </>
                      )}

                      {/* Fallback para Dashboard se tentar acessar algo não permitido */}
                      </Routes>
                    </div>
                  </main>
                  {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
                </div>
              </ChurchProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
    </Router>
  );
};

export default App;
