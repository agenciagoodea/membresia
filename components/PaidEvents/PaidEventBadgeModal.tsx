import React, { useState } from 'react';
import { X, Printer, Loader2, Check, LayoutGrid, Award, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { PaidEvent, PaidEventRegistration } from '../../types';
import { pdfService, BADGE_MODELS, BadgeModelType } from '../../services/pdfService';

interface Props {
  event: PaidEvent;
  registrations: PaidEventRegistration[];
  targetReg?: PaidEventRegistration | null;
  onClose: () => void;
}

const PaidEventBadgeModal: React.FC<Props> = ({
  event,
  registrations,
  targetReg = null,
  onClose,
}) => {
  const [selectedModel, setSelectedModel] = useState<BadgeModelType>('medium_4');
  const [scope, setScope] = useState<'individual' | 'confirmed' | 'all'>(
    targetReg ? 'individual' : 'confirmed'
  );
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const confirmedList = registrations.filter(r => r.payment_status === 'pago_confirmado');
  const allList = registrations;

  const getTargetList = (): PaidEventRegistration[] => {
    if (scope === 'individual' && targetReg) {
      return [targetReg];
    }
    if (scope === 'all') {
      return allList;
    }
    return confirmedList.length > 0 ? confirmedList : allList;
  };

  const currentList = getTargetList();

  const handleGenerate = async () => {
    if (currentList.length === 0) {
      alert('Nenhum inscrito disponível para gerar crachá nesta seleção.');
      return;
    }

    try {
      setGenerating(true);
      setProgress({ current: 0, total: currentList.length });

      await pdfService.generateBadgesByModelPDF(
        event,
        currentList,
        selectedModel,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      // Sucesso
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Erro ao gerar crachás:', error);
      alert('Ocorreu um erro ao gerar o arquivo PDF dos crachás.');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const getModelIcon = (id: BadgeModelType) => {
    switch (id) {
      case 'corporate_10':
        return <CreditCard className="text-blue-400" size={24} />;
      case 'medium_4':
        return <LayoutGrid className="text-violet-400" size={24} />;
      case 'large_2':
        return <Award className="text-amber-400" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                Emissão de Crachás Oficiais
              </h3>
              <p className="text-xs text-zinc-400 font-bold mt-0.5">
                Escolha o padrão de tamanho e formato para impressão em folha A4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 text-zinc-500 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Seleção de Escopo se houver targetReg */}
        {targetReg && (
          <div className="bg-zinc-950/70 p-4 rounded-2xl border border-white/5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Quem deve ser incluído?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('individual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'individual'
                    ? 'bg-violet-600/20 border-violet-500 text-white'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <p className="text-xs font-black uppercase">Apenas este inscrito</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{targetReg.full_name}</p>
              </button>
              <button
                type="button"
                onClick={() => setScope('confirmed')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'confirmed'
                    ? 'bg-violet-600/20 border-violet-500 text-white'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <p className="text-xs font-black uppercase">Todos os Confirmados</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{confirmedList.length} participante(s)</p>
              </button>
            </div>
          </div>
        )}

        {/* 3 Modelos de Crachá */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Sparkles size={12} className="text-violet-400" />
            Selecione o Modelo de Crachá Desejado:
          </label>

          <div className="space-y-3">
            {BADGE_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => !generating && setSelectedModel(model.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                    isSelected
                      ? 'bg-violet-600/10 border-violet-500 ring-2 ring-violet-500/30'
                      : 'bg-zinc-950/60 border-white/5 hover:border-white/10 hover:bg-zinc-950'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      isSelected ? 'bg-violet-500/20 ring-1 ring-violet-500/40' : 'bg-zinc-900'
                    }`}>
                      {getModelIcon(model.id)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">
                            {model.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-black text-violet-300">
                            {model.badgeDimensions}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isSelected
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                            : 'bg-zinc-800 text-zinc-400 border-white/5'
                        }`}>
                          {model.perPageLabel}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                        {model.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span>• {model.capacityText}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-400">{model.recommendedFor}</span>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/40'
                          : 'border-zinc-700 bg-zinc-900 text-transparent'
                      }`}>
                        <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo da Emissão */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-zinc-400 flex items-center gap-2 text-center sm:text-left">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <span>
              Total a emitir:{' '}
              <strong className="text-white font-black">{currentList.length}</strong>{' '}
              crachá(s) com foto de rosto e código de barras/leitura.
            </span>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {selectedModel === 'corporate_10'
              ? `~${Math.ceil(currentList.length / 10)} folha(s) A4`
              : selectedModel === 'medium_4'
              ? `~${Math.ceil(currentList.length / 4)} folha(s) A4`
              : `~${Math.ceil(currentList.length / 2)} folha(s) A4`}
          </span>
        </div>

        {/* Barra de Progresso durante a geração */}
        {generating && progress && (
          <div className="space-y-2 animate-in fade-in">
            <div className="flex justify-between text-xs text-zinc-400 font-bold">
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-400" />
                Renderizando fotos e credenciais em alta resolução...
              </span>
              <span className="text-white font-black">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || currentList.length === 0}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Gerando PDF ({progress?.current || 0}/{progress?.total || currentList.length})...</span>
              </>
            ) : (
              <>
                <Printer size={16} />
                <span>Gerar e Baixar Crachás em PDF</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaidEventBadgeModal;

