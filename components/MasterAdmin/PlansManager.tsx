
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Zap,
  Users,
  Layers,
  CheckCircle2,
  Settings,
  Plus,
  DollarSign,
  TrendingUp,
  BarChart3,
  X,
  Save,
  ShieldCheck,
  Crown,
  Trash2,
  Loader2
} from 'lucide-react';
import { planService } from '../../services/planService';
import { saasService } from '../../services/saasService';
import { supabase } from '../../services/supabaseClient';
import PageHeader from '../Shared/PageHeader';

const FEATURE_OPTIONS = [
  { id: 'DASHBOARD', label: 'Painéis Analíticos' },
  { id: 'MEMBERS', label: 'Gestão de Membros' },
  { id: 'CELLS', label: 'Gestão de Células' },
  { id: 'LADDER', label: 'Escada do Sucesso' },
  { id: 'PRAYER_SYSTEM', label: 'Sistema de Orações' },
  { id: 'FINANCE', label: 'Gestão Financeira' },
  { id: 'IA_INSIGHTS', label: 'Inteligência Artificial' },
  { id: 'WHITE_LABEL', label: 'White Label Personalizado' }
];

const PlanModal = ({
  isOpen,
  onClose,
  plan,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  plan?: any | null;
  onSave: (data: any) => Promise<void>;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    price: 0,
    maxMembers: 0,
    maxCells: 0,
    maxLeaders: 0,
    features: [] as string[]
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        maxMembers: plan.maxMembers,
        maxCells: plan.maxCells,
        maxLeaders: plan.maxLeaders,
        features: plan.features || []
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        maxMembers: 100,
        maxCells: 10,
        maxLeaders: 5,
        features: ['DASHBOARD', 'MEMBERS']
      });
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const toggleFeature = (featureId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f: string) => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      alert('Falha ao salvar o SKU.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-950 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-white/10">

        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">{plan ? `Editar SKU: ${plan.name}` : 'Criar Novo Plano SaaS'}</h3>
            <p className="text-sm text-zinc-400 font-medium">Defina limites, preços e funcionalidades do pacote.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-900 rounded-full transition-all border border-transparent hover:border-white/10 shadow-sm">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <form className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide" onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Identificador (SKU)</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black placeholder:text-zinc-700"
                placeholder="Ex: PREMIUM"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Preço Mensal (BRL)</label>
              <div className="relative">
                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-black"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Limite Membros</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="number"
                  value={formData.maxMembers}
                  onChange={e => setFormData({ ...formData, maxMembers: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Limite Células</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="number"
                  value={formData.maxCells}
                  onChange={e => setFormData({ ...formData, maxCells: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Líderes Ativos</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                  type="number"
                  value={formData.maxLeaders}
                  onChange={e => setFormData({ ...formData, maxLeaders: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2 block italic">Funcionalidades Habilitadas</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURE_OPTIONS.map((feature) => (
                <div
                  key={feature.id}
                  onClick={() => toggleFeature(feature.id)}
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${formData.features.includes(feature.id)
                    ? 'bg-blue-600/10 border-blue-500/50 text-white shadow-lg shadow-blue-500\/5'
                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                    } cursor-pointer group`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${formData.features.includes(feature.id) ? 'bg-blue-600 border-blue-600' : 'bg-zinc-950 border-white/10 group-hover:border-zinc-700'
                    }`}>
                    {formData.features.includes(feature.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-bold tracking-tight">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 flex gap-4 bg-zinc-900/50">
          <button type="button" onClick={onClose} className="flex-1 py-4 bg-zinc-950 border border-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={18} />}
            {plan ? 'Salvar SKU Atual' : 'Publicar Novo Plano'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlanCard: React.FC<{ 
  plan: any; 
  onEdit: () => void; 
  onDelete: () => void;
  onTestCheckout: (planId: string) => void;
}> = ({ plan, onEdit, onDelete, onTestCheckout }) => (
  <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 p-10 shadow-2xl hover:bg-zinc-800 transition-all group relative overflow-hidden flex flex-col h-full">
    {plan.name === 'ENTERPRISE' && (
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Crown size={120} className="text-blue-500" />
      </div>
    )}

    <div className="flex justify-between items-start mb-8">
      <div className={`p-4 rounded-3xl ${plan.name === PlanType.ENTERPRISE ? 'bg-indigo-500/10 text-indigo-400' :
        plan.name === PlanType.PRO ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-950 text-zinc-600 border border-white/5'
        }`}>
        {plan.name === PlanType.ENTERPRISE ? <Crown size={32} /> : <Zap size={32} />}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-3 text-zinc-500 hover:text-white rounded-2xl hover:bg-zinc-950 transition-all border border-transparent hover:border-white/10 shadow-sm"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={onDelete}
          className="p-3 text-zinc-500 hover:text-rose-500 rounded-2xl hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 shadow-sm"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>

    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xl font-black text-white tracking-tighter uppercase">{plan.name}</h3>
        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${plan.churchCount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-white/5'}`}>
          {plan.churchCount} {plan.churchCount === 1 ? 'igreja' : 'igrejas'}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">R$ {plan.price}</span>
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">/ mês</span>
      </div>
    </div>

    <div className="space-y-5 mb-10 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          <Users size={16} className="text-blue-500" /> Membros
        </span>
        <span className="text-sm font-black text-white">{plan.maxMembers >= 99999 ? 'ILIMITADO' : plan.maxMembers}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          <Layers size={16} className="text-indigo-500" /> Células
        </span>
        <span className="text-sm font-black text-white">{plan.maxCells >= 9999 ? 'ILIMITADO' : plan.maxCells}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          <ShieldCheck size={16} className="text-emerald-500" /> Líderes
        </span>
        <span className="text-sm font-black text-white">{plan.maxLeaders >= 9999 ? 'ILIMITADO' : plan.maxLeaders}</span>
      </div>
    </div>

    <div className="space-y-3 pt-8 border-t border-white/5">
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Diferenciais Ativos</p>
      {plan.features.slice(0, 5).map((f: string) => (
        <div key={f} className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {f.replace('_', ' ')}
        </div>
      ))}
      {plan.features.length > 5 && (
        <p className="text-[9px] text-zinc-600 font-black uppercase mt-2">+{plan.features.length - 5} recursos inclusos</p>
      )}
    </div>

    <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
      <button 
        onClick={() => onTestCheckout(plan.id)}
        className="flex items-center justify-center gap-2 py-3 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all"
      >
        <CreditCard size={12} /> Testar Checkout
      </button>
      <button className="flex items-center justify-center gap-2 py-3 bg-zinc-950 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-800 transition-all">
        <RefreshCw size={12} /> Sincronizar
      </button>
    </div>
  </div>
);

const PlansManager: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await planService.list();
      setPlans(data);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (formData: any) => {
    try {
      if (formData.id) {
        await planService.update(formData.id, formData);
      } else {
        await planService.create(formData);
      }
      await loadPlans();
    } catch (error) {
      throw error;
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este SKU? Esta ação não pode ser desfeita.')) return;

    try {
      await planService.delete(id);
      await loadPlans();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      alert('Não foi possível excluir o plano.');
    }
  };

  const handleTestCheckout = async (planId: string) => {
    try {
      // Buscar a primeira igreja para teste
      const { data: churches } = await supabase.from('churches').select('id').limit(1);
      if (!churches || churches.length === 0) {
        alert('Nenhuma igreja encontrada para testar o checkout.');
        return;
      }

      const checkout = await saasService.createCheckout(planId, churches[0].id);
      if (checkout?.init_point) {
        window.open(checkout.init_point, '_blank');
      }
    } catch (err: any) {
      console.error('Erro ao criar checkout:', err);
      alert('Erro ao gerar link de pagamento: ' + err.message);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <PageHeader
        title="Planos & Assinaturas"
        subtitle="Defina a precificação e os limites técnicos do ecossistema SaaS."
        actions={
          <button
            onClick={handleAddPlan}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Criar Novo SKU
          </button>
        }
      />

      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={100} className="text-emerald-500" /></div>
          <div className="flex justify-between items-start mb-10">
            <div className="p-4 bg-emerald-500/10 rounded-2xl shadow-lg border border-emerald-500/10">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full font-black tracking-widest uppercase">+12% vs m.a.</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">MRR ATUAL GLOBAL</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">R$ 42.500</h3>
          </div>
        </div>

        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 size={100} className="text-blue-500" /></div>
          <div className="flex justify-between items-start mb-10">
            <div className="p-4 bg-blue-500/10 rounded-2xl shadow-lg border border-blue-500/10">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full font-black tracking-widest uppercase">OTIMIZAR</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">CONVERSÃO SAAS</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">24.5%</h3>
          </div>
        </div>

        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100} className="text-indigo-500" /></div>
          <div className="flex justify-between items-start mb-10">
            <div className="p-4 bg-indigo-500/10 rounded-2xl shadow-lg border border-indigo-500/10">
              <Zap className="text-indigo-400" size={24} />
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full font-black tracking-widest uppercase">124 ATIVAS</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">DISTRIBUIÇÃO PRO</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">84% adesão</h3>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] animate-pulse">Sincronizando SKUs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => handleEditPlan(plan)}
              onDelete={() => handleDeletePlan(plan.id)}
              onTestCheckout={handleTestCheckout}
            />
          ))}

          {/* Add New Plan Placeholder */}
          <div
            onClick={handleAddPlan}
            className="group cursor-pointer bg-zinc-950 border-2 border-dashed border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-zinc-700 hover:text-blue-500 min-h-[500px]"
          >
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/50 shadow-2xl transition-all">
              <Plus size={32} className="group-hover:rotate-90 transition-transform" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Adicionar Novo SKU</p>
          </div>
        </div>
      )}

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={editingPlan}
        onSave={handleSavePlan}
      />
    </div>
  );
};

export default PlansManager;

