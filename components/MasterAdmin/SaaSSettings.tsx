import React, { useState } from 'react';
import { User, Mail, CreditCard, Palette } from 'lucide-react';
import PageHeader from '../Shared/PageHeader';
import SaaSProfileTab from './SaaSProfileTab';
import SaaSEmailTab from './SaaSEmailTab';
import SaaSPaymentTab from './SaaSPaymentTab';
import SaaSThemeTab from './SaaSThemeTab';
import SaaSAITab from './SaAITab';
import { Sparkles } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Meu Perfil', icon: <User size={18} /> },
  { id: 'email', label: 'Email', icon: <Mail size={18} /> },
  { id: 'payments', label: 'Mercado Pago', icon: <CreditCard size={18} /> },
  { id: 'ia', label: 'IA (Células)', icon: <Sparkles size={18} /> },
  { id: 'theme', label: 'Tema do Site', icon: <Palette size={18} /> },
];

const SaaSSettings: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <PageHeader title="Configurações SaaS" subtitle="Gerencie perfil, integrações e identidade visual." />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 space-y-1.5 shrink-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:bg-white/5'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-zinc-900 rounded-[3rem] border border-white/5 p-6 md:p-10 shadow-2xl">
          {activeTab === 'profile' && <SaaSProfileTab user={user} />}
          {activeTab === 'email' && <SaaSEmailTab />}
          {activeTab === 'payments' && <SaaSPaymentTab />}
          {activeTab === 'ia' && <SaaSAITab />}
          {activeTab === 'theme' && <SaaSThemeTab />}
        </div>
      </div>
    </div>
  );
};

export default SaaSSettings;
