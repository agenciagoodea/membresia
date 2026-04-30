
import React, { useState, useEffect } from 'react';
import {
  Filter,
  Download,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Lock,
  ChevronRight,
  Users,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PLAN_CONFIGS } from '../constants';
import { LadderStage, UserRole, Member, Cell, MemberOrigin, MemberStatus } from '../types';
import UpgradeModal from './Shared/UpgradeModal';
import { memberService } from '../services/memberService';
import { cellService } from '../services/cellService';
import MemberModal from './MemberModal';
import PageHeader from './Shared/PageHeader';
import { useChurch } from '../contexts/ChurchContext';
import { getAvatarUrl } from '../utils/avatarUtils';
import { getRoleLabel, normalizeRole } from '../utils/roleUtils';
import { getCoupleDisplayName, getGroupedMemberOptions } from '../utils/memberDisplayUtils';
const Members: React.FC<{ user: any }> = ({ user }) => {
  const { members, cells, loading, refreshData } = useChurch();
  const location = useLocation();
  const [selectedPastorId, setSelectedPastorId] = useState<string>('ALL');
  const [selectedCellId, setSelectedCellId] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const planLimit = PLAN_CONFIGS[user.church_plan || 'PRO'].maxMembers;
  const currentTotal = members.length;
  const isLimitReached = currentTotal >= planLimit;

  const canManageMember = (member: Member) => {
    const myId = user.id || user.profile?.id;
    const isAdmin = [UserRole.MASTER_ADMIN, UserRole.CHURCH_ADMIN].includes(user.role);
    const isMyPastorate = member.pastorId === myId || member.disciplerId === myId;
    const isSelf = member.id === myId;

    return isAdmin || isMyPastorate || isSelf;
  };

  useEffect(() => {
    if (location.state && (location.state as any).openNewMember) {
      if (!isLimitReached && !loading) {
        setEditingMember(null);
        setIsMemberModalOpen(true);
        window.history.replaceState({}, document.title);
      } else if (isLimitReached && !loading) {
        setIsUpgradeModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, isLimitReached, loading]);

  const filteredMembers = members.filter(m => {
    // 1. Lógica de Visibilidade: Membros Pendentes são exclusivos
    if (m.status === MemberStatus.PENDING) {
      const isSupervisor = user.id === m.pastorId || user.id === m.disciplerId;
      const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN].includes(user.role);
      if (!isSupervisor && !isAdmin) return false;
    }

    // 2. Filtro de Status (Pendentes)
    if (statusFilter === 'PENDING' && m.status !== MemberStatus.PENDING) return false;

    // 3. Filtro por Pastor
    if (selectedPastorId !== 'ALL' && m.pastorId !== selectedPastorId) return false;

    // 4. Filtro por Célula
    if (selectedCellId !== 'ALL' && m.cellId !== selectedCellId) return false;

    // 5. Filtro por Nível/Estágio
    if (selectedStage !== 'ALL' && m.stage !== selectedStage) return false;

    // 6. Busca Textual
    const cellName = cells.find(c => c.id === m.cellId)?.name || 'Sem Célula';
    const pastorName = members.find(p => p.id === m.pastorId)?.fullName || 'Sem Pastor';
    const individualName = m.fullName || (m as any).name || 'Membro';

    const matchesSearch = !searchTerm || 
      individualName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cellName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pastorName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const availablePastorOptions = getGroupedMemberOptions(members.filter(m => {
    const r = normalizeRole(m.role);
    return r === UserRole.PASTOR || r === UserRole.CHURCH_ADMIN || r === UserRole.MASTER_ADMIN;
  }));

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedPastorId('ALL');
    setSelectedCellId('ALL');
    setSelectedStage('ALL');
    setStatusFilter('ALL');
  };

  const handleExport = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Perfil', 'Nível', 'Célula', 'Status'];
    const rows = filteredMembers.map(m => [
      m.fullName,
      m.email || '',
      m.phone || '',
      m.role,
      m.stage,
      cells.find(c => c.id === m.cellId)?.name || 'Sem Célula',
      m.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `membros_ecclesia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddMember = () => {
    if (isLimitReached) {
      setIsUpgradeModalOpen(true);
    } else {
      setEditingMember(null);
      setIsMemberModalOpen(true);
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Deseja realmente excluir este registro permanentemente?')) {
      try {
        await memberService.delete(id);
        await refreshData();
      } catch (error) {
        console.error('Erro ao excluir membro:', error);
        alert('Erro ao excluir registro.');
      }
    }
  };

  const handleSaveMember = async (formData: Partial<Member>) => {
    try {
      let savedMember: Member;
      let finalFormData = { ...formData };

      if (finalFormData.spouseId === '') {
        finalFormData.spouseId = null;
      }

      if (editingMember) {
        const stage = formData.stage || editingMember.stage;
        const origin = formData.origin || editingMember.origin;

        if (stage === LadderStage.WIN && origin) {
          finalFormData.completedMilestones =
            origin === MemberOrigin.PRAYER_REQUEST ? ['Sistema de Oração'] :
              origin === MemberOrigin.EVANGELISM ? ['Evangelismo'] :
                origin === MemberOrigin.CELL_VISIT ? ['Visita de Célula'] : [];
        }

        savedMember = await memberService.update(editingMember.id, finalFormData);
        await refreshData();
      } else {
        const origin = formData.origin || MemberOrigin.OTHER_CHURCH;
        const created = await memberService.create({
          ...finalFormData,
          church_id: user.churchId || user.church_id,
          joinedDate: new Date().toISOString(),
          origin: origin,
          completedMilestones:
            origin === MemberOrigin.PRAYER_REQUEST ? ['Sistema de Oração'] :
              origin === MemberOrigin.EVANGELISM ? ['Evangelismo'] :
                origin === MemberOrigin.CELL_VISIT ? ['Visita de Célula'] : [],
          stageHistory: [{
            stage: finalFormData.stage || LadderStage.WIN,
            date: new Date().toISOString(),
            recordedBy: user.fullName || user.user_metadata?.fullName || user.name || 'Admin',
            notes: 'Membro registrado manualmente'
          }]
        } as any);
        savedMember = created;
        await refreshData();
      }

      // Bidirectional Spouse Sync
      const oldSpouseId = editingMember?.spouseId;
      const newSpouseId = finalFormData.spouseId;

      if (oldSpouseId && oldSpouseId !== newSpouseId) {
        const oldSpouse = members.find(m => m.id === oldSpouseId);
        if (oldSpouse) {
          const updatedOldSpouse = await memberService.update(oldSpouseId, { spouseId: null });
          await refreshData();
        }
      }

      if (newSpouseId && finalFormData.maritalStatus === 'Casado(a)') {
        const newSpouse = members.find(m => m.id === newSpouseId);
        if (newSpouse && (newSpouse.spouseId !== savedMember.id || newSpouse.maritalStatus !== 'Casado(a)')) {
          const updatedNewSpouse = await memberService.update(newSpouseId, {
            spouseId: savedMember.id,
            maritalStatus: 'Casado(a)'
          });
          await refreshData();
        }
      }

    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Membresia...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title="Membros & Discípulos"
        subtitle={`Monitorando ${currentTotal} de ${planLimit} vagas.`}
        actions={
          <>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-3.5 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all w-full md:w-auto justify-center"
            >
              <Download size={16} /> Exportar
            </button>
            <button
              onClick={handleAddMember}
              className={`flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all shadow-xl w-full md:w-auto justify-center ${isLimitReached
                ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                }`}
            >
              {isLimitReached ? <Lock size={18} /> : <Plus size={18} />}
              Novo Registro
            </button>
          </>
        }
      />

      <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="p-6 md:p-8 border-b border-white/5 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4 bg-zinc-950 px-6 py-3.5 rounded-2xl border border-white/5 flex-1 max-w-xl focus-within:ring-2 focus-within:ring-blue-600 transition-all group">
              <Search size={18} className="text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Busca por nome, e-mail, pastor ou célula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full font-medium text-zinc-200"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
               <button 
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-all"
               >
                <Filter size={14} /> Limpar
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro Pastor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Pastor</label>
              <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-white/5">
                <select
                  className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-zinc-300 focus:text-blue-400 cursor-pointer"
                  value={selectedPastorId}
                  onChange={(e) => setSelectedPastorId(e.target.value)}
                >
                  <option className="bg-zinc-900" value="ALL">Todos os Pastores</option>
                  {availablePastorOptions.map(opt => (
                    <option className="bg-zinc-900" key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro Célula */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Célula</label>
              <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-white/5">
                <select
                  className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-zinc-300 focus:text-blue-400 cursor-pointer"
                  value={selectedCellId}
                  onChange={(e) => setSelectedCellId(e.target.value)}
                >
                  <option className="bg-zinc-900" value="ALL">Todas as Células</option>
                  {cells.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <option className="bg-zinc-900" key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro Nível */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nível / Escada</label>
              <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-white/5">
                <select
                  className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-zinc-300 focus:text-blue-400 cursor-pointer"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                >
                  <option className="bg-zinc-900" value="ALL">Todos os Níveis</option>
                  <option className="bg-zinc-900" value={LadderStage.WIN}>Ganhar</option>
                  <option className="bg-zinc-900" value={LadderStage.CONSOLIDATE}>Consolidar</option>
                  <option className="bg-zinc-900" value={LadderStage.DISCIPLE}>Discipular</option>
                  <option className="bg-zinc-900" value={LadderStage.SEND}>Enviar</option>
                </select>
              </div>
            </div>

            {/* Filtro Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Status</label>
              <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-white/5">
                <select
                  className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-zinc-300 focus:text-blue-400 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option className="bg-zinc-900" value="ALL">Ativos & Pendentes</option>
                  <option className="bg-zinc-900" value="PENDING">Apenas Pendentes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          {/* VISUALIZAÇÃO DESKTOP (Tabela) */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-zinc-950/50 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Membro Principal</th>
                <th className="px-6 py-6 text-center">Perfil</th>
                <th className="px-6 py-6 text-center">Escada</th>
                <th className="px-6 py-6 text-center">Célula</th>
                <th className="px-6 py-6 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <img 
                          src={getAvatarUrl(member.fullName, member.avatarUrl)} 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(member.fullName, null); }}
                          alt="" 
                          className="w-14 h-14 rounded-full ring-2 ring-white/10 group-hover:ring-blue-600 transition-all shadow-xl object-cover aspect-square" 
                        />
                        {member.role === UserRole.PASTOR && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-zinc-900">
                            <Shield size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-black text-white tracking-tight uppercase leading-none mb-1">
                          {member.fullName || (member as any).name || 'Membro'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">{member.email || 'Sem e-mail'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {getRoleLabel(member)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${member.stage === LadderStage.SEND ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        member.stage === LadderStage.DISCIPLE ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          member.stage === LadderStage.CONSOLIDATE ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                        {member.stage}
                      </span>
                      {member.status === MemberStatus.PENDING && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10 animate-pulse">
                          Aguardando
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">
                    {cells.find(c => c.id === member.cellId)?.name || 'Sem Célula'}
                  </td>
                  <td className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={member.email ? `mailto:${member.email}` : '#'} 
                        onClick={(e) => !member.email && e.preventDefault()}
                        className={`group/btn relative p-3 rounded-xl transition-all border border-transparent hover:border-white/5 ${member.email ? 'text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-zinc-700 cursor-not-allowed'}`}
                      >
                        <Mail size={16} />
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                          {member.email ? 'E-mail' : 'Sem E-mail'}
                        </span>
                      </a>

                      <a 
                        href={member.phone ? `https://wa.me/55${member.phone.replace(/\D/g, '')}` : '#'} 
                        target={member.phone ? "_blank" : undefined}
                        rel="noreferrer"
                        onClick={(e) => !member.phone && e.preventDefault()}
                        className={`group/btn relative p-3 rounded-xl transition-all border border-transparent hover:border-white/5 ${member.phone ? 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-700 cursor-not-allowed'}`}
                      >
                        <Phone size={16} />
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/5 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                          {member.phone ? 'WhatsApp' : 'Sem Telefone'}
                        </span>
                      </a>

                      {canManageMember(member) && (
                        <>
                          <button onClick={() => handleEditMember(member)} className="group/btn relative p-3 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all border border-transparent hover:border-white/5">
                            <Edit2 size={16} />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/5 text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">Editar</span>
                          </button>
                          <button onClick={() => handleDeleteMember(member.id)} className="group/btn relative p-3 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-white/5">
                            <Trash2 size={16} />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/5 text-rose-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">Excluir</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* VISUALIZAÇÃO MOBILE (Cards) */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {filteredMembers.map(member => (
              <div key={member.id} className="p-5 hover:bg-white/5 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    <img 
                      src={getAvatarUrl(member.fullName, member.avatarUrl)} 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(member.fullName, null); }}
                      alt="" 
                      className="w-12 h-12 rounded-full ring-2 ring-white/10 shadow-xl object-cover aspect-square" 
                    />
                    {member.role === UserRole.PASTOR && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border-2 border-zinc-900">
                        <Shield size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white tracking-tight uppercase leading-none mb-1 truncate">{member.fullName}</p>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase truncate">{member.email || 'Sem e-mail'}</p>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase truncate font-bold"><span className="text-zinc-600">Célula:</span> {cells.find(c => c.id === member.cellId)?.name || 'Nenhuma'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {getRoleLabel(member)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${member.stage === LadderStage.SEND ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    member.stage === LadderStage.DISCIPLE ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      member.stage === LadderStage.CONSOLIDATE ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                    {member.stage}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={member.email ? `mailto:${member.email}` : '#'} 
                    onClick={(e) => !member.email && e.preventDefault()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 ${member.email ? 'bg-blue-600/10 text-blue-500' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}
                  >
                    <Mail size={14} /> E-mail
                  </a>
                  <a 
                    href={member.phone ? `https://wa.me/55${member.phone.replace(/\D/g, '')}` : '#'} 
                    target={member.phone ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={(e) => !member.phone && e.preventDefault()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 ${member.phone ? 'bg-emerald-600/10 text-emerald-500' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}
                  >
                    <Phone size={14} /> Whats
                  </a>
                  {canManageMember(member) && (
                    <button 
                      onClick={() => handleEditMember(member)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600/10 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                  )}
                  {canManageMember(member) && (
                    <button onClick={() => handleDeleteMember(member.id)} className="flex items-center justify-center p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {filteredMembers.length === 0 && (
          <div className="py-32 text-center text-zinc-600">
            <Users size={64} className="mx-auto mb-6 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhum registro encontrado</p>
          </div>
        )}
      </div>

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        member={editingMember}
        user={user}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        limitType="MEMBERS"
        currentLimit={planLimit}
      />
    </div>
  );
};

export default Members;
