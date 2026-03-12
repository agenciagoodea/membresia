
import React, { useState } from 'react';
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
  User,
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
  MEMBER_NAV_ITEMS,
  MOCK_TENANT,
  MOCK_CURRENT_USER
} from './constants';
import { UserRole } from './types';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import Cells from './components/Cells';
import Finance from './components/Finance';
import IAInsights from './components/IAInsights';
import SuccessLadder from './components/Ladder/SuccessLadder';
import ChurchesManager from './components/MasterAdmin/ChurchesManager';
import PlansManager from './components/MasterAdmin/PlansManager';
import SecurityAudit from './components/MasterAdmin/SecurityAudit';
import LandingPageSettings from './components/MasterAdmin/LandingPageSettings';
import PrayerForm from './components/Prayer/PrayerForm';
import PrayerScreen from './components/Prayer/PrayerScreen';
import PrayerModeration from './components/Prayer/PrayerModeration';
import LandingPage from './components/Marketing/LandingPage';
import Settings from './components/Settings';

const RoleSwitcher = ({ currentRole, onSwitch }: { currentRole: UserRole, onSwitch: (role: UserRole) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const roles = [
    { role: UserRole.MASTER_ADMIN, label: 'Master Admin', icon: <ShieldAlert size={14} /> },
    { role: UserRole.CHURCH_ADMIN, label: 'Admin Igreja', icon: <SettingsIcon size={14} /> },
    { role: UserRole.PASTOR, label: 'Pastor', icon: <UserCog size={14} /> },
    { role: UserRole.CELL_LEADER_DISCIPLE, label: 'Líder Célula', icon: <Users size={14} /> },
    { role: UserRole.MEMBER_VISITOR, label: 'Visitante / Demo', icon: <User size={14} /> },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen && (
        <div className="mb-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-2 min-w-[260px] animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 py-3 border-b border-white/5 mb-1 tracking-widest">Simulação de Perfil</p>
          <div className="space-y-1">
            {roles.map((r) => (
              <button
                key={r.role}
                onClick={() => { onSwitch(r.role); setIsOpen(false); navigate('/app'); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${currentRole === r.role ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                {r.icon}
                {r.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-white/5 my-3 mx-2" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase px-4 py-2 tracking-widest">Páginas de Demonstração</p>
          <button
            onClick={() => { navigate('/prayer/new'); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <Heart size={14} /> Form de Oração
          </button>
          <button
            onClick={() => { navigate('/prayer-screen'); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-all"
          >
            <Monitor size={14} /> Telão de Clamor
          </button>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-zinc-100 text-zinc-950 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
      >
        {isOpen ? <X size={24} /> : <UserCog size={24} />}
      </button>
    </div>
  );
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
    { label: 'Enviar Oração', icon: <Plus size={16} />, path: '/prayer/new' },
    { label: 'Abrir Telão', icon: <Monitor size={16} />, path: '/prayer-screen' },
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
    case UserRole.MEMBER_VISITOR: navItems = MEMBER_NAV_ITEMS; break;
    default: navItems = MEMBER_NAV_ITEMS;
  }

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
            if (item.id === 'prayer-request-new') path = '/prayer/new';
            else if (item.id === 'prayer-screen-demo' || item.id === 'prayer-screen-link') path = '/prayer-screen';
            else if (item.id === 'settings' || item.id === 'profile' || item.id === 'master-settings') path = '/app/settings';
            else if (item.id !== 'dashboard' && item.id !== 'master-dashboard') path = `/app/${item.id}`;

            const isActive = location.pathname === path;

            return (
              <Link
                key={item.id}
                to={path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-zinc-500 transition-colors'}>{item.icon}</span>
                  {item.label}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <div onClick={() => navigate('/')} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-500/10 cursor-pointer transition-all group text-zinc-400 hover:text-rose-400">
            <LogOut size={20} />
            <span className="text-sm font-bold">Encerrar Sessão</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-950 border border-white/5 shadow-inner">
            <img src={user.avatar} className="w-11 h-11 rounded-2xl ring-2 ring-white/10 shadow-lg object-cover" alt="" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-white truncate uppercase tracking-tight">{user.name}</p>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ user, onMenuToggle }: { user: any, onMenuToggle: () => void }) => (
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
      <button className="relative p-2.5 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
        <Bell size={22} />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-zinc-950 shadow-lg shadow-blue-500/50"></span>
      </button>
      <div className="h-8 w-px bg-white/5"></div>
      <QuickActionsMenu user={user} />
    </div>
  </header>
);

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(MOCK_CURRENT_USER);

  const switchRole = (role: UserRole) => {
    setCurrentUser({ ...currentUser, role: role, name: role.toString(), avatar: `https://i.pravatar.cc/150?u=${role}` });
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/prayer/new" element={<PrayerForm />} />
        <Route path="/prayer-screen" element={<PrayerScreen />} />

        <Route path="/app/*" element={
          <div className="min-h-screen bg-zinc-950 flex">
            <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} user={currentUser} />
            <main className="flex-1 lg:ml-72 flex flex-col min-h-screen">
              <Header user={currentUser} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
              <div className="p-8 md:p-12 max-w-7xl mx-auto w-full">
                <Routes>
                  <Route path="/" element={<Dashboard user={currentUser} />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/cells" element={<Cells />} />
                  <Route path="/ladder" element={<SuccessLadder />} />
                  <Route path="/prayer-moderation" element={<PrayerModeration />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/ia-insights" element={<IAInsights />} />
                  <Route path="/churches" element={<ChurchesManager />} />
                  <Route path="/plans" element={<PlansManager />} />
                  <Route path="/security" element={<SecurityAudit />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <RoleSwitcher currentRole={currentUser.role} onSwitch={switchRole} />
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;
