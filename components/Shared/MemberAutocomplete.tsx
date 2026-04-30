import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Users } from 'lucide-react';
import { Member, UserRole } from '../../types';
import { getCoupleDisplayName } from '../../utils/memberDisplayUtils';
import { normalizeRole } from '../../utils/roleUtils';

interface MemberAutocompleteProps {
  allMembers: Member[];
  onSelect: (member: Member) => void;
  onRemove?: (memberId: string) => void;
  selectedIds?: string[];
  placeholder?: string;
  label?: string;
  multiple?: boolean;
  roleFilter?: string[];
  showCouples?: boolean;
}

const MemberAutocomplete: React.FC<MemberAutocompleteProps> = ({
  allMembers,
  onSelect,
  onRemove,
  selectedIds = [],
  placeholder = "Buscar membro...",
  label,
  multiple = false,
  roleFilter,
  showCouples = true
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

  const filteredMembers = allMembers.filter(m => {
    const role = normalizeRole(m.role);
    if (roleFilter && !roleFilter.includes(role)) return false;
    if (selectedIds.includes(m.id)) return false;
    
    const nameMatch = (m.fullName || '').toLowerCase().includes(search.toLowerCase());
    return search.length >= 2 && nameMatch;
  });

  const selectedMembers = allMembers.filter(m => selectedIds.includes(m.id));

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">{label}</label>}
      
      <div className="relative">
        <div className={`w-full bg-zinc-900 border border-white/5 rounded-2xl p-2 min-h-[56px] transition-all focus-within:ring-2 focus-within:ring-blue-600 ${isOpen ? 'rounded-b-none' : ''}`}>
          <div className="flex flex-wrap gap-2">
            {multiple && selectedMembers.map(m => (
              <span key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {showCouples ? getCoupleDisplayName(m, allMembers) : m.fullName}
                <button type="button" onClick={() => onRemove?.(m.id)} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
            
            <div className="flex-1 flex items-center gap-3 px-2">
              {!multiple && selectedMembers.length > 0 ? (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-white uppercase">
                    {showCouples ? getCoupleDisplayName(selectedMembers[0], allMembers) : selectedMembers[0].fullName}
                  </span>
                  <button type="button" onClick={() => onRemove?.(selectedMembers[0].id)} className="text-zinc-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {isOpen && search.length >= 2 && (
          <div className="absolute z-[110] left-0 right-0 top-full bg-zinc-900 border-x border-b border-white/10 rounded-b-2xl shadow-2xl max-h-[240px] overflow-y-auto custom-scrollbar">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelect(m);
                    setSearch('');
                    if (!multiple) setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center overflow-hidden">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={16} className="text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">
                      {showCouples ? getCoupleDisplayName(m, allMembers) : m.fullName}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{m.role}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-zinc-600">
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAutocomplete;
