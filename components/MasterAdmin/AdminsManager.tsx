import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Shield, 
  Lock,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { UserRole, Member, LadderStage } from '../../types';
import PageHeader from '../Shared/PageHeader';
import { memberService } from '../../services/memberService';
import { supabase } from '../../services/supabaseClient';

const AdminModal = ({ isOpen, onClose, admin, onSave }: { isOpen: boolean, onClose: () => void, admin?: Member | null, onSave: (data: any) => Promise<void> }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    role: UserRole.CHURCH_ADMIN,
    password: '',
    churchId: ''
  });

  const [churches, setChurches] = useState<any[]>([]);

  useEffect(() => {
    const loadChurches = async () => {
      const { data } = await supabase.from('churches').select('id, name').order('name');
      setChurches(data || []);
    };
    if (isOpen) loadChurches();
  }, [isOpen]);

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role,
        password: '',
        churchId: admin.churchId || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: UserRole.CHURCH_ADMIN,
        password: '',
        churchId: ''
      });
    }
  }, [admin, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">{admin ? 'Editar Administrador' : 'Novo Administrador'}</h3>
            <p className="text-sm text-zinc-400">Gerencie as credenciais de acesso de alto nível.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-all">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome Completo</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              placeholder="Ex: Pr. André Santos"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">E-mail (Login)</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              placeholder="exemplo@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cargo / Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value={UserRole.CHURCH_ADMIN}>Admin Igreja</option>
                <option value={UserRole.PASTOR}>Pastor(a)</option>
                <option value={UserRole.MASTER_ADMIN}>Master Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Senha</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                placeholder={admin ? "Deixe em branco p/ manter" : "Senha inicial"}
              />
            </div>
          </div>

          {(formData.role === UserRole.CHURCH_ADMIN || formData.role === UserRole.PASTOR) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Igreja Vinculada</label>
              <select
                value={formData.churchId}
                onChange={e => setFormData({ ...formData, churchId: e.target.value })}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">Nenhuma Igreja (Admin Global)</option>
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-white/5 bg-zinc-900/50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all">Cancelar</button>
          <button 
            disabled={isSaving}
            onClick={async () => {
              setIsSaving(true);
              try {
                await onSave(formData);
                onClose();
              } catch (e) {
                alert('Erro ao salvar administrador');
              } finally {
                setIsSaving(false);
              }
            }}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Administrador
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminsManager: React.FC = () => {
  const [admins, setAdmins] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .in('role', [UserRole.CHURCH_ADMIN, UserRole.PASTOR, UserRole.MASTER_ADMIN])
        .order('name');
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSave = async (formData: any) => {
    if (editingAdmin) {
      const updates = { ...formData };
      if (!updates.password) delete updates.password;
      await memberService.update(editingAdmin.id, updates);
    } else {
      await memberService.create({
        ...formData,
        joinedDate: new Date().toISOString(),
        stage: LadderStage.SEND
      } as any);
    }
    await loadAdmins();
  };

  const filteredAdmins = admins.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Administradores"
        subtitle="Controle de acesso e permissões de alto nível."
        actions={
          <button 
            onClick={() => { setEditingAdmin(null); setIsModalOpen(true); }}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
          >
            <Plus size={18} /> Novo Usuário Admin
          </button>
        }
      />

      <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden overflow-x-auto">
        <div className="p-8 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-zinc-950/50 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-10 py-6">Usuário</th>
              <th className="px-6 py-6">E-mail</th>
              <th className="px-6 py-6 text-center">Nível</th>
              <th className="px-10 py-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center text-zinc-600 font-black uppercase tracking-widest animate-pulse">Carregando usuários...</td></tr>
            ) : filteredAdmins.map(admin => (
              <tr key={admin.id} className="hover:bg-zinc-950/50 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <img src={admin.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=2563eb&color=fff`} className="w-10 h-10 rounded-full border border-white/10" alt="" />
                    <span className="text-sm font-bold text-white">{admin.name}</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-sm text-zinc-400 font-medium">{admin.email}</td>
                <td className="px-6 py-6 text-center">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                    admin.role === UserRole.MASTER_ADMIN ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingAdmin(admin); setIsModalOpen(true); }} className="p-2 text-zinc-500 hover:text-white transition-all"><Edit size={18} /></button>
                    <button className="p-2 text-zinc-500 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        admin={editingAdmin} 
        onSave={handleSave} 
      />
    </div>
  );
};

export default AdminsManager;
