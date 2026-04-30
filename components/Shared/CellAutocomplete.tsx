import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Layers, CheckCircle2 } from 'lucide-react';
import { Cell } from '../../types';

interface CellAutocompleteProps {
  cells: Cell[];
  onSelect: (cell: Cell) => void;
  onRemove: (cellId: string) => void;
  onSelectAll?: () => void;
  selectedIds: string[];
  placeholder?: string;
  label?: string;
}

const CellAutocomplete: React.FC<CellAutocompleteProps> = ({
  cells,
  onSelect,
  onRemove,
  onSelectAll,
  selectedIds = [],
  placeholder = "Buscar célula...",
  label
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCells = cells.filter(c => {
    if (selectedIds.includes(c.id)) return false;
    const nameMatch = (c.name || '').toLowerCase().includes(search.toLowerCase());
    return search.length >= 2 && nameMatch;
  });

  const selectedCells = cells.filter(c => selectedIds.includes(c.id));

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between ml-2">
        {label && <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>}
        {onSelectAll && (
          <button 
            type="button" 
            onClick={onSelectAll}
            className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            <CheckCircle2 size={12} />
            Selecionar Todas
          </button>
        )}
      </div>
      
      <div className="relative">
        <div className={`w-full bg-zinc-900 border border-white/5 rounded-2xl p-2 min-h-[56px] transition-all focus-within:ring-2 focus-within:ring-blue-600 ${isOpen ? 'rounded-b-none' : ''}`}>
          <div className="flex flex-wrap gap-2">
            {selectedCells.map(c => (
              <span key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {c.name}
                <button type="button" onClick={() => onRemove(c.id)} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
            
            <div className="flex-1 flex items-center gap-3 px-2">
              <Search size={18} className="text-zinc-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-700 uppercase"
              />
            </div>
          </div>
        </div>

        {isOpen && search.length >= 2 && (
          <div className="absolute z-[110] left-0 right-0 top-full bg-zinc-900 border-x border-b border-white/10 rounded-b-2xl shadow-2xl max-h-[240px] overflow-y-auto custom-scrollbar">
            {filteredCells.length > 0 ? (
              filteredCells.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center">
                    <Layers size={16} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">{c.name}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{c.neighborhood || 'Bairro não informado'}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-zinc-600">
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma célula encontrada</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CellAutocomplete;
