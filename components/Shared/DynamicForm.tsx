import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ChevronDown, 
  Calendar, 
  Type, 
  Hash, 
  Upload, 
  Users as UsersIcon, 
  Info,
  Lock,
  Eye,
  EyeOff,
  Search,
  Check
} from 'lucide-react';
import { M12Activity, FormLogicType, Member, UserRole } from '../../types';

interface DynamicFormProps {
  fields: M12Activity[];
  values: { [key: string]: any };
  onChange: (fieldId: string, value: any) => void;
  members?: Member[]; // Para campos relacionais
  currentUser?: Member; // Para filtros relacionais e permissões
  isAdmin?: boolean;
  isReadOnly?: boolean;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  fields, 
  values, 
  onChange, 
  members = [], 
  currentUser,
  isAdmin = false,
  isReadOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState<{ [key: string]: string }>({});

  // Função para verificar se um campo deve estar visível
  const isFieldVisible = (field: M12Activity) => {
    if (!field.isVisible && !isAdmin) return false;
    if (!field.dependsOnId) return true;

    const parentField = fields.find(f => f.id === field.dependsOnId);
    if (!parentField) return true;

    const parentValue = values[parentField.id] || values[parentField.label]; // Suporte a label para retrocompatibilidade
    
    if (!parentValue) return false;

    // Se houver uma condição lógica específica
    if (field.logicalCondition) {
      try {
        // Exemplo de condição: "SIM", "Concluído", "true"
        const condition = field.logicalCondition.trim();
        if (condition.startsWith('===')) {
          return String(parentValue) === condition.replace('===', '').trim();
        }
        return String(parentValue).toLowerCase() === condition.toLowerCase();
      } catch (e) {
        console.error('Erro ao avaliar condição lógica:', e);
        return true;
      }
    }

    return !!parentValue;
  };

