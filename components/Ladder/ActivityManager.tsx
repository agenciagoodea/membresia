
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  X, 
  Edit2, 
  CheckCircle2, 
  AlertCircle,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  History,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Settings2,
  Database,
  Calculator,
  Binary
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LadderStage, M12Activity, UserRole, FormLogicType, DataSource } from '../../types';
import { m12Service } from '../../services/m12Service';

const LOGIC_TYPES: { value: FormLogicType; label: string; icon: any }[] = [
  { value: 'BOOLEAN', label: 'Sim ou Não', icon: <Binary size={14} /> },
  { value: 'STATUS', label: 'Status Progressivo', icon: <History size={14} /> },
  { value: 'SELECT', label: 'Seleção Única', icon: <Settings2 size={14} /> },
  { value: 'MULTI_SELECT', label: 'Múltipla Escolha', icon: <Plus size={14} /> },
  { value: 'TEXT', label: 'Texto / Textarea', icon: <Edit2 size={14} /> },
  { value: 'DATE', label: 'Data', icon: <PlusCircle size={14} /> },
  { value: 'NUMBER', label: 'Número', icon: <PlusCircle size={14} /> },
  { value: 'UPLOAD', label: 'Upload de Arquivo', icon: <PlusCircle size={14} /> },
  { value: 'RELATIONAL', label: 'Relacional (Membros)', icon: <Database size={14} /> },
  { value: 'CALCULATED', label: 'Campo Calculado', icon: <Calculator size={14} /> },
  { value: 'HIDDEN', label: 'Campo Oculto', icon: <EyeOff size={14} /> }
];

