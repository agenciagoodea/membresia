import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, AlertCircle, CheckCircle2, Send, HelpCircle, Sparkles, Server, ShieldCheck, Key } from 'lucide-react';
import { smtpService, SMTPSettings as SMTPSettingsType } from '../services/smtpService';
import { useChurch } from '../contexts/ChurchContext';

interface Props {
  churchId?: string;
  churchName?: string;
}

const SMTPSettings: React.FC<Props> = ({ churchId: propChurchId, churchName: propChurchName }) => {
  const { church } = useChurch();
  const effectiveChurchId = propChurchId || church?.id || '';
  const effectiveChurchName = propChurchName || church?.name || '';

  const [settings, setSettings] = useState<SMTPSettingsType>({
    church_id: effectiveChurchId,
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
    email_from_name: effectiveChurchName,
    email_from_address: '',
    status: 'ativo'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeGuide, setActiveGuide] = useState<'gmail' | 'hostgator' | 'titan' | null>('gmail');

  useEffect(() => {
    if (!effectiveChurchId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await smtpService.getSettings(effectiveChurchId);
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            smtp_password: '' // Não exibe a senha salva
          }));
        } else if (effectiveChurchName) {
          setSettings(prev => ({
            ...prev,
            email_from_name: effectiveChurchName,
            church_id: effectiveChurchId
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar configurações SMTP:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveChurchId, effectiveChurchName]);

  const handleApplyPreset = (preset: 'gmail' | 'hostgator' | 'titan') => {
    if (preset === 'gmail') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_secure: true
      }));
      setActiveGuide('gmail');
    } else if (preset === 'hostgator') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'mail.seudominio.com',
        smtp_port: 465,
        smtp_secure: true
      }));
      setActiveGuide('hostgator');
    } else if (preset === 'titan') {
      setSettings(prev => ({
        ...prev,
        smtp_host: 'smtp.titan.email',
        smtp_port: 465,
        smtp_secure: true
      }));
      setActiveGuide('titan');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveChurchId) {
      setMessage({ type: 'error', text: 'Identificador da igreja não encontrado.' });
      return;
    }
    
    try {
      setSaving(true);
      setMessage(null);
      await smtpService.saveSettings({ ...settings, church_id: effectiveChurchId });
      setMessage({ type: 'success', text: 'Configurações de SMTP salvas com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações de SMTP.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Informe um e-mail de destino para o teste.' });
      return;
    }
    if (!effectiveChurchId) return;

    try {
      setTesting(true);
      setMessage(null);
      await smtpService.testConnection(effectiveChurchId, testEmail);
      setMessage({ type: 'success', text: `E-mail de teste enviado para ${testEmail}! Verifique sua caixa de entrada e spam.` });
      setSettings(prev => ({ ...prev, last_test_at: new Date().toISOString() }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Falha ao enviar e-mail de teste. Verifique suas credenciais SMTP.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-violet-500" size={32} />
        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Carregando configurações SMTP...</p>
      </div>
    );
  }

  const inputClass = "w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-zinc-600";
  const labelClass = "text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
            <Mail size={26} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Servidor de E-mail (SMTP)</h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Configure o provedor de e-mail da igreja para envio automático de confirmação de inscrição e pagamentos.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            settings.status === 'ativo'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-500 border-white/5'
          }`}>
            {settings.status === 'ativo' ? '● Envio Ativo' : '○ Envio Inativo'}
          </span>
        </div>
      </div>

      {/* Alerta de Mensagem */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in fade-in ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      {/* Botões de Preenchimento Rápido (Presets) */}
      <div className="bg-zinc-950/70 p-5 rounded-3xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
          <Sparkles size={14} className="text-violet-400" />
          Preenchimento Rápido com Provedor Homologado:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('gmail')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              settings.smtp_host === 'smtp.gmail.com'
                ? 'bg-violet-600/20 border-violet-500 text-white'
                : 'bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-850'
            }`}
          >
            <p className="text-xs font-black uppercase">Google / Gmail</p>
            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">smtp.gmail.com (Porta 465)</p>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('hostgator')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              settings.smtp_host.includes('mail.')
                ? 'bg-violet-600/20 border-violet-500 text-white'
                : 'bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-850'
            }`}
          >
            <p className="text-xs font-black uppercase">HostGator / cPanel</p>
            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">mail.seudominio.com (Porta 465)</p>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('titan')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              settings.smtp_host.includes('titan')
                ? 'bg-violet-600/20 border-violet-500 text-white'
                : 'bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-850'
            }`}
          >
            <p className="text-xs font-black uppercase">Titan / Locaweb</p>
            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">smtp.titan.email (Porta 465)</p>
          </button>
        </div>
      </div>

      {/* Formulário de Configuração */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Servidor SMTP (Host) *</label>
            <input
              required
              value={settings.smtp_host}
              onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
              className={inputClass}
              placeholder="ex: smtp.gmail.com ou mail.suaigreja.com"
            />
          </div>

          <div>
            <label className={labelClass}>Porta SMTP *</label>
            <input
              required
              type="number"
              value={settings.smtp_port}
              onChange={e => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 465 })}
              className={inputClass}
              placeholder="ex: 465 (SSL) ou 587 (TLS)"
            />
          </div>
          
          <div>
            <label className={labelClass}>Usuário / E-mail de Conexão *</label>
            <input
              required
              value={settings.smtp_user}
              onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
              className={inputClass}
              placeholder="ex: contato@suaigreja.com ou seuemail@gmail.com"
            />
          </div>

          <div>
            <label className={labelClass}>
              Senha SMTP {settings.id ? '(Deixe em branco para manter a atual)' : '*'}
            </label>
            <input
              required={!settings.id}
              type="password"
              value={settings.smtp_password || ''}
              onChange={e => setSettings({ ...settings, smtp_password: e.target.value })}
              className={inputClass}
              placeholder="••••••••••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>Nome do Remetente (Como aparece para o inscrito) *</label>
            <input
              required
              value={settings.email_from_name}
              onChange={e => setSettings({ ...settings, email_from_name: e.target.value })}
              className={inputClass}
              placeholder="ex: MIR Centro Sul ou Igreja Central"
            />
          </div>

          <div>
            <label className={labelClass}>E-mail de Envio (From Address) *</label>
            <input
              required
              type="email"
              value={settings.email_from_address}
              onChange={e => setSettings({ ...settings, email_from_address: e.target.value })}
              className={inputClass}
              placeholder="ex: contato@suaigreja.com"
            />
          </div>
        </div>

        {/* Opções de Segurança e Ativação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-zinc-950 border border-white/5 rounded-3xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.smtp_secure}
              onChange={e => setSettings({ ...settings, smtp_secure: e.target.checked })}
              className="w-5 h-5 accent-violet-600 rounded-lg"
            />
            <div>
              <span className="text-xs font-black uppercase text-white block">Usar Conexão Segura (SSL/TLS)</span>
              <span className="text-[10px] text-zinc-500 font-bold block">Recomendado com Porta 465</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.status === 'ativo'}
              onChange={e => setSettings({ ...settings, status: e.target.checked ? 'ativo' : 'inativo' })}
              className="w-5 h-5 accent-emerald-600 rounded-lg"
            />
            <div>
              <span className="text-xs font-black uppercase text-white block">Ativar Envio Automático</span>
              <span className="text-[10px] text-zinc-500 font-bold block">Dispara e-mail a cada inscrição ou confirmação</span>
            </div>
          </label>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-violet-600/30 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>{saving ? 'Salvando...' : 'Salvar Configurações SMTP'}</span>
          </button>
        </div>
      </form>

      {/* Bloco de Teste de Conexão */}
      <div className="bg-zinc-950 p-6 md:p-8 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Send size={16} className="text-violet-400" />
            Testar Conexão de E-mail
          </h3>
          {settings.last_test_at && (
            <span className="text-[10px] text-zinc-500 font-bold">
              Último teste: {new Date(settings.last_test_at).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 font-medium">
          Envie uma mensagem de teste para verificar se o servidor SMTP está comunicando com sucesso e entregando na caixa de entrada.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="email" 
            value={testEmail} 
            onChange={e => setTestEmail(e.target.value)} 
            className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-violet-500" 
            placeholder="Digite seu e-mail para receber o teste..." 
          />
          <button 
            type="button"
            onClick={handleTest}
            disabled={testing || !testEmail} 
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 border border-white/10"
          >
            {testing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
            <span>{testing ? 'Enviando...' : 'Enviar Teste'}</span>
          </button>
        </div>
      </div>

      {/* Guia Explicativo Passo a Passo de Como Configurar */}
      <div className="bg-zinc-950/80 p-6 md:p-8 rounded-3xl border border-white/5 space-y-6">
        <div className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-widest">
          <HelpCircle size={18} className="text-violet-400" />
          Como Configurar o SMTP (Guia Passo a Passo)
        </div>

        {/* Abas dos Guias */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveGuide('gmail')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeGuide === 'gmail' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Google / Gmail
          </button>
          <button
            type="button"
            onClick={() => setActiveGuide('hostgator')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeGuide === 'hostgator' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            HostGator / cPanel
          </button>
          <button
            type="button"
            onClick={() => setActiveGuide('titan')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeGuide === 'titan' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Titan / Locaweb
          </button>
        </div>

        {/* Conteúdo do Guia Selecionado */}
        {activeGuide === 'gmail' && (
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-2xl border border-white/5">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Key size={16} className="text-amber-400" />
              Configuração com Gmail (Requer Senha de App do Google):
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-300 font-medium">
              <li>Acesse a sua conta Google em <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-violet-400 underline font-bold">myaccount.google.com/security</a>.</li>
              <li>Ative a <strong>Verificação em duas etapas</strong> (se ainda não estiver ativada).</li>
              <li>No campo de busca no topo da página de segurança, digite <strong>"Senhas de app"</strong> e selecione a opção.</li>
              <li>Crie um nome para a senha (ex: <em>Ecclesia E-mails</em>) e clique em <strong>Criar</strong>.</li>
              <li>O Google gerará uma senha de <strong>16 letras</strong>. Copie e cole essa senha no campo <strong>Senha SMTP</strong> acima.</li>
              <li>Preencha o Host com <code className="bg-zinc-800 px-2 py-0.5 rounded text-amber-300 font-mono">smtp.gmail.com</code>, Porta <code className="bg-zinc-800 px-2 py-0.5 rounded text-amber-300 font-mono">465</code> e marque <strong>Usar SSL/TLS</strong>.</li>
            </ol>
          </div>
        )}

        {activeGuide === 'hostgator' && (
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-2xl border border-white/5">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Server size={16} className="text-blue-400" />
              Configuração com HostGator ou cPanel:
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-300 font-medium">
              <li>Acesse o <strong>cPanel</strong> da sua hospedagem e vá em <strong>Contas de E-mail</strong>.</li>
              <li>Crie ou selecione uma conta (ex: <code className="bg-zinc-800 px-2 py-0.5 rounded text-blue-300 font-mono">contato@seudominio.com</code>).</li>
              <li>Clique em <strong>Conectar Dispositivos</strong> ou veja os dados de configuração segura (SSL/TLS).</li>
              <li>O Servidor de Saída (Host) geralmente é <code className="bg-zinc-800 px-2 py-0.5 rounded text-blue-300 font-mono">mail.seudominio.com</code>.</li>
              <li>A Porta de saída com SSL é <code className="bg-zinc-800 px-2 py-0.5 rounded text-blue-300 font-mono">465</code>.</li>
              <li>O Usuário é o endereço de e-mail completo e a Senha é a mesma definida na criação da conta de e-mail.</li>
            </ol>
          </div>
        )}

        {activeGuide === 'titan' && (
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-5 rounded-2xl border border-white/5">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              Configuração com Titan Email ou Locaweb:
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-zinc-300 font-medium">
              <li>Servidor SMTP: <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-300 font-mono">smtp.titan.email</code></li>
              <li>Porta SMTP: <code className="bg-zinc-800 px-2 py-0.5 rounded text-emerald-300 font-mono">465</code> (com SSL ativado).</li>
              <li>Usuário: Seu e-mail profissional completo cadastrado no Titan.</li>
              <li>Senha: A senha da sua caixa postal Titan.</li>
            </ol>
          </div>
        )}
      </div>

    </div>
  );
};

export default SMTPSettings;
