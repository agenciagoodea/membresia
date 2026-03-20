import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

interface CompleteProfileModalProps {
  userName?: string;
  onDismiss: () => void;
}

const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ userName, onDismiss }) => {
  const navigate = useNavigate();
  const [dismissing, setDismissing] = useState(false);

  const firstName = userName?.split(' ')[0] || 'Você';

  const steps = [
    { label: 'Dados Pessoais e Endereço', done: false },
    { label: 'Vínculos: Célula e Pastor', done: false },
    { label: 'Atividades M12', done: false },
  ];

  const handleComplete = () => {
    onDismiss();
    navigate('/app/settings');
  };

  const handleDismiss = () => {
    setDismissing(true);
    // Armazenar na sessão para não exibir novamente nesta sessão
    sessionStorage.setItem('profile_modal_dismissed', 'true');
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${dismissing ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-400">
        {/* Glow de fundo */}
        <div className="absolute inset-0 bg-blue-600/10 blur-3xl rounded-full scale-150 pointer-events-none" />

        <div className="relative bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.15)]">
          {/* Header com gradiente */}
          <div className="relative p-8 pb-6 bg-gradient-to-b from-blue-600/10 to-transparent border-b border-white/5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/20 rounded-[1.5rem] flex items-center justify-center shrink-0">
                <User size={26} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">
                  Bem-vindo ao sistema!
                </p>
                <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                  {firstName}, complete<br />seu cadastro
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Para uma experiência completa, finalize suas informações de perfil. São apenas 3 etapas rápidas:
            </p>

            {/* Etapas */}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-white/5"
                >
                  <div className="w-7 h-7 rounded-xl bg-blue-600/10 border border-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-blue-400">{i + 1}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 flex-1">{step.label}</span>
                  <ChevronRight size={14} className="text-zinc-700" />
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2.5"
              >
                <CheckCircle2 size={16} />
                Concluir Cadastro
                <ArrowRight size={14} />
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-3.5 bg-white/5 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-zinc-300 transition-all flex items-center justify-center gap-2"
              >
                <Clock size={14} />
                Lembrar mais tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
