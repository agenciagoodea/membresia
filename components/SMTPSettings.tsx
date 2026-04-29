import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { smtpService, SMTPSettings as SMTPSettingsType } from '../services/smtpService';
import { useChurch } from '../contexts/ChurchContext';

const SMTPSettings: React.FC = () => {
  const { church } = useChurch();
  const [settings, setSettings] = useState<SMTPSettingsType>({
    church_id: church?.id || '',
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
    email_from_name: church?.name || '',
    email_from_address: '',
    status: 'ativo'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!church?.id) return;
    const load = async () => {
      try {
        const data = await smtpService.getSettings(church.id);
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            smtp_password: '' // Don't show password
          }));
        }
      } catch (error) {
        console.error('Error loading SMTP settings', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [church?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!church?.id) return;
    
    try {
      setSaving(true);
      setMessage(null);
      await smtpService.saveSettings({ ...settings, church_id: church.id });
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Informe um e-mail para teste.' });
      return;
    }
    if (!church?.id) return;

    try {
      setTesting(true);
      setMessage(null);
      await smtpService.testConnection(church.id, testEmail);
      setMessage({ type: 'success', text: 'E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.' });
      
      // Update last test visually
      setSettings(prev => ({ ...prev, last_test_at: new Date().toISOString() }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Falha ao enviar e-mail de teste. Verifique suas credenciais.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-violet-500" /></div>;
  }

  const inputClass = "w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-violet-500 transition-all outline-none";
  const labelClass = "text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
          <Mail className="text-violet-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Servidor de E-mail (SMTP)</h2>
          <p className="text-sm text-zinc-400">Configure seu provedor para enviar e-mails de confirmação automáticos.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Servidor SMTP (Host) *</label>
            <input required value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} className={inputClass} placeholder="ex: smtp.hostinger.com" />
          </div>
          <div>
            <label className={labelClass}>Porta SMTP *</label>
            <input required type="number" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: parseInt(e.target.value)})} className={inputClass} placeholder="ex: 465 ou 587" />
          </div>
          
          <div>
            <label className={labelClass}>Usuário / E-mail *</label>
            <input required value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} className={inputClass} placeholder="contato@suaigreja.com" />
          </div>
          <div>
            <label className={labelClass}>Senha SMTP {settings.id ? '(Deixe em branco para manter)' : '*'}</label>
            <input required={!settings.id} type="password" value={settings.smtp_password} onChange={e => setSettings({...settings, smtp_password: e.target.value})} className={inputClass} placeholder="••••••••" />
          </div>

          <div>
            <label className={labelClass}>Nome do Remetente *</label>
            <input required value={settings.email_from_name} onChange={e => setSettings({...settings, email_from_name: e.target.value})} className={inputClass} placeholder="Igreja Videira" />
          </div>
          <div>
            <label className={labelClass}>E-mail do Remetente *</label>
            <input required type="email" value={settings.email_from_address} onChange={e => setSettings({...settings, email_from_address: e.target.value})} className={inputClass} placeholder="contato@suaigreja.com" />
          </div>
        </div>

        <div className="flex items-center gap-6 p-4 bg-zinc-900 border border-white/5 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.smtp_secure} onChange={e => setSettings({...settings, smtp_secure: e.target.checked})} className="w-5 h-5 accent-violet-500 rounded" />
            <span className="text-sm font-bold text-white">Usar conexão segura (SSL/TLS)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.status === 'ativo'} onChange={e => setSettings({...settings, status: e.target.checked ? 'ativo' : 'inativo'})} className="w-5 h-5 accent-emerald-500 rounded" />
            <span className="text-sm font-bold text-white">Ativar envio de e-mails</span>
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>

      {settings.id && (
        <div className="mt-12 pt-8 border-t border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Send size={16} className="text-zinc-500" />
            Testar Conexão
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <input 
              type="email" 
              value={testEmail} 
              onChange={e => setTestEmail(e.target.value)} 
              className={inputClass} 
              placeholder="Digite um e-mail para receber o teste..." 
            />
            <button 
              onClick={handleTest}
              disabled={testing || !testEmail} 
              className="whitespace-nowrap flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 border border-white/10"
            >
              {testing ? <RefreshCw className="animate-spin" size={18} /> : 'Enviar Teste'}
            </button>
          </div>
          {settings.last_test_at && (
            <p className="text-xs text-zinc-500 mt-3 font-medium">
              Último teste realizado em: {new Date(settings.last_test_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SMTPSettings;
