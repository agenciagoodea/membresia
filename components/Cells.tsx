
import React, { useState, useEffect } from 'react';
import { useChurch } from '../contexts/ChurchContext';
import {
  Plus,
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  ExternalLink,
  ChevronLeft,
  FileText,
  UserCheck,
  TrendingUp,
  Heart,
  MessageSquare,
  Lock,
  ChevronDown,
  X,
  MoreHorizontal,
  Trash2,
  Edit2,
  CheckCircle2,
  Target,
  Zap,
  ChevronRight,
  Send,
  Camera,
  CheckSquare,
  Square,
  Layers,
  Home,
  FileCheck2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { PLAN_CONFIGS } from '../constants';
import { Cell, UserRole, Member, MeetingReport, LadderStage, MemberOrigin } from '../types';
import UpgradeModal from './Shared/UpgradeModal';
import { cellService } from '../services/cellService';
import { memberService } from '../services/memberService';
import { meetingReportService } from '../services/meetingReportService';
import { churchService } from '../services/churchService';
import CellModal from './CellModal';
import PageHeader from './Shared/PageHeader';
import { STAGE_ACTIVITIES, isStageComplete, getMissingMilestones } from '../utils/ladderUtils';
import { generateCellOccurrences } from '../utils/agendaUtils';
import { cellMeetingService } from '../services/cellMeetingService';
import MemberProfileModal from './MemberProfileModal';
import { normalizeRole } from '../utils/roleUtils';
const CellDetailView = ({ cell, onBack, members: allMembers, user: currentUser, onInvite }: { cell: Cell, onBack: () => void, members: Member[], user: any, onInvite: (cell: Cell, date?: string) => void }) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersList, setMembersList] = useState<Member[]>(allMembers);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reports, setReports] = useState<MeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [presentMemberIds, setPresentMemberIds] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportChildren, setReportChildren] = useState<any[]>([]);
  const [reportVisitors, setReportVisitors] = useState<any[]>([]);

  const { cells, meetingExceptions, refreshData } = useChurch();
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionType, setExceptionType] = useState<'CANCELLED' | 'RESCHEDULED'>('CANCELLED');
  const [selectedOccurrence, setSelectedOccurrence] = useState<any>(null);

  const leaders = allMembers.filter(m => (cell.leaderIds || []).includes(m.id) || m.id === cell.leaderId);
  const leadersList: Member[] = [...leaders];
  
  // Incluir cônjuges apenas se não estiverem já na lista e forem casados
  leaders.forEach(l => {
    if (l.maritalStatus === 'Casado(a)' && l.spouseId) {
      const spouse = allMembers.find(m => m.id === l.spouseId);
      if (spouse && !leadersList.find(existing => existing.id === spouse.id)) {
        leadersList.push(spouse);
      }
    }
  });

  const handleCreateReport = () => {
    console.log('--- RELATÓRIO: Início da Detecção (v6) ---');
    const myId = String(currentUser.id || currentUser.profile?.id || '').toLowerCase();
    const myName = String(currentUser.fullName || currentUser.name || currentUser.profile?.fullName || currentUser.profile?.name || '').trim().toLowerCase();
    
    // 1. Identificar IDs de líderes
    const rawLeaderIds = [
      cell.leaderId, 
      ...(cell.leaderIds || []),
      cell.hostId
    ].filter(Boolean).map(id => String(id).toLowerCase());

    const cellLeaderIds = Array.from(new Set(rawLeaderIds));
    
    // 2. Tentar encontrar líderes no estado local primariamente
    const leadersToScan = membersList.filter(m => {
      const mId = String(m.id).toLowerCase();
      const mName = String(m.name || '').trim().toLowerCase();
      return cellLeaderIds.includes(mId) || (myName && mName === myName) || mId === myId;
    });

    const initialChildren: any[] = [];
    const processedNames = new Set<string>();

    const scanForKids = (list: Member[]) => {
      list.forEach(leader => {
        const kids = leader.children || [];
        if (Array.isArray(kids)) {
          kids.forEach(child => {
            const cName = String(child.name || '').trim();
            if (cName && !processedNames.has(cName.toLowerCase())) {
              processedNames.add(cName.toLowerCase());
              initialChildren.push({
                id: child.id || `auto-${Math.random().toString(36).substr(2, 9)}`,
                name: cName,
                birthDate: child.birthDate,
                isAuto: true
              });
            }
          });
        }
      });
    };

    // Coleta inicial
    scanForKids(leadersToScan);

    // Se tiver cônjuges no local, scan neles também
    leadersToScan.forEach(leader => {
      if (leader.spouseId) {
        const spouse = membersList.find(m => String(m.id).toLowerCase() === String(leader.spouseId).toLowerCase());
        if (spouse && !leadersToScan.find(l => l.id === spouse.id)) {
          scanForKids([spouse]);
        }
      }
    });

    // 5. Presenças automáticas
    const defaultPresent = new Set(leadersToScan.map(l => l.id));
    if (myId) defaultPresent.add(myId);
    setPresentMemberIds(defaultPresent);

    console.log(`Relatório aberto com ${initialChildren.length} crianças identificadas.`);
    setReportChildren(initialChildren);
    setReportVisitors([]);
    setIsEditingReport(false);
    setShowReportForm(true);

    // Atualização em background (opcional e silenciosa) para garantir futuros relatórios
    if (initialChildren.length === 0 && myId) {
       memberService.getById(myId).then(fresh => {
          if (fresh && fresh.children && fresh.children.length > 0) {
             console.log('Dados frescos de filhos carregados para o próximo relatório');
             setMembersList(prev => prev.map(m => m.id === fresh.id ? fresh : m));
          }
       }).catch(() => {});
    }
  };

  const handleEditReport = (report: MeetingReport) => {
    setSelectedReport(report);
    setPresentMemberIds(new Set(report.presentMemberIds));
    setReportChildren(report.children || []);
    setReportVisitors(report.visitors || []);
    setIsEditingReport(true);
    setShowReportForm(true);
  };

  const cellMembers = membersList.filter(m => m.cellId === cell.id);
  const disciplesList = cellMembers.filter(m => !leadersList.find(l => l.id === m.id));

  // Verifica se o usuário atual é líder DESTA célula específica
  const currentUserId = currentUser.id || currentUser.profile?.id;
  const isLeaderOfThisCell = 
    cell.leaderId === currentUserId || 
    (cell.leaderIds || []).includes(currentUserId) ||
    cell.hostId === currentUserId;

  const isLeader = 
    currentUser.role === UserRole.MASTER_ADMIN || 
    currentUser.role === UserRole.CHURCH_ADMIN || 
    currentUser.role === UserRole.PASTOR || 
    (currentUser.role === UserRole.CELL_LEADER_DISCIPLE && isLeaderOfThisCell);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await meetingReportService.getByCell(cell.id);
        setReports(data);
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [cell.id]);

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      let photoUrl = '';
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${cell.id}_${Date.now()}.${fileExt}`;
				const { error: uploadError } = await supabase.storage
					.from('cell_reports')
					.upload(fileName, photoFile);

				if (uploadError) {
					console.error('Erro de Storage:', uploadError);
					if (uploadError.message.includes('Bucket not found') || uploadError.message === 'The resource was not found') {
						throw new Error('O bucket "cell_reports" não existe no Supabase. Por favor, crie um bucket público chamado "cell_reports" no Storage.');
					}
					if (uploadError.message.includes('row-level security policy') || uploadError.message.includes('permission denied')) {
						throw new Error('Falta permissão no Supabase. Acesse Storage > cell_reports -> Policies e adicione uma política permitindo INSERT/UPDATE para todos (ou para usuários autenticados).');
					}
					throw new Error(`Erro ao enviar imagem: ${uploadError.message}`);
				}
        const { data: { publicUrl } } = supabase.storage.from('cell_reports').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      if (isEditingReport && selectedReport) {
        const updatedReport = await meetingReportService.update(selectedReport.id, {
          date: formData.get('date') as string,
          offeringAmount: Number(formData.get('offering')),
          visitorCount: reportVisitors.length,
          childrenCount: reportChildren.length,
          photoUrl: photoUrl || selectedReport.photoUrl,
          report: formData.get('report') as string,
          presentMemberIds: Array.from(presentMemberIds),
          children: reportChildren,
          visitors: reportVisitors
        });
        setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
        setSelectedReport(updatedReport);
        setIsEditingReport(false);
      } else {
        const newReport = await meetingReportService.create({
          cellId: cell.id,
          date: formData.get('date') as string,
          offeringAmount: Number(formData.get('offering')),
          visitorCount: reportVisitors.length,
          childrenCount: reportChildren.length,
          photoUrl: photoUrl || undefined,
          report: formData.get('report') as string,
          presentMemberIds: Array.from(presentMemberIds),
          children: reportChildren,
          visitors: reportVisitors,
          recordedBy: currentUser.fullName || currentUser.name
        });
        setReports([newReport, ...reports]);
        setShowReportForm(false);
      }

      setPhotoFile(null);
      setPresentMemberIds(new Set());
    } catch (error: any) {
      console.error('Erro ao salvar relatório:', error);
      const errorMessage = error?.message || 'Erro ao salvar relatório.';
      alert(errorMessage);
    }
  };

  const handleTogglePresence = (memberId: string) => {
    const member = membersList.find(m => m.id === memberId);
    
    setPresentMemberIds(prev => {
      const next = new Set(prev);
      const isAdding = !next.has(memberId);
      
      if (isAdding) {
        next.add(memberId);
        if (member?.children && member.children.length > 0) {
          setReportChildren(prevChildren => {
            let nextChildren = [...prevChildren];
            member.children!.forEach(child => {
              const existingIndex = nextChildren.findIndex(c => c.name.toLowerCase() === child.name.toLowerCase());
              if (existingIndex > -1) {
                const existing = nextChildren[existingIndex];
                if (existing.isAuto) {
                  const pIds = existing.parentIds || [];
                  if (!pIds.includes(memberId)) {
                    nextChildren[existingIndex] = { ...existing, parentIds: [...pIds, memberId] };
                  }
                }
              } else {
                nextChildren.push({
                  id: Math.random().toString(36).substr(2, 9),
                  name: child.name,
                  birthDate: child.birthDate,
                  isAuto: true,
                  parentIds: [memberId]
                });
              }
            });
            return nextChildren;
          });
        }
      } else {
        next.delete(memberId);
        setReportChildren(prevChildren => {
          return prevChildren.map(child => {
            if (!child.isAuto || !child.parentIds?.includes(memberId)) return child;
            return { ...child, parentIds: child.parentIds.filter((id: string) => id !== memberId) };
          }).filter(child => !child.isAuto || (child.parentIds && child.parentIds.length > 0));
        });
      }
      return next;
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Tem certeza que deseja excluir este relatório permanentemente?')) {
      try {
        await meetingReportService.delete(reportId);
        setReports(reports.filter(r => r.id !== reportId));
        setSelectedReport(null);
        setIsEditingReport(false);
      } catch (error) {
        console.error('Erro ao excluir relatório:', error);
        alert('Erro ao excluir relatório.');
      }
    }
  };
  const handleExceptionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await cellMeetingService.createException({
        cell_id: cell.id,
        original_date: selectedOccurrence.date,
        status: exceptionType,
        reason: formData.get('reason') as string,
        new_date: exceptionType === 'RESCHEDULED' ? formData.get('new_date') as string : undefined,
        new_time: exceptionType === 'RESCHEDULED' ? formData.get('new_time') as string : undefined,
        church_id: cell.churchId || currentUser.churchId || currentUser.church_id
      });
      await refreshData();
      setIsExceptionModalOpen(false);
      setSelectedOccurrence(null);
    } catch (error) {
      console.error('Erro ao salvar exceção:', error);
      alert('Erro ao salvar alteração na reunião.');
    }
  };

  const handleRemoveException = async (exceptionId: string) => {
    if (confirm('Deseja reverter esta alteração e voltar ao horário normal?')) {
      try {
        await cellMeetingService.deleteException(exceptionId);
        await refreshData();
      } catch (error) {
        console.error('Erro ao remover exceção:', error);
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingMeetings = generateCellOccurrences(cell, meetingExceptions, 6)
    .filter(m => m.date >= todayStr);

  // Combine reports with exceptions for a unified history
  const unifiedHistory = [
    ...reports.map(r => ({ ...r, type: 'REPORT' as const })),
    ...meetingExceptions
      .filter(e => e.cell_id === cell.id)
      .map(e => ({ ...e, type: 'EXCEPTION' as const })),
    ...generateCellOccurrences(cell, meetingExceptions, 10)
      .filter(m => m.date <= todayStr && !reports.some(r => r.date === m.date))
      .map(m => ({ ...m, type: 'UPCOMING' as const }))
  ].sort((a, b) => {
    const dateA = ('date' in a ? a.date : a.original_date) || '';
    const dateB = ('date' in b ? b.date : b.original_date) || '';
    return dateB.localeCompare(dateA);
  });




  const handleToggleMilestone = async (member: Member, milestone: string) => {
    if (member.stage === LadderStage.WIN && member.origin === MemberOrigin.PRAYER_REQUEST) {
      if (milestone !== 'Sistema de Oração') return;
      if ((member.completedMilestones || []).includes('Sistema de Oração')) return;
    }

    const current = member.completedMilestones || [];
    let updatedMilestones: string[];

    if (member.stage === LadderStage.WIN) {
      updatedMilestones = current.includes(milestone) ? [] : [milestone];
    } else {
      updatedMilestones = current.includes(milestone)
        ? current.filter(m => m !== milestone)
        : [...current, milestone];
    }

    try {
      const updated = await memberService.update(member.id, {
        completedMilestones: updatedMilestones
      });
      setMembersList(membersList.map(m => m.id === member.id ? updated : m));
      if (selectedMember?.id === member.id) setSelectedMember(updated);
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  };

  const handleAdvance = async (member: Member) => {

    if (member.stage === LadderStage.WIN) {
      if (!isStageComplete(member)) {
        alert("Para avançar de nível, informe pelo menos uma opção de como o discípulo foi ganho.");
        return;
      }
    } else {
      const missing = getMissingMilestones(member);

      if (missing.length > 0) {
        alert(`Para avançar de nível, complete primeiro:\n\n• ${missing.join('\n• ')}`);
        return;
      }
    }

    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
    const currentIndex = stages.indexOf(member.stage);

    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        const updated = await memberService.update(member.id, {
          stage: nextStage,
          stageHistory: [
            ...member.stageHistory,
            {
              stage: member.stage,
              date: new Date().toISOString(),
              recordedBy: currentUser.fullName || currentUser.name,
              notes: `Concluiu a etapa de ${member.stage.toLowerCase()} e avançou via Gestão de Células.`,
              milestones: member.completedMilestones || []
            }
          ]
        });
        setMembersList(membersList.map(m => m.id === member.id ? updated : m));
        if (selectedMember?.id === member.id) setSelectedMember(updated);
      } catch (error) {
        console.error('Erro ao avançar estágio:', error);
      }
    }
  };

  const handleRegress = async (member: Member) => {
    const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
    const currentIndex = stages.indexOf(member.stage);

    if (currentIndex > 0) {
      const prevStage = stages[currentIndex - 1];
      try {
        const updated = await memberService.update(member.id, {
          stage: prevStage,
          stageHistory: [
            ...member.stageHistory,
            {
              stage: prevStage,
              date: new Date().toISOString(),
              recordedBy: currentUser.fullName || currentUser.name,
              notes: `Retornou da etapa de ${member.stage.toLowerCase()} para ${prevStage.toLowerCase()} via Gestão de Células.`,
              milestones: []
            }
          ]
        });
        setMembersList(membersList.map(m => m.id === member.id ? updated : m));
        if (selectedMember?.id === member.id) setSelectedMember(updated);
      } catch (error) {
        console.error('Erro ao regredir estágio:', error);
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-10 duration-500">
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-2">
        <button onClick={onBack} className="p-3 md:p-4 bg-zinc-900 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white shadow-xl self-start md:self-auto">
          <ChevronLeft size={24} />
        </button>
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none mb-1">{cell.name}</h2>
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5">
              <span className={`text-[10px] font-black uppercase tracking-widest ${cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                {cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'ATIVA' : 'INATIVA'}
              </span>
              <button 
                onClick={async () => {
                  try {
                    const newStatus = (cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING') ? 'INACTIVE' : 'ACTIVE';
                    await cellService.update(cell.id, { status: newStatus });
                    refreshData();
                  } catch (e) {
                    console.error('Erro ao alternar status:', e);
                  }
                }}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner ${cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'bg-emerald-600' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-md ${cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] italic">Gestão Analítica & Cuidado Espiritual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Membros</p>
              <h4 className="text-4xl font-black text-white tracking-tighter">{cellMembers.length}</h4>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Freq. Média</p>
              <h4 className="text-4xl font-black text-emerald-500 tracking-tighter">{cell.averageAttendance || 0} <span className="text-lg">p.</span></h4>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col justify-between">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Oferta Acumulada</p>
              <h4 className="text-2xl font-black text-emerald-500 tracking-tighter">
                R$ {reports.reduce((sum, r) => sum + (r.offeringAmount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                <Calendar size={22} className="text-amber-500" /> Próximas Reuniões
              </h3>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingMeetings.map((mtg, i) => {
                const isCancelled = mtg.status === 'CANCELLED';
                const isRescheduled = mtg.status === 'RESCHEDULED';
                
                return (
                  <div key={mtg.id} className={`p-4 rounded-2xl border transition-all ${isCancelled ? 'bg-rose-500/5 border-rose-500/20' : isRescheduled ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">
                          {new Date(mtg.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()}
                        </p>
                        <h5 className="text-lg font-black text-white tracking-tighter">
                          {new Date(mtg.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </h5>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Horário</p>
                        <p className="text-sm font-black text-zinc-100">{mtg.time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-4">
                      {isCancelled ? (
                         <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full uppercase tracking-widest">CANCELADO</span>
                      ) : isRescheduled ? (
                         <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-widest">REAGENDADO</span>
                      ) : (
                         <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest text-center">NORMAL</span>
                      )}

                      {isLeader && !isCancelled && !isRescheduled && (
                        <div className="flex gap-2">
                          {mtg.date === todayStr && (
                            <button 
                              onClick={() => {
                                handleCreateReport();
                                // Pre-set date after short delay to ensure state updates
                                setTimeout(() => {
                                  const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
                                  if (dateInput) dateInput.value = mtg.date;
                                }, 50);
                              }}
                              title="Lançar Relatório (Hoje)"
                              className="p-2.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-lg shadow-blue-500/10"
                            >
                              <FileCheck2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onInvite(cell, mtg.date);
                            }}
                            title="Enviar Convite da Célula"
                            className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                          >
                            <Send size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedOccurrence(mtg);
                              setExceptionType('RESCHEDULED');
                              setIsExceptionModalOpen(true);
                            }}
                            title="Remarcar Reunião"
                            className="p-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all"
                          >
                            <Calendar size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedOccurrence(mtg);
                              setExceptionType('CANCELLED');
                              setIsExceptionModalOpen(true);
                            }}
                            title="Cancelar Reunião"
                            className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                <FileText size={22} className="text-blue-500" /> Relatórios de Encontro
              </h3>
              {isLeader && (
                <button
                  onClick={() => setShowReportForm(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  Novo Relatório
                </button>
              )}
            </div>
            <div className="divide-y divide-white/5">
              {unifiedHistory.map((item) => {
                if ('type' in item && item.type === 'REPORT') {
                  const report = item as MeetingReport;
                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        setIsEditingReport(false);
                      }}
                      className="p-8 hover:bg-white/5 transition-all group overflow-hidden cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-zinc-600" />
                          <span className="text-lg font-black text-zinc-100 tracking-tight">
                            {new Date(report.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">R$ {report.offeringAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>

                      {report.photoUrl && (
                        <div className="w-full h-48 mb-6 rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
                          <img src={report.photoUrl} alt="Foto da Célula" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                      )}

                      <p className="text-sm text-zinc-400 mb-6 font-medium leading-relaxed italic group-hover:text-zinc-200 transition-colors">"{report.report}"</p>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1.5 rounded-full border border-white/5">
                          <Users size={14} className="text-indigo-500" /> {report.visitorCount} Visitantes
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1.5 rounded-full border border-white/5">
                          <Users size={14} className="text-amber-500" /> {report.childrenCount} Crianças
                        </div>
                        {report.presentMemberIds && report.presentMemberIds.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/20 text-blue-400">
                            <CheckSquare size={14} className="text-blue-500" /> {report.presentMemberIds.length} / {cellMembers.length} Presentes
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else if ('type' in item && item.type === 'UPCOMING') {
                  const meeting = item as any;
                  const alreadyReported = reports.some(r => r.date === meeting.date);
                  if (alreadyReported) return null;

                  return (
                    <div key={meeting.date} className="p-8 hover:bg-white/5 transition-all group overflow-hidden border-l-4 border-blue-500 bg-blue-500/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                            <Clock size={16} />
                          </div>
                          <div>
                            <span className="text-lg font-black text-zinc-100 tracking-tight">
                              {new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reunião Programada</p>
                          </div>
                        </div>
                        {isLeader && (
                          <button 
                            onClick={() => {
                              handleCreateReport();
                              setTimeout(() => {
                                const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
                                if (dateInput) dateInput.value = meeting.date;
                              }, 100);
                            }}
                            title="Lançar Relatório"
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                          >
                            <FileCheck2 size={14} /> Lançar Relatório
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        <MapPin size={12} /> {cell.neighborhood || 'Local da Célula'} • {cell.meetingTime}
                      </div>
                    </div>
                  );
                } else {
                  const exception = item as any;
                  return (
                    <div key={exception.id} className="p-8 hover:bg-white/5 transition-all group overflow-hidden border-l-4 border-amber-500 bg-amber-500/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${exception.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {exception.status === 'CANCELLED' ? <X size={16} /> : <Calendar size={16} />}
                          </div>
                          <div>
                            <span className="text-lg font-black text-zinc-100 tracking-tight">
                              {new Date(exception.original_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              {exception.status === 'CANCELLED' ? 'REUNIÃO CANCELADA' : `REAGENDADO PARA ${new Date(exception.new_date + 'T12:00:00').toLocaleDateString('pt-BR')} às ${exception.new_time}`}
                            </p>
                          </div>
                        </div>
                        {isLeader && (
                          <button onClick={() => handleRemoveException(exception.id)} className="p-2 text-zinc-600 hover:text-white transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <MessageSquare size={12} /> Motivo Informado:
                        </p>
                        <p className="text-sm text-zinc-300 font-medium italic">"{exception.reason || 'Sem motivo especificado'}"</p>
                      </div>
                    </div>
                  );
                }
              })}
              {unifiedHistory.length === 0 && (
                <div className="py-24 text-center text-zinc-600 font-black uppercase tracking-[0.3em] opacity-30 italic">Sem relatórios ativos</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-4 uppercase tracking-tighter">
              <Heart size={22} className="text-rose-500" /> Integrantes
            </h3>

            <div className="space-y-6">
              {leadersList.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserCheck size={12} /> Líderes
                  </h4>
                  <div className="space-y-3">
                    {leadersList.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className="flex items-center justify-between group p-4 hover:bg-white/5 rounded-[1.5rem] transition-all border border-rose-500/10 hover:border-rose-500/30 cursor-pointer bg-rose-500/5"
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={getAvatarUrl(member.fullName || member.name, member.avatarUrl || (member as any).avatar)} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getAvatarUrl(member.fullName || member.name, null); }}
                            className="w-12 h-12 rounded-full ring-2 ring-rose-500/30 group-hover:ring-rose-500 transition-all object-cover aspect-square" 
                            alt="" 
                          />
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1.5">{member.fullName || member.name}</p>
                            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Líder de Célula</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-rose-500/50 group-hover:text-rose-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {disciplesList.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2 mt-6">
                    <Users size={12} /> Discípulos
                  </h4>
                  <div className="space-y-3">
                    {disciplesList.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className="flex items-center justify-between group p-4 hover:bg-white/5 rounded-[1.5rem] transition-all border border-transparent hover:border-white/5 cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=random`; }}
                            className="w-12 h-12 rounded-full ring-2 ring-white/10 group-hover:ring-blue-500 transition-all object-cover aspect-square" 
                            alt="" 
                          />
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1.5">{member.name}</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.values(LadderStage).map((s) => {
                                const stages = [LadderStage.WIN, LadderStage.CONSOLIDATE, LadderStage.DISCIPLE, LadderStage.SEND];
                                const currentIndex = stages.indexOf(member.stage);
                                const sIndex = stages.indexOf(s);
                                if (sIndex > currentIndex) return null;

                                const sColor = s === LadderStage.WIN ? 'blue' :
                                  s === LadderStage.CONSOLIDATE ? 'emerald' :
                                    s === LadderStage.DISCIPLE ? 'amber' : 'rose';

                                if (s === LadderStage.WIN) {
                                  const validOrigins = [MemberOrigin.PRAYER_REQUEST, MemberOrigin.EVANGELISM, MemberOrigin.CELL_VISIT, MemberOrigin.OTHER_CHURCH];
                                  const hasValidOrigin = validOrigins.includes(member.origin as any);
                                  if (!hasValidOrigin) return null;
                                  return (
                                    <div key="win" className="w-4 h-4 rounded-full bg-blue-600/20 border border-zinc-800 flex items-center justify-center">
                                      <CheckCircle2 size={8} className="text-blue-400" />
                                    </div>
                                  );
                                }

                                const activities = STAGE_ACTIVITIES[s] || [];
                                const completed = activities.filter(act => {
                                  if (act === 'Célula' && member.cellId) return true;
                                  return (member.completedMilestones || []).includes(act);
                                });

                                return completed.map((act, i) => (
                                  <div key={`${s}-${i}`} className={`w-4 h-4 rounded-full bg-${sColor}-600/20 border border-zinc-800 flex items-center justify-center`}>
                                    <CheckCircle2 size={8} className={`text-${sColor}-400`} />
                                  </div>
                                ));
                              })}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cellMembers.length === 0 && (
                <div className="py-12 text-center text-zinc-600 font-black uppercase tracking-[0.3em] opacity-30 italic">Nenhum membro vinculado</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(showReportForm || isEditingReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setShowReportForm(false); setIsEditingReport(false); }} />
          <div className="relative bg-zinc-900 w-full max-w-xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 sticky top-0 z-20">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                {isEditingReport ? 'Editar Relatório' : 'Relatório de Encontro'}
              </h3>
              <button onClick={() => { setShowReportForm(false); setIsEditingReport(false); }} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form className="p-10 space-y-8" onSubmit={handleReportSubmit}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Data</label>
                  <input name="date" required type="date" defaultValue={isEditingReport && selectedReport ? selectedReport.date : ''} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Oferta (R$)</label>
                  <input name="offering" required type="number" placeholder="0,00" step="0.01" defaultValue={isEditingReport && selectedReport ? selectedReport.offeringAmount : ''} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Foto do Encontro (Opcional)</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-zinc-950 border border-white/5 border-dashed rounded-2xl px-5 py-6 flex flex-col items-center justify-center gap-2 group-hover:border-blue-500/50 group-hover:bg-blue-500/5 transition-all">
                    {photoFile ? (
                      <>
                        <CheckCircle2 size={24} className="text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-400">{photoFile.name}</span>
                      </>
                    ) : (isEditingReport && selectedReport?.photoUrl) ? (
                      <>
                        <CheckCircle2 size={24} className="text-blue-500" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest text-center mt-2 group-hover:text-blue-300 transition-colors">Foto Atual (Clique para trocar)</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-blue-300 transition-colors">Anexar Fotografia</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center justify-between">
                  Presença de Visitantes
                  <button 
                    type="button" 
                    onClick={() => setReportVisitors([...reportVisitors, { id: Math.random().toString(36).substr(2, 9), name: '', phone: '' }])}
                    className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> ADICIONAR
                  </button>
                </label>
                
                {reportVisitors.length > 0 ? (
                  <div className="space-y-3 font-medium">
                    {reportVisitors.map((visitor, index) => (
                      <div key={visitor.id} className="bg-zinc-950 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 relative group">
                        <button 
                          type="button"
                          onClick={() => setReportVisitors(reportVisitors.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                        >
                          <X size={12} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            placeholder="Nome do Visitante"
                            value={visitor.name}
                            onChange={e => {
                              const next = [...reportVisitors];
                              next[index] = { ...next[index], name: e.target.value };
                              setReportVisitors(next);
                            }}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-all"
                          />
                          <input 
                            placeholder="WhatsApp / Telefone"
                            value={visitor.phone}
                            onChange={e => {
                              const next = [...reportVisitors];
                              next[index] = { ...next[index], phone: e.target.value };
                              setReportVisitors(next);
                            }}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-950/50 border border-dashed border-white/5 rounded-2xl p-8 text-center">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Nenhum visitante registrado</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center justify-between">
                  Presença de Crianças
                  <button 
                    type="button" 
                    onClick={() => setReportChildren([...reportChildren, { id: Math.random().toString(36).substr(2, 9), name: '', birthDate: '' }])}
                    className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> ADICIONAR
                  </button>
                </label>
                
                {reportChildren.length > 0 ? (
                  <div className="space-y-3 font-medium">
                    {reportChildren.map((child, index) => (
                      <div key={child.id} className="bg-zinc-950 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 relative group">
                        <button 
                          type="button"
                          onClick={() => setReportChildren(reportChildren.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                        >
                          <X size={12} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            placeholder="Nome da Criança"
                            value={child.name}
                            onChange={e => {
                              const next = [...reportChildren];
                              next[index] = { ...next[index], name: e.target.value };
                              setReportChildren(next);
                            }}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-all"
                          />
                          <input 
                            type="date"
                            value={child.birthDate}
                            onChange={e => {
                              const next = [...reportChildren];
                              next[index] = { ...next[index], birthDate: e.target.value };
                              setReportChildren(next);
                            }}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-all uppercase"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-950/50 border border-dashed border-white/5 rounded-2xl p-8 text-center">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Nenhuma criança registrada</p>
                  </div>
                )}
              </div>

              {cellMembers.length > 0 && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center justify-between">
                    Lista de Presença
                    <span className="text-blue-500">{presentMemberIds.size} presentes</span>
                  </label>
                  <div className="bg-zinc-950 border border-white/5 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {cellMembers.map(member => (
                      <div
                        key={member.id}
                        onClick={() => handleTogglePresence(member.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${presentMemberIds.has(member.id) ? 'bg-blue-600/10 border-blue-500/30' : 'hover:bg-white/5 border-transparent hover:border-white/5'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=random`; }}
                            className="w-8 h-8 rounded-full object-cover aspect-square" 
                            alt="" 
                          />
                          <span className="text-xs font-bold text-zinc-200 uppercase tracking-tight">{member.name}</span>
                        </div>
                        {presentMemberIds.has(member.id) ? (
                          <CheckSquare size={18} className="text-blue-500" />
                        ) : (
                          <Square size={18} className="text-zinc-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Resumo da Reunião</label>
                <textarea name="report" required rows={4} defaultValue={isEditingReport && selectedReport ? selectedReport.report : ''} placeholder="Como foi o mover de Deus?" className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-white font-medium resize-none"></textarea>
              </div>

              <div className="flex gap-4">
                {isEditingReport && selectedReport && (
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(selectedReport.id)}
                    className="flex-2 px-6 py-5 bg-rose-600/10 text-rose-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-rose-600/20 transition-all flex items-center justify-center gap-3 border border-rose-500/20"
                  >
                    <Trash2 size={20} /> EXCLUIR
                  </button>
                )}
                <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                  <MessageSquare size={20} /> {isEditingReport ? 'ATUALIZAR' : 'SALVAR'} RELATÓRIO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReport && !isEditingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedReport(null)} />
          <div className="relative bg-zinc-900 w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">

            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <FileText className="text-blue-500" size={24} />
                  Detalhes do Relatório
                </h3>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                  <Calendar size={12} /> {new Date(selectedReport.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isLeader && (
                  <>
                    <button
                      onClick={() => handleEditReport(selectedReport)}
                      className="p-3 bg-zinc-800 text-zinc-400 hover:text-amber-400 rounded-2xl transition-all"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteReport(selectedReport.id)}
                      className="p-3 bg-zinc-800 text-zinc-400 hover:text-rose-500 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedReport(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {selectedReport.photoUrl && (
                <div className="w-full h-64 rounded-3xl overflow-hidden border border-white/10 relative group">
                  <img src={selectedReport.photoUrl} alt="Foto da Célula" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <span className="text-white font-bold text-sm flex items-center gap-2"><Camera size={16} /> Foto do Encontro</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Oferta</p>
                  <p className="text-lg font-black text-emerald-500">R$ {selectedReport.offeringAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-zinc-950 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Visitantes</p>
                  <p className="text-lg font-black text-white">{selectedReport.visitorCount}</p>
                </div>
                <div className="bg-zinc-950 p-5 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Crianças</p>
                  <p className="text-lg font-black text-white">{selectedReport.childrenCount}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Resumo do Líder</p>
                <div className="p-6 bg-zinc-950 rounded-3xl border border-white/5">
                  <p className="text-zinc-300 leading-relaxed font-medium italic">"{selectedReport.report}"</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Presentes ({selectedReport.presentMemberIds?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.presentMemberIds?.map(pid => {
                    const m = cellMembers.find(member => member.id === pid);
                    return m ? (
                      <div key={pid} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <img 
                          src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`} 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'User')}&background=random`; }}
                          className="w-5 h-5 rounded-full" 
                          alt="" 
                        />
                        <span className="text-[10px] font-black text-blue-400 uppercase">{m.name.split(' ')[0]}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {selectedReport.children && selectedReport.children.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Crianças Presentes ({selectedReport.children.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.children.map(child => (
                      <div key={child.id} className="flex flex-col gap-1 px-4 py-2 bg-zinc-950 border border-white/5 rounded-2xl">
                        <span className="text-[10px] font-black text-zinc-200 uppercase tracking-tight">{child.name}</span>
                        {child.birthDate && (
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                            Nascto: {new Date(child.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-white/5 bg-zinc-950/50 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Registrado por: {selectedReport.recordedBy}</span>
              <button onClick={() => setSelectedReport(null)} className="px-8 py-3 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {isExceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsExceptionModalOpen(false)} />
          <div className="relative bg-zinc-900 w-full max-w-lg rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                {exceptionType === 'CANCELLED' ? 'Cancelar Reunião' : 'Reagendar Reunião'}
              </h3>
              <button onClick={() => setIsExceptionModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleExceptionSubmit} className="p-8 space-y-6">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Data Original selecionada</p>
                <p className="text-lg font-black text-white">{new Date(selectedOccurrence.date).toLocaleDateString('pt-BR')}</p>
              </div>

              {exceptionType === 'RESCHEDULED' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nova Data</label>
                    <input name="new_date" type="date" required className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Novo Horário</label>
                    <input name="new_time" type="time" required className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Motivo da Alteração</label>
                <textarea 
                  name="reason" 
                  required 
                  rows={3} 
                  placeholder="Por que esta reunião está sendo alterada?" 
                  className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                ></textarea>
                <p className="text-[10px] text-zinc-500 font-bold uppercase italic">* Este motivo será visível para todos os membros no dashboard.</p>
              </div>

              <button type="submit" className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${exceptionType === 'CANCELLED' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'} text-white shadow-xl`}>
                {exceptionType === 'CANCELLED' ? 'CONFIRMAR CANCELAMENTO' : 'CONFIRMAR REAGENDAMENTO'}
              </button>
            </form>
          </div>
        </div>
      )}
      <MemberProfileModal 
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        cellReports={reports}
        allMembers={membersList}
        cellName={selectedMember ? (cells.find(c => c.id === selectedMember.cellId)?.name || (cells.find(c => c.id === (selectedMember as any).profile?.cellId)?.name) || cell.name) : cell.name}
        ledCellName={selectedMember ? (cells.find(c => c.leaderId === selectedMember.id)?.name) : undefined}
      />
    </div>
  );
};

const Cells: React.FC<{ user: any }> = ({ user }) => {
  const { cells, members, loading, refreshData, meetingExceptions } = useChurch();
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [inviteData, setInviteData] = useState<{ cell: Cell, date?: string } | null>(null);
  const [churchSlug, setChurchSlug] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchSlug = async () => {
      if (user?.church_id || user?.churchId) {
        try {
          const c = await churchService.getById(user.church_id || user.churchId);
          setChurchSlug(c.slug);
        } catch (err) {
          console.error('Erro ao buscar church slug:', err);
        }
      }
    };
    fetchSlug();
  }, [user]);

  const planLimits = PLAN_CONFIGS[user.church_plan || 'PRO'];
  const isLimitReached = cells.length >= planLimits.maxCells;

  // Filtro de visibilidade baseado no cargo (Reforço do RBAC do serviço)
  const visibleCells = cells.filter(cell => {
    const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN, 'ADMIN', 'ADMINISTRADOR_IGREJA'].includes(user.role);
    if (isAdmin) return true;

    const myId = user.id || user.profile?.id;
    const myCellId = user.cellId || user.profile?.cellId;
    
    // Pastor/Líder/Discipulador vê apenas o que está vinculado a ele
    const isLeaderOfThisCell = (cell.leaderIds || []).includes(myId) || cell.leaderId === myId;
    const isHostOfThisCell = cell.hostId === myId;
    const isMemberOfThisCell = myCellId === cell.id;
    const isPastorOfThisCell = cell.pastorId === myId || cell.supervisorId === myId;
    
    return isLeaderOfThisCell || isMemberOfThisCell || isHostOfThisCell || isPastorOfThisCell;
  });

  const handleCreateCell = () => {
    if (isLimitReached) {
      setIsUpgradeModalOpen(true);
    } else {
      setEditingCell(null);
      setIsCellModalOpen(true);
    }
  };

  const handleSaveCell = async (formData: any) => {
    try {
      if (editingCell) {
        await cellService.update(editingCell.id, formData);
      } else {
        await cellService.create({
          ...formData,
          church_id: user.churchId || user.church_id,
          status: 'ACTIVE'
        });
      }
      await refreshData();
    } catch (error) {
      console.error('Erro ao salvar célula:', error);
      throw error;
    }
  };

  const handleDeleteCell = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta célula permanentemente? Todos os dados vinculados serão mantidos, mas a célula deixará de existir.')) {
      try {
        await cellService.delete(id);
        await refreshData();
      } catch (error) {
        console.error('Erro ao excluir célula:', error);
        alert('Erro ao excluir célula.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Rede...
      </div>
    );
  }

  const canEditCell = (cell: Cell) => {
    const myId = user.id || user.profile?.id;
    const isAdmin = [UserRole.MASTER_ADMIN, UserRole.CHURCH_ADMIN, 'ADMIN', 'ADMINISTRADOR_IGREJA'].includes(user.role);
    if (isAdmin) return true;

    // Pastor só edita se for o pastor ou supervisor daquela célula específica
    const isPastorOrSupervisor = cell.pastorId === myId || cell.supervisorId === myId;
    const isLeader = (cell.leaderIds || []).includes(myId) || cell.leaderId === myId;
    
    return isPastorOrSupervisor || isLeader;
  };

  return (
    <div className="relative">
      {selectedCell ? (
        <CellDetailView 
          cell={selectedCell} 
          members={members} 
          onBack={() => setSelectedCell(null)} 
          user={user} 
          onInvite={(cell, date) => setInviteData({ cell, date })} 
        />
      ) : (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
          <PageHeader
            title="Rede de Células"
            subtitle={`Monitorando ${visibleCells.length} núcleos ativos.`}
            actions={
              (user.role === UserRole.MASTER_ADMIN || user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.PASTOR) && (
                <button
                  onClick={handleCreateCell}
                  className={`flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all shadow-xl w-full md:w-auto justify-center ${isLimitReached
                    ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                >
                  {isLimitReached ? <Lock size={18} /> : <Plus size={18} />}
                  Nova Célula
                </button>
              )
            }
          />

          <div className="bg-zinc-900 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="bg-zinc-950/50 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-6">Logo / Célula</th>
                    <th className="px-6 py-6 font-black uppercase tracking-widest">Líder(es)</th>
                    <th className="px-6 py-6 text-center font-black uppercase tracking-widest">Membros</th>
                    <th className="px-6 py-6 text-center font-black uppercase tracking-widest">Status</th>
                    <th className="px-6 py-6 text-center font-black uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleCells.map((cell) => {
                    const leadersList = members.filter(m => (cell.leaderIds || []).includes(m.id) || m.id === cell.leaderId);
                    const leaderNames = leadersList.length > 0 ? leadersList.map(l => l.fullName || l.name).join(' & ') : 'Sem Líder';
                    const isLeader = canEditCell(cell);

                    return (
                      <tr key={cell.id} className="hover:bg-white/5 transition-all group cursor-pointer" onClick={() => setSelectedCell(cell)}>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden border border-white/5">
                              {cell.logo ? <img src={cell.logo} className="w-full h-full object-cover" alt="" /> : <Layers size={20} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{cell.name}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{cell.neighborhood || 'Sem endereço'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-xs font-bold text-zinc-100 uppercase tracking-tight">{leaderNames}</p>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-zinc-500 text-[10px] tracking-[0.2em]">
                          {members.filter(m => m.cellId === cell.id).length} PESSOAS
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'ATIVA' : 'INATIVA'}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                            {isLeader && (
                              <>
                                <button 
                                  onClick={() => setInviteData({ cell })}
                                  className="p-2.5 bg-zinc-900 border border-white/5 text-emerald-500 hover:text-white hover:bg-emerald-600 rounded-xl transition-all"
                                  title="Convidar"
                                >
                                  <Send size={16} />
                                </button>
                                <button 
                                  onClick={async () => {
                                    const newStatus = (cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING') ? 'INACTIVE' : 'ACTIVE';
                                    try {
                                      await cellService.update(cell.id, { status: newStatus });
                                      await refreshData();
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className={`p-2.5 bg-zinc-900 border border-white/5 transition-all rounded-xl ${cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'text-emerald-500 hover:text-amber-400 hover:bg-amber-400/10' : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                                  title={cell.status === 'ACTIVE' || cell.status === 'MULTIPLYING' ? 'Alternar Status' : 'Ativar Célula'}
                                >
                                  <Zap size={16} />
                                </button>

                                <button 
                                  onClick={() => { setEditingCell(cell); setIsCellModalOpen(true); }}
                                  className="p-2.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                  title="Editar Dados"
                                >
                                  <Edit2 size={16} />
                                </button>

                                <button 
                                  onClick={() => handleDeleteCell(cell.id)}
                                  className="p-2.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                  title="Excluir Célula"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            <ChevronRight size={18} className="text-zinc-800 ml-2 opacity-20" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS GLOBAIS - Sempre Renderizados */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        limitType="CELLS"
        currentLimit={planLimits.maxCells}
      />

      <CellModal
        isOpen={isCellModalOpen}
        onClose={() => setIsCellModalOpen(false)}
        onSave={handleSaveCell}
        cell={editingCell}
        availableLeaders={members.filter(m => {
          const r = normalizeRole(m.role);
          return r === 'CELL_LEADER_DISCIPLE' || r === 'PASTOR' || r === 'CHURCH_ADMIN' || r === 'MASTER_ADMIN' || r === 'SUPERVISOR';
        })}
        allMembers={members}
      />

      {inviteData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 backdrop-blur-md">
          <div className="absolute inset-0 bg-black/70" onClick={() => setInviteData(null)} />
          <div className="relative bg-zinc-900 w-[92%] sm:max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 shrink-0">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Convite Oficial</h3>
                <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Selecione como enviar o link de cadastro</p>
              </div>
              <button onClick={() => setInviteData(null)} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl transition-all text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-6 text-center overflow-y-auto scrollbar-hide">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 shrink-0">
                <Send size={32} />
              </div>
              <p className="text-xs md:text-sm font-medium text-zinc-300">
                Enviar link para os membros da minha célula.
              </p>
              <div className="bg-zinc-950 p-4 md:p-5 rounded-2xl border border-white/5 flex flex-col items-center gap-4">
                <span className="text-[10px] md:text-xs font-mono text-zinc-500 truncate w-full px-2 italic">{`${window.location.origin}/#/cadastro/${churchSlug}?cell=${inviteData.cell.id}`}</span>
                <div className="flex gap-3 md:gap-4 w-full">
                  <div className="flex-1 flex flex-col items-center min-w-0">
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/#/cadastro/${churchSlug}?cell=${inviteData.cell.id}`;
                        // ... copy logic (omitted for brevity but kept same)
                        if (navigator.clipboard) { navigator.clipboard.writeText(link); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
                      }}
                      className="w-full py-3 bg-zinc-800 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                      Copiar Link
                    </button>
                    {copiedLink && <span className="text-[10px] font-bold text-emerald-400 mt-2 block animate-in fade-in slide-in-from-bottom-1">Link copiado!</span>}
                  </div>
                  <div className="flex-1 flex flex-col items-center min-w-0">
                    <a 
                      onClick={(e) => {
                        e.preventDefault();
                        const cell = inviteData.cell;
                        const dateStr = inviteData.date;
                        
                        let formattedDate = cell.meetingDay;
                        if (dateStr) {
                          const [year, month, day] = dateStr.split('-');
                          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
                          const dayNum = dateObj.getDate();
                          const monthName = dateObj.toLocaleString('pt-BR', { month: 'long' });
                          const yearName = dateObj.getFullYear();
                          // dd "de" mmmm "de" aaaa
                          formattedDate = `${dayNum.toString().padStart(2, '0')} de ${monthName} de ${yearName}`;
                        } else {
                          // Se for convite genérico sem data, tenta formatar a próxima ocorrência
                          try {
                            const occurrences = generateCellOccurrences(cell, meetingExceptions, 1);
                            if (occurrences.length > 0) {
                              const nextDate = new Date(occurrences[0].date + 'T12:00:00');
                              const dNum = nextDate.getDate();
                              const mName = nextDate.toLocaleString('pt-BR', { month: 'long' });
                              const yName = nextDate.getFullYear();
                              formattedDate = `${dNum.toString().padStart(2, '0')} de ${mName} de ${yName}`;
                            }
                          } catch (e) {
                            console.error('Erro ao calcular próxima data no convite genérico:', e);
                          }
                        }

                        // Usando Unicode Escapes para garantis compatibilidade máxima (👋, 📅, ⏰, 🏠, 📍, 🔥)
                        const msg = `\uD83D\uDC4B Olá! Passando para lembrar da nossa próxima reunião da *Célula ${cell.name}*!\n\n\uD83D\uDCC5 *Data:* ${formattedDate}\n\u23F0 *Horário:* ${cell.meetingTime}\n\uD83C\uDFE0 *Local:* Casa do(a) ${cell.hostName || 'Liderança'}\n\uD83D\uDCCD *Endereço:* ${cell.address || cell.neighborhood || 'Consulte o líder'}\n\nEsperamos por você! Vai ser um tempo precioso! \uD83D\uDD25`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      href="#"
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cells;
