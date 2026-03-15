
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
  History
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { LadderStage, M12Checkpoint } from '../../types';
import { m12Service } from '../../services/m12Service';
import { MOCK_TENANT } from '../../constants';

const CheckpointManager: React.FC = () => {
  const [activeStage, setActiveStage] = useState<LadderStage>(LadderStage.WIN);
  const [checkpoints, setCheckpoints] = useState<M12Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCheckpoint, setNewCheckpoint] = useState<Partial<M12Checkpoint>>({
    label: '',
    description: '',
    isActive: true,
    isRequired: true,
    dependsOnId: undefined,
    order: 0
  });

  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      const data = await m12Service.getAllCheckpoints(MOCK_TENANT.id);
      setCheckpoints(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading checkpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckpoints();
  }, []);

  const handleSave = async (checkpoint: Partial<M12Checkpoint>) => {
    try {
      const dataToSave = {
        ...checkpoint,
        churchId: MOCK_TENANT.id,
        stage: activeStage
      };
      
      // If it's a new checkpoint, set a proper order
      if (!checkpoint.id) {
        const stageCPs = checkpoints.filter(c => c.stage === activeStage);
        dataToSave.order = stageCPs.length > 0 ? Math.max(...stageCPs.map(c => c.order)) + 1 : 0;
      }

      await m12Service.saveCheckpoint(dataToSave as any);
      setEditingId(null);
      setNewCheckpoint({ label: '', description: '', isActive: true, isRequired: true, dependsOnId: undefined, order: 0 });
      loadCheckpoints();
    } catch (error) {
      console.error('Error saving checkpoint:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este checkpoint?')) return;
    try {
      await m12Service.deleteCheckpoint(id);
      loadCheckpoints();
    } catch (error) {
      console.error('Error deleting checkpoint:', error);
    }
  };

  const handleReorder = async (newOrder: M12Checkpoint[]) => {
    // 1. Local update for immediate feedback
    const otherStages = checkpoints.filter(c => c.stage !== activeStage);
    const updated = [...otherStages, ...newOrder.map((c, i) => ({ ...c, order: i }))];
    setCheckpoints(updated.sort((a, b) => a.order - b.order));

    // 2. Persist order changes
    try {
      await Promise.all(newOrder.map((cp, idx) => 
        m12Service.saveCheckpoint({ ...cp, order: idx } as any)
      ));
    } catch (error) {
      console.error('Error persisting order:', error);
      loadCheckpoints(); // Rollback on error
    }
  };

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const stageCheckpoints = checkpoints.filter(c => c.stage === activeStage).sort((a, b) => a.order - b.order);
    const index = stageCheckpoints.findIndex(c => c.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stageCheckpoints.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const current = stageCheckpoints[index];
    const target = stageCheckpoints[targetIndex];

    // Swap order values
    const currentOrder = current.order;
    const targetOrder = target.order;

    try {
      await Promise.all([
        m12Service.saveCheckpoint({ ...current, order: targetOrder } as any),
        m12Service.saveCheckpoint({ ...target, order: currentOrder } as any)
      ]);
      loadCheckpoints();
    } catch (error) {
      console.error('Error moving order:', error);
    }
  };

  const currentStageCheckpoints = checkpoints.filter(c => c.stage === activeStage).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="bg-zinc-900/50 p-10 rounded-[2.5rem] border border-white/5">
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4 flex items-center gap-4">
          Gerenciar Checkpoints M12
        </h2>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-2xl">
          Personalize as atividades obrigatórias para cada nível da Visão M12. Arraste os itens para reorganizar a ordem de execução.
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
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : currentStageCheckpoints.length === 0 ? (
            <div className="bg-zinc-900/50 p-12 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-zinc-700 mb-4" />
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Nenhum checkpoint definido para este nível</p>
              <p className="text-xs text-zinc-600 mt-2">Use o formulário ao lado para adicionar o primeiro.</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={currentStageCheckpoints} 
              onReorder={handleReorder}
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {currentStageCheckpoints.map((cp) => (
                  <Reorder.Item
                    key={cp.id}
                    value={cp}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col gap-1">
                        <GripVertical className="text-zinc-700 group-hover:text-blue-500 transition-colors" size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{cp.label}</h4>
                          {cp.isRequired && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md font-black uppercase tracking-widest">
                              Obrigatório
                            </span>
                          )}
                          {cp.dependsOnId && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                              <History size={8} /> Link
                            </span>
                          )}
                        </div>
                        {cp.description && <p className="text-xs text-zinc-500 mt-1">{cp.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingId(cp.id); }}
                        className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-700 transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(cp.id); }}
                        className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>

        <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] h-fit sticky top-6">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
            <PlusCircle size={20} className="text-blue-500" />
            {editingId ? 'Editar Checkpoint' : 'Novo Checkpoint'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Nome da Atividade</label>
              <input
                type="text"
                value={editingId ? checkpoints.find(c => c.id === editingId)?.label : newCheckpoint.label}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editingId) {
                    setCheckpoints(prev => prev.map(c => c.id === editingId ? { ...c, label: val } : c));
                  } else {
                    setNewCheckpoint(prev => ({ ...prev, label: val }));
                  }
                }}
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                placeholder="Ex: Encontro com Deus"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Descrição (Opcional)</label>
              <textarea
                value={editingId ? checkpoints.find(c => c.id === editingId)?.description : newCheckpoint.description}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editingId) {
                    setCheckpoints(prev => prev.map(c => c.id === editingId ? { ...c, description: val } : c));
                  } else {
                    setNewCheckpoint(prev => ({ ...prev, description: val }));
                  }
                }}
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all h-24 resize-none"
                placeholder="Breve descrição da atividade..."
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-zinc-950 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  (editingId ? checkpoints.find(c => c.id === editingId)?.isRequired : newCheckpoint.isRequired) 
                    ? 'bg-amber-500/10 text-amber-500' 
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">Obrigatório</p>
                  <p className="text-[10px] text-zinc-500">Impede o avanço de nível</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (editingId) {
                    setCheckpoints(prev => prev.map(c => c.id === editingId ? { ...c, isRequired: !c.isRequired } : c));
                  } else {
                    setNewCheckpoint(prev => ({ ...prev, isRequired: !prev.isRequired }));
                  }
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  (editingId ? checkpoints.find(c => c.id === editingId)?.isRequired : newCheckpoint.isRequired) 
                    ? 'bg-blue-600' 
                    : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  (editingId ? checkpoints.find(c => c.id === editingId)?.isRequired : newCheckpoint.isRequired) 
                    ? 'right-1' 
                    : 'left-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Depende de (Precedente)</label>
              <select
                value={(editingId ? checkpoints.find(c => c.id === editingId)?.dependsOnId : newCheckpoint.dependsOnId) || ''}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  if (editingId) {
                    setCheckpoints(prev => prev.map(c => c.id === editingId ? { ...c, dependsOnId: val } : c));
                  } else {
                    setNewCheckpoint(prev => ({ ...prev, dependsOnId: val }));
                  }
                }}
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Sem dependência</option>
                {checkpoints
                  .filter(c => c.stage === activeStage && c.id !== editingId)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))
                }
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              {editingId && (
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 px-6 py-4 bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                  <X size={16} /> Cancelar
                </button>
              )}
              <button
                onClick={() => handleSave(editingId ? checkpoints.find(c => c.id === editingId)! : newCheckpoint)}
                className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> {editingId ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckpointManager;
