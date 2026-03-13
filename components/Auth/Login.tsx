import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { authService } from '../../services/authService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const response = await authService.signIn(trimmedEmail, password);
      console.log('Login realizado:', response);
      if (!response.profile) {
          // Se autenticou mas não tem perfil de membro, talvez seja um erro de cadastro
          setError('Usuário autenticado, mas perfil de membro não encontrado.');
          setLoading(false);
          return;
      }
      navigate('/app');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-blue-500/30">
      {/* Background Decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-10 group cursor-default">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
            <span className="text-white font-black text-4xl">E</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
            Ecclesia<span className="text-blue-500">.</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Portal de Membresia & Gestão</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden relative group">
          {/* Luz de destaque no hover */}
          <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-radial from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-zinc-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Senha</label>
                <button type="button" className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors">Esqueceu?</button>
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-zinc-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse outline outline-4 outline-rose-500/20" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] group/btn"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <LogIn size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  ENTRAR NO SISTEMA
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Acesso Seguro</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Experiência VIP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-10 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
          &copy; 2024 Ecclesia Black Edition <span className="mx-2">•</span> Desenvolvido com <Heart className="inline text-rose-600" size={10} /> pela Agência Goodea
        </p>
      </div>
    </div>
  );
};

export default Login;
