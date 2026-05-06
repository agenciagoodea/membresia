
import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Edit,
  Power,
  CreditCard,
  X,
  Save,
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  Loader2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Trash2,
  Users
} from 'lucide-react';
import { ChurchStatus, PlanType, ChurchTenant, Member, UserRole, LadderStage } from '../../types';
import PageHeader from '../Shared/PageHeader';
import { churchService } from '../../services/churchService';
import { memberService } from '../../services/memberService';
import { supabase } from '../../services/supabaseClient';

const ChurchModal = ({ isOpen, onClose, church, onSave }: { isOpen: boolean, onClose: () => void, church?: ChurchTenant | null, onSave: (data: any) => Promise<void> }) => {
  const [loadingCep, setLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    slug: '',
    cnpj: '',
    responsibleName: '',
    email: '',
    phone: '',
    plan: PlanType.BASIC,
    status: ChurchStatus.ACTIVE,
    logo: '',
    adminId: '',
    password: '',
    addressDetails: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  const handleSearchAdmin = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await memberService.search(query);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAdmin = (m: Member) => {
    setFormData({
      ...formData,
      responsibleName: m.name,
      email: m.email || '',
      phone: m.phone || formData.phone,
      adminId: m.id
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  useEffect(() => {
    if (church) {
      setFormData(church);
    } else {
      setFormData({
        name: '',
        slug: '',
        cnpj: '',
        responsibleName: '',
        email: '',
        phone: '',
        plan: PlanType.BASIC,
        status: ChurchStatus.ACTIVE,
        logo: '',
        addressDetails: {
          cep: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: ''
        }
      });
    }
  }, [church, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCepBlur = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev: any) => ({
          ...prev,
          addressDetails: {
            ...prev.addressDetails,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
            cep: cleanCep
          }
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setLoadingCep(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-8 border-b border-white\/5 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">{church ? 'Editar Instância White Label' : 'Novo Cliente SaaS'}</h3>
            <p className="text-sm text-zinc-400 font-medium">Configure a identidade e os parâmetros operacionais da igreja.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-950 rounded-full transition-all border border-transparent hover:border-white\/10 shadow-sm">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <form className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide" onSubmit={(e) => { e.preventDefault(); }}>

          {/* SEÇÃO 1: Identidade & Branding */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
              <div className="w-8 h-px bg-blue-500/30" />
              <span className="flex items-center gap-2"><Building2 size={14} /> Identidade & Branding</span>
              <div className="w-full h-px bg-blue-500/30 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome da Instituição</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                    placeholder="Ex: Igreja Metodista Central"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CNPJ da Instituição</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    value={formData.cnpj}
                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Subdomínio (URL do Sistema)</label>
                <div className="relative flex items-center bg-zinc-900 border border-white/5 rounded-2xl focus-within:border-blue-500 transition-all overflow-hidden group">
                  <div className="pl-4 pr-2 py-4 flex items-center justify-center border-r border-white/5 bg-zinc-950/30">
                    <Globe size={18} className="text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <span className="px-3 text-zinc-500 text-sm font-medium">ecclesia.com/</span>
                  <input
                    required
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                    className="flex-1 bg-transparent border-none outline-none py-4 pr-6 text-sm font-bold text-blue-500"
                    placeholder="igreja-exemplo"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Acesso Administrador */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
              <div className="w-8 h-px bg-emerald-500/30" />
              <span className="flex items-center gap-2"><Users size={14} /> Selecionar Responsável (Admin / Pastor)</span>
              <div className="w-full h-px bg-emerald-500/30 flex-1" />
            </div>

            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">Buscar Administrador Cadastrado</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    value={searchQuery}
                    onChange={e => handleSearchAdmin(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                    placeholder="Digite o nome ou e-mail para selecionar o responsável..."
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-blue-500" size={18} />
                    </div>
                  )}

                  {/* Resultados da Busca */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden max-h-60 overflow-y-auto border border-blue-500/20">
                      {searchResults.map(m => (
                        <button
                          key={m.id}
                          onClick={() => selectAdmin(m)}
                          className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0"
                        >
                          <img 
                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'User')}`; }}
                            className="w-10 h-10 rounded-full object-cover" 
                            alt="" 
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{m.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase">{m.email}</span>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/10">
                                {m.role}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {formData.responsibleName && (
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Responsável Selecionado</p>
                      <p className="text-sm font-bold text-white">{formData.responsibleName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-500 font-bold">{formData.email}</p>
                    <span className="text-[9px] font-black text-emerald-500 uppercase">Vínculo Ativo</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Upload de Logo */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Logotipo Principal</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group border border-dashed border-white/10 rounded-[2rem] h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all overflow-hidden bg-zinc-900"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              {formData.logo ? (
                <>
                  <img src={formData.logo} className="w-full h-full object-contain p-6" alt="Preview" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Upload className="text-white" size={24} />
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Substituir Arquivo</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 flex flex-col items-center group-hover:scale-105 transition-transform">
                  <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center mb-3 border border-white/5 text-zinc-600 group-hover:text-blue-500 transition-colors">
                    <ImageIcon size={28} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Enviar Logotipo</p>
                  <p className="text-[9px] text-zinc-600 mt-1 font-bold">PNG, SVG ou JPG (Máx. 5MB)</p>
                </div>
              )}
            </div>
          </div>
          {/* SEÇÃO 3: Endereço (Automação CEP) */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
              <div className="w-8 h-px bg-blue-500/30" />
              <span className="flex items-center gap-2"><MapPin size={14} /> Localização & Endereço</span>
              <div className="w-full h-px bg-blue-500/30 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 bg-zinc-900/40 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CEP (Busca Automática)</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    required
                    maxLength={9}
                    value={formData.addressDetails?.cep}
                    onBlur={(e) => handleCepBlur(e.target.value)}
                    onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, cep: e.target.value } })}
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                    placeholder="00000-000"
                  />
                  {loadingCep && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={18} />}
                </div>
              </div>

              <div className="md:col-span-4 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Logradouro / Rua</label>
                <input
                  required
                  value={formData.addressDetails?.street}
                  onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, street: e.target.value } })}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                  placeholder="Nome da avenida, rua, etc."
                />
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Número</label>
                <input
                  required
                  value={formData.addressDetails?.number}
                  onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, number: e.target.value } })}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium text-center"
                  placeholder="SN"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Bairro</label>
                <input
                  required
                  value={formData.addressDetails?.neighborhood}
                  onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, neighborhood: e.target.value } })}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                  placeholder="Bairro"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cidade</label>
                <input
                  required
                  value={formData.addressDetails?.city}
                  onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, city: e.target.value } })}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                  placeholder="Cidade"
                />
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">UF</label>
                <input
                  required
                  maxLength={2}
                  value={formData.addressDetails?.state}
                  onChange={e => setFormData({ ...formData, addressDetails: { ...formData.addressDetails, state: e.target.value.toUpperCase() } })}
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 px-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold text-center"
                  placeholder="UF"
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO 4: SaaS Config */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 text-orange-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
              <div className="w-8 h-px bg-orange-500/30" />
              <span className="flex items-center gap-2"><CreditCard size={14} /> Configurações de Assinatura & Status</span>
              <div className="w-full h-px bg-orange-500/30 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-10 bg-zinc-950 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <CreditCard size={120} className="text-white" />
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Plano de Acesso</label>
                <select
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value as PlanType })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-blue-500 transition-all font-black appearance-none"
                >
                  <option className="bg-zinc-950" value={PlanType.BASIC}>Basic (Lançamento)</option>
                  <option className="bg-zinc-950" value={PlanType.PRO}>Pro (Crescimento)</option>
                  <option className="bg-zinc-950" value={PlanType.ENTERPRISE}>Enterprise (Denominação)</option>
                </select>
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Status da Instância</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as ChurchStatus })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-blue-500 transition-all font-black appearance-none"
                >
                  <option className="bg-zinc-950" value={ChurchStatus.ACTIVE}>Ativo</option>
                  <option className="bg-zinc-950" value={ChurchStatus.SUSPENDED}>Suspenso (Inadimplência)</option>
                  <option className="bg-zinc-950" value={ChurchStatus.PENDING}>Pendente (Aguardando Configuração)</option>
                </select>
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 flex flex-col md:flex-row gap-4 bg-zinc-900/50 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-950 border border-white/5 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            Cancelar Operação
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Save size={18} />
            {church ? 'Salvar Alterações do Tenant' : 'Ativar Novo Cliente no Ecossistema'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChurchesManager: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<ChurchTenant | null>(null);
  const [churches, setChurches] = useState<ChurchTenant[]>([]);
  const [adminsMap, setAdminsMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async () => {
    try {
      setIsLoading(true);
      const data = await churchService.list();
      setChurches(data);

      const map: Record<string, string> = {};
      for (const church of data) {
        try {
          const members = await memberService.getAll(church.id, undefined, { id: 'master-admin-context', role: UserRole.MASTER_ADMIN });
          const admin = members.find(m => m.role === UserRole.CHURCH_ADMIN);
          if (admin) {
            map[church.id] = admin.name;
          }
        } catch (e) { }
      }
      setAdminsMap(map);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (church: ChurchTenant) => {
    setEditingChurch(church);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
      let savedChurch: ChurchTenant;
      if (editingChurch) {
        savedChurch = await churchService.update(editingChurch.id, formData);
      } else {
        savedChurch = await churchService.create(formData);
      }

      // Vínculo obrigatório com adminId selecionado no fluxo novo
      if (formData.adminId) {
        // Atualizar church_id diretamente no banco (não exposto no type, mas necessário)
        await supabase.from('members').update({ church_id: savedChurch.id }).eq('id', formData.adminId);
        
        // Se houver senha opcional no formulário (removido do UI, mas mantido em alguns fluxos), 
        // poderíamos atualizar aqui. Mas no novo fluxo a senha é gerida no AdminsManager.
      }

      await loadChurches(); // Recarrega do banco real
      setIsModalOpen(false);
    } catch (error) {
      console.error("Falha ao salvar tenant:", error);
      alert("Ocorreu um erro ao salvar o Tenant na Base.");
    }
  };

  const handleAdd = () => {
    setEditingChurch(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Gestão de Clientes White Label"
        subtitle="Administre os tenants do seu ecossistema SaaS."
        actions={
          <>
            <div className="bg-zinc-900 border border-white/5 px-4 md:px-6 py-3 md:py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm backdrop-blur-md text-zinc-400">
              <CheckCircle2 size={16} className="text-blue-500" /> 124 Instâncias Ativas
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all shadow-xl w-full md:w-auto justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              Cadastrar Novo Cliente
            </button>
          </>
        }
      />

      <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="p-8 border-b border-white/5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 bg-zinc-950 px-6 py-3.5 rounded-2xl border border-white/5 flex-1 max-w-md focus-within:ring-2 focus-within:ring-blue-600 transition-all group">
            <Search size={18} className="text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
            <input type="text" placeholder="Buscar por igreja, responsável ou CNPJ..." className="bg-transparent border-none outline-none text-sm w-full font-medium text-zinc-200" />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-zinc-950 px-5 py-3 rounded-2xl border border-white/5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-all">
              <Globe size={16} /> Ver Subdomínios
            </button>
            <button className="flex items-center gap-2 bg-zinc-950 px-5 py-3 rounded-2xl border border-white/5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-white transition-all">
              <CreditCard size={16} /> Faturas em Aberto
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left hidden md:table">
            <thead className="bg-zinc-950/50 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Instituição (Framework White Label)</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-6 py-6 text-center">Plano</th>
                <th className="px-6 py-6 text-center">Uso</th>
                <th className="px-6 py-6">Cidade</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {churches.map((church) => (
                <tr key={church.id} className="hover:bg-zinc-950/50 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden shrink-0 shadow-sm p-1.5 flex items-center justify-center">
                        {church.logo ? (
                          <img src={church.logo} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
                        ) : (
                          <ImageIcon size={24} className="text-white/5" />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold text-zinc-100 mb-0.5">{church.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-500 font-black uppercase tracking-tighter bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded-md italic">
                            ecclesia.com/{church.slug}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-bold">{church.cnpj || 'CNPJ não inf.'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <User size={10} className="text-emerald-500" />
                          {adminsMap[church.id] || 'Sem Resp.'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center text-[10px] font-black uppercase tracking-widest">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${church.status === ChurchStatus.ACTIVE
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : church.status === ChurchStatus.SUSPENDED
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${church.status === ChurchStatus.ACTIVE ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {church.status}
                    </span>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-2xl border ${church.plan === PlanType.ENTERPRISE
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                      : church.plan === PlanType.PRO
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10'
                        : 'bg-zinc-800 text-zinc-400 border-white/5'
                      }`}>
                      {church.plan}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-100">{church.stats.totalMembers}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">MEMBROS</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-100">{church.stats.activeCells}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">CÉLULAS</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                      <MapPin size={16} className="text-rose-500" />
                      {church.addressDetails?.city || 'S. Paulo'}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(church)}
                        className="p-3 text-zinc-400 bg-zinc-800 border border-white/5 rounded-2xl hover:bg-zinc-700 hover:text-white transition-all shadow-sm group/btn"
                        title="Configurar White Label"
                      >
                        <Edit size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button
                        className="p-3 text-zinc-400 bg-zinc-800 border border-white/5 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all shadow-sm group/btn"
                        title="Acessar Dashboard"
                      >
                        <ExternalLink size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button
                        className="p-3 text-zinc-500 bg-zinc-800 border border-white/5 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 transition-all shadow-sm group/btn"
                        title="Gerenciar Status"
                      >
                        <Power size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ChurchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        church={editingChurch}
        onSave={handleSave}
      />
    </div>
  );
};

export default ChurchesManager;