const ActivityManager: React.FC<{ user: any }> = ({ user }) => {
  const isAuthorized = user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.MASTER_ADMIN;

  if (!isAuthorized) {
    return (
      <div className="bg-zinc-900/50 p-20 rounded-[2.5rem] border border-white/5 text-center">
        <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Acesso Restrito</h2>
        <p className="text-zinc-500 font-medium">Apenas o Administrador da Igreja pode configurar as atividades do M12.</p>
      </div>
    );
  }
  const [activeStage, setActiveStage] = useState<LadderStage>(LadderStage.WIN);
  const [activities, setActivities] = useState<M12Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<M12Activity>>({
    label: '',
    description: '',
    isActive: true,
    isRequired: true,
    isEditable: true,
    isVisible: true,
    isCalculated: false,
    isMultipleChoice: false,
    dataSource: 'MANUAL',
    logicType: 'BOOLEAN',
    configOptions: [],
    order: 0
  });
  const [newOption, setNewOption] = useState('');

  const loadActivities = async () => {
    try {
      setLoading(true);
      const churchId = user.churchId || user.church_id;
      if (!churchId) {
        setLoading(false);
        return;
      }
      const data = await m12Service.getActivities(churchId);
      setActivities(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleSave = async (activity: Partial<M12Activity>) => {
    try {
      const churchId = user.churchId || user.church_id;
      const dataToSave = {
        ...activity,
        churchId: churchId,
        stage: activeStage
      };
      
      if (!activity.id) {
        const stageActivities = activities.filter(a => a.stage === activeStage);
        dataToSave.order = stageActivities.length > 0 ? Math.max(...stageActivities.map(a => a.order)) + 1 : 0;
      }

      await m12Service.saveActivity(dataToSave as any);
      setEditingId(null);
      setNewActivity({ 
        label: '', 
        description: '', 
        isActive: true, 
        isRequired: true, 
        isEditable: true,
        isVisible: true,
        isCalculated: false,
        isMultipleChoice: false,
        dataSource: 'MANUAL',
        logicType: 'BOOLEAN',
        configOptions: [],
        order: 0
      });
      loadActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    try {
      await m12Service.deleteActivity(id);
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleReorder = async (newOrder: M12Activity[]) => {
    const otherStages = activities.filter(a => a.stage !== activeStage);
    const updated = [...otherStages, ...newOrder.map((a, i) => ({ ...a, order: i }))];
    setActivities(updated.sort((a, b) => a.order - b.order));

    try {
      await m12Service.updateOrders(newOrder.map((a, i) => ({ id: a.id, order: i })));
    } catch (error) {
      console.error('Error persisting order:', error);
      loadActivities();
    }
  };

  const currentStageActivities = activities.filter(a => a.stage === activeStage).sort((a, b) => a.order - b.order);

  const currentEditing = editingId ? activities.find(a => a.id === editingId) : newActivity;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="bg-zinc-900/50 p-10 rounded-[2.5rem] border border-white/5">
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4 flex items-center gap-4">
          Configuração Avançada M12
        </h2>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-2xl">
          Defina como cada atividade deve se comportar. Escolha o tipo de resposta, configure obrigatoriedade, visibilidade condicional e regras de negócio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {Object.values(LadderStage).map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeStage === stage 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : currentStageActivities.length === 0 ? (
            <div className="bg-zinc-900/50 p-12 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-zinc-700 mb-4" />
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Nenhuma atividade definida para este nível</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={currentStageActivities} 
              onReorder={handleReorder}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {currentStageActivities.map((a) => (
                  <Reorder.Item
                    key={a.id}
                    value={a}
                    onClick={() => setEditingId(a.id)}
                    className={`bg-zinc-900 border p-5 rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${
                      editingId === a.id ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="text-zinc-700 group-hover:text-blue-500" size={16} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white uppercase tracking-tight">{a.label}</h4>
                          {!a.isVisible && <EyeOff size={10} className="text-amber-500" />}
                          {!a.isEditable && <Lock size={10} className="text-zinc-500" />}
                        </div>
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                          {LOGIC_TYPES.find(t => t.value === a.logicType)?.label || a.logicType}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                      className="p-2 text-zinc-700 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-white/10 p-10 rounded-[2.5rem] space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Settings2 size={24} className="text-blue-500" />
                {editingId ? 'Editar Configuração' : 'Nova Atividade'}
              </h3>
              {editingId && (
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setNewActivity({
                      label: '', description: '', isActive: true, isRequired: true, isEditable: true, isVisible: true, isCalculated: false, isMultipleChoice: false, dataSource: 'MANUAL', logicType: 'BOOLEAN', configOptions: [], order: 0
                    });
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
                >
                  <Plus size={14} className="inline mr-2" /> Novo Campo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Coluna Esquerda: Básico */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Rótulo (Label)</label>
                  <input
                    type="text"
                    value={currentEditing?.label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, label: val } : a));
                      else setNewActivity(prev => ({ ...prev, label: val }));
                    }}
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                    placeholder="Ex: Encontro com Deus"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Tipo de Resposta (Lógica)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOGIC_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, logicType: type.value } : a));
                          else setNewActivity(prev => ({ ...prev, logicType: type.value }));
                        }}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-bold uppercase tracking-tight transition-all ${
                          currentEditing?.logicType === type.value 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                            : 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/20'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {['SELECT', 'MULTI_SELECT', 'STATUS'].includes(currentEditing?.logicType || '') && (
                  <div className="space-y-4 p-6 bg-zinc-950 rounded-2xl border border-white/5 animate-in fade-in zoom-in-95">
                    <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">Opções do Campo</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!newOption.trim()) return;
                            const options = [...(currentEditing?.configOptions || []), newOption.trim()];
                            if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, configOptions: options } : a));
                            else setNewActivity(prev => ({ ...prev, configOptions: options }));
                            setNewOption('');
                          }
                        }}
                        className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500/30"
                        placeholder="Adicionar opção..."
                      />
                      <button onClick={() => {
                        if (!newOption.trim()) return;
                        const options = [...(currentEditing?.configOptions || []), newOption.trim()];
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, configOptions: options } : a));
                        else setNewActivity(prev => ({ ...prev, configOptions: options }));
                        setNewOption('');
                      }} className="p-3 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentEditing?.configOptions?.map((opt, i) => (
                        <span key={i} className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-bold flex items-center gap-2 border border-white/5">
                          {opt}
                          <button onClick={() => {
                            const options = (currentEditing?.configOptions || []).filter((_, idx) => idx !== i);
                            if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, configOptions: options } : a));
                            else setNewActivity(prev => ({ ...prev, configOptions: options }));
                          }} className="hover:text-rose-500"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Direita: Regras */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Obrigatoriedade</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white uppercase">{currentEditing?.isRequired ? 'Sim' : 'Não'}</span>
                      <button onClick={() => {
                        const val = !currentEditing?.isRequired;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, isRequired: val } : a));
                        else setNewActivity(prev => ({ ...prev, isRequired: val }));
                      }} className={`w-10 h-5 rounded-full relative transition-all ${currentEditing?.isRequired ? 'bg-amber-600' : 'bg-zinc-800'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentEditing?.isRequired ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Visibilidade</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white uppercase">{currentEditing?.isVisible ? 'Sempre' : 'Oculto'}</span>
                      <button onClick={() => {
                        const val = !currentEditing?.isVisible;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, isVisible: val } : a));
                        else setNewActivity(prev => ({ ...prev, isVisible: val }));
                      }} className={`w-10 h-5 rounded-full relative transition-all ${currentEditing?.isVisible ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentEditing?.isVisible ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Editabilidade</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white uppercase">{currentEditing?.isEditable ? 'Liberada' : 'Bloqueada'}</span>
                      <button onClick={() => {
                        const val = !currentEditing?.isEditable;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, isEditable: val } : a));
                        else setNewActivity(prev => ({ ...prev, isEditable: val }));
                      }} className={`w-10 h-5 rounded-full relative transition-all ${currentEditing?.isEditable ? 'bg-emerald-600' : 'bg-rose-900/50'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentEditing?.isEditable ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Calculado</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white uppercase">{currentEditing?.isCalculated ? 'Auto' : 'Manual'}</span>
                      <button onClick={() => {
                        const val = !currentEditing?.isCalculated;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, isCalculated: val, dataSource: val ? 'AUTO' : 'MANUAL' } : a));
                        else setNewActivity(prev => ({ ...prev, isCalculated: val, dataSource: val ? 'AUTO' : 'MANUAL' }));
                      }} className={`w-10 h-5 rounded-full relative transition-all ${currentEditing?.isCalculated ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentEditing?.isCalculated ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Depende de (Precedente)</label>
                    <select
                      value={currentEditing?.dependsOnId || ''}
                      onChange={(e) => {
                        const val = e.target.value || undefined;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, dependsOnId: val } : a));
                        else setNewActivity(prev => ({ ...prev, dependsOnId: val }));
                      }}
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-xs outline-none"
                    >
                      <option value="">Sem dependência</option>
                      {activities.filter(a => a.stage === activeStage && a.id !== editingId).map(a => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  {currentEditing?.dependsOnId && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Regra para Exibir (Condição)</label>
                      <input
                        type="text"
                        value={currentEditing?.logicalCondition || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, logicalCondition: val } : a));
                          else setNewActivity(prev => ({ ...prev, logicalCondition: val }));
                        }}
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-xs outline-none"
                        placeholder="Ex: SIM ou Concluído"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Origem do Dado</label>
                    <select
                      value={currentEditing?.dataSource || 'MANUAL'}
                      onChange={(e) => {
                        const val = e.target.value as DataSource;
                        if (editingId) setActivities(prev => prev.map(a => a.id === editingId ? { ...a, dataSource: val } : a));
                        else setNewActivity(prev => ({ ...prev, dataSource: val }));
                      }}
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-xs outline-none"
                    >
                      <option value="MANUAL">Manual (Membro/Líder)</option>
                      <option value="AUTO">Automático (Sistema)</option>
                      <option value="RELATIONAL">Relacional (Outros Membros)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => handleSave(currentEditing!)}
                className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
              >
                <Save size={18} /> {editingId ? 'Salvar Alterações' : 'Adicionar Atividade'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityManager;