  // Cálculos automáticos (ex: Idade)
  useEffect(() => {
    fields.filter(f => f.isCalculated && f.dataSource === 'AUTO').forEach(field => {
      if (field.label.toLowerCase().includes('idade')) {
        const birthFieldName = fields.find(f => f.label.toLowerCase().includes('nascimento'))?.id;
        const birthDateValue = birthFieldName ? values[birthFieldName] : null;
        
        if (birthDateValue) {
          const birthDate = new Date(birthDateValue);
          const age = Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 3600 * 24 * 365.25));
          if (values[field.id] !== age) {
            onChange(field.id, age);
          }
        }
      }
    });
  }, [values, fields]);

  const renderInput = (field: M12Activity) => {
    const isLocked = isReadOnly || (!isAdmin && !field.isEditable);
    const value = values[field.id] ?? values[field.label] ?? field.defaultValue ?? '';

    switch (field.logicType) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-white/5 group">
            <span className="text-sm font-bold text-zinc-300 uppercase tracking-tight">{field.label}</span>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onChange(field.id, value === true ? false : true)}
              className={`w-14 h-7 rounded-full relative transition-all duration-500 ${value === true ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${value === true ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        );

      case 'STATUS':
        const TIER_OPTIONS = ['Não', 'Cursando', 'Concluído'];
        const statusOptions = field.configOptions?.length ? field.configOptions : TIER_OPTIONS;
        return (
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isLocked}
                onClick={() => onChange(field.id, opt)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  value === opt 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                    : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case 'SELECT':
      case 'MULTI_SELECT':
        const options = field.configOptions || [];
        const isMulti = field.logicType === 'MULTI_SELECT' || field.isMultipleChoice;
        const currentValues = isMulti ? (Array.isArray(value) ? value : (value ? [value] : [])) : [value];

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => {
              const selected = currentValues.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isMulti) {
                      const next = selected ? currentValues.filter(v => v !== opt) : [...currentValues, opt];
                      onChange(field.id, next);
                    } else {
                      onChange(field.id, opt);
                    }
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selected 
                      ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selected ? 'bg-blue-600 border-blue-600' : 'border-zinc-800'
                  }`}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">{opt}</span>
                </button>
              );
            })}
          </div>
        );

      case 'DATE':
        return (
          <div className="relative group/input">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
            <input
              type="date"
              disabled={isLocked}
              value={value}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium disabled:opacity-50"
            />
          </div>
        );

      case 'TEXT':
        return (
          <div className="relative group/input">
            <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              disabled={isLocked}
              value={value}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium disabled:opacity-50"
            />
          </div>
        );

      case 'NUMBER':
        return (
          <div className="relative group/input">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
            <input
              type="number"
              disabled={isLocked}
              value={value}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium disabled:opacity-50"
            />
          </div>
        );

      case 'RELATIONAL':
        // Lógica de filtro relacional (Cônjuge, Líder, etc)
        const currentSearch = searchTerm[field.id] || '';
        const filteredMembers = members.filter(m => {
          // Filtro de Busca
          const matchesSearch = m.name.toLowerCase().includes(currentSearch.toLowerCase());
          if (!matchesSearch) return false;

          // Filtro por Sexo (Cônjuge)
          if (field.label.toLowerCase().includes('cônjuge') || field.label.toLowerCase().includes('parceiro')) {
            if (currentUser?.sex === 'MASCULINO') return m.sex === 'FEMININO';
            if (currentUser?.sex === 'FEMININO') return m.sex === 'MASCULINO';
          }

          // Filtro por Role (Líder)
          if (field.label.toLowerCase().includes('líder') || field.label.toLowerCase().includes('discipulador')) {
            return m.role !== UserRole.MEMBER_VISITOR;
          }

          // Impedir duplicidade de vínculo (não listar membros já vinculados como cônjuges de outros, etc)
          // Isso requer uma lógica mais complexa baseada na tabela 'member_relationships'
          return m.id !== currentUser?.id;
        }).slice(0, 10); // Limitar sugestões

        return (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                placeholder="Buscar membro..."
                value={currentSearch}
                onChange={(e) => setSearchTerm({ ...searchTerm, [field.id]: e.target.value })}
                className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-black/20">
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(field.id, m.id);
                    setSearchTerm({ ...searchTerm, [field.id]: '' });
                  }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0 ${
                    value === m.id ? 'bg-blue-600/10' : ''
                  }`}
                >
                  <img src={m.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{m.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1">{m.role}</p>
                  </div>
                  {value === m.id && <Check size={14} className="text-blue-500 ml-auto" />}
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <div className="p-4 text-center text-[10px] text-zinc-600 font-black uppercase tracking-widest">Nenhum membro encontrado</div>
              )}
            </div>
          </div>
        );

      case 'HIDDEN':
        return null;

      case 'CALCULATED':
        return (
          <div className="p-4 bg-zinc-900/10 border border-white/5 rounded-2xl flex items-center justify-between opacity-80 italic">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-tight">{field.label}</span>
            <span className="text-sm font-black text-blue-400">{value || '--'}</span>
          </div>
        );

      default:
        return <p className="text-[10px] text-rose-500">Tipo de lógica {field.logicType} não suportado.</p>;
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {fields
          .filter(f => f.isActive && isFieldVisible(f))
          .sort((a, b) => a.order - b.order)
          .map((field) => (
            <motion.div
              key={field.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  {field.label}
                  {field.isRequired && <span className="text-rose-500 text-lg leading-none">*</span>}
                  {!field.isVisible && <EyeOff size={10} className="text-amber-500" title="Invisível para membros" />}
                </label>
                {field.description && (
                  <div className="group relative">
                    <Info size={12} className="text-zinc-700 hover:text-blue-500 cursor-help transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-zinc-950 border border-white/10 rounded-xl text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
                      {field.description}
                    </div>
                  </div>
                )}
              </div>
              
              {renderInput(field)}
              
              {(isReadOnly || (!field.isEditable && !isAdmin)) && (
                <p className="flex items-center gap-1.5 text-[8px] font-black text-amber-500/50 uppercase tracking-widest ml-2">
                  <Lock size={8} /> Campo bloqueado para edição
                </p>
              )}
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};

export default DynamicForm;
