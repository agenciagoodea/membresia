
import React, { useState, useEffect } from 'react';
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
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { MOCK_TENANT, PLAN_CONFIGS } from '../constants';
import { Cell, UserRole, Member, MeetingReport, LadderStage, MemberOrigin } from '../types';
import UpgradeModal from './Shared/UpgradeModal';
import { cellService } from '../services/cellService';
import { memberService } from '../services/memberService';
import { meetingReportService } from '../services/meetingReportService';
import CellModal from './CellModal';
import PageHeader from './Shared/PageHeader';
import { STAGE_ACTIVITIES, isStageComplete, getMissingMilestones } from '../utils/ladderUtils';
const CellDetailView = ({ cell, onBack, members: allMembers, user: currentUser }: { cell: Cell, onBack: () => void, members: Member[], user: any }) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersList, setMembersList] = useState<Member[]>(allMembers);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reports, setReports] = useState<MeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [presentMemberIds, setPresentMemberIds] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);

  const cellMembers = membersList.filter(m => m.cellId === cell.id);
  const leaderId = cell.leaderId;
  const leader = membersList.find(m => m.id === leaderId);

  let leadersList: Member[] = [];
  let disciplesList: Member[] = [];

  if (leader) {
    leadersList.push(leader);
    if (leader.maritalStatus === 'Casado(a)' && leader.spouseId) {
      const spouse = membersList.find(m => m.id === leader.spouseId);
      if (spouse && !leadersList.find(l => l.id === spouse.id)) {
        leadersList.push(spouse);
      }
    }
  }

  disciplesList = cellMembers.filter(m => !leadersList.find(l => l.id === m.id));

  const isLeader = currentUser.role === UserRole.CELL_LEADER_DISCIPLE || currentUser.role === UserRole.PASTOR || currentUser.role === UserRole.CHURCH_ADMIN || currentUser.role === UserRole.MASTER_ADMIN;

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

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('cell_reports').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      if (isEditingReport && selectedReport) {
        const updatedReport = await meetingReportService.update(selectedReport.id, {
          date: formData.get('date') as string,
          offeringAmount: Number(formData.get('offering')),
          visitorCount: Number(formData.get('visitors')),
          childrenCount: Number(formData.get('children')),
          photoUrl: photoUrl || selectedReport.photoUrl,
          report: formData.get('report') as string,
          presentMemberIds: Array.from(presentMemberIds)
        });
        setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
        setSelectedReport(updatedReport);
        setIsEditingReport(false);
      } else {
        const newReport = await meetingReportService.create({
          cellId: cell.id,
          date: formData.get('date') as string,
          offeringAmount: Number(formData.get('offering')),
          visitorCount: Number(formData.get('visitors')),
          childrenCount: Number(formData.get('children')),
          photoUrl: photoUrl || undefined,
          report: formData.get('report') as string,
          presentMemberIds: Array.from(presentMemberIds),
          recordedBy: currentUser.name
        });
        setReports([newReport, ...reports]);
        setShowReportForm(false);
      }

      setPhotoFile(null);
      setPresentMemberIds(new Set());
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      alert('Erro ao salvar relatório. Verifique se o bucket cell_reports existe.');
    }
  };

  const handleTogglePresence = (memberId: string) => {
    setPresentMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
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
              recordedBy: currentUser.name,
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
              recordedBy: currentUser.name,
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
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none mb-1">{cell.name}</h2>
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
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Status</p>
              <span className={`inline-block w-fit text-[9px] font-black px-4 py-1.5 rounded-full border tracking-widest uppercase ${cell.status === 'MULTIPLYING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                {cell.status === 'MULTIPLYING' ? 'Em Multiplicação' : 'Ativa'}
              </span>
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
              {reports.map((report) => (
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
                        {new Date(report.date).toLocaleDateString('pt-BR')}
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
              ))}
              {reports.length === 0 && (
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
                          <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} className="w-12 h-12 rounded-full ring-2 ring-rose-500/30 group-hover:ring-rose-500 transition-all object-cover aspect-square" alt="" />
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1.5">{member.name}</p>
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
                          <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} className="w-12 h-12 rounded-full ring-2 ring-white/10 group-hover:ring-blue-500 transition-all object-cover aspect-square" alt="" />
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

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Crianças</label>
                  <input name="children" required type="number" placeholder="0" min="0" defaultValue={isEditingReport && selectedReport ? selectedReport.childrenCount : 0} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Visitantes</label>
                  <input name="visitors" required type="number" placeholder="0" min="0" defaultValue={isEditingReport && selectedReport ? selectedReport.visitorCount : 0} className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
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
                          <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} className="w-8 h-8 rounded-full object-cover aspect-square" alt="" />
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
                  <Calendar size={12} /> {new Date(selectedReport.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditingReport(true)}
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
                        <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-[10px] font-black text-blue-400 uppercase">{m.name.split(' ')[0]}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-zinc-950/50 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Registrado por: {selectedReport.recordedBy}</span>
              <button onClick={() => setSelectedReport(null)} className="px-8 py-3 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Cells: React.FC<{ user: any }> = ({ user }) => {
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cellsData, membersData] = await Promise.all([
        cellService.getAll(MOCK_TENANT.id),
        memberService.getAll(MOCK_TENANT.id)
      ]);
      setCells(cellsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Erro ao carregar dados das células:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const planLimits = PLAN_CONFIGS[MOCK_TENANT.plan];
  const isLimitReached = cells.length >= planLimits.maxCells;

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
        const updated = await cellService.update(editingCell.id, formData);
        setCells(cells.map(c => c.id === editingCell.id ? updated : c));
      } else {
        const created = await cellService.create({
          ...formData,
          church_id: MOCK_TENANT.id,
          status: 'ACTIVE'
        });
        setCells([created, ...cells]);
      }
    } catch (error) {
      console.error('Erro ao salvar célula:', error);
      throw error;
    }
  };

  const handleDeleteCell = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta célula permanentemente? Todos os dados vinculados serão mantidos, mas a célula deixará de existir.')) {
      try {
        await cellService.delete(id);
        setCells(cells.filter(c => c.id !== id));
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

  if (selectedCell) {
    return <CellDetailView cell={selectedCell} members={members} onBack={() => setSelectedCell(null)} user={user} />;
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <PageHeader
        title="Rede de Células"
        subtitle={`Monitorando ${cells.length} de ${planLimits.maxCells} núcleos ativos.`}
        actions={
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
        }
      />


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cells.map((cell) => (
          <div
            key={cell.id}
            onClick={() => setSelectedCell(cell)}
            className="group bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl hover:bg-zinc-800 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers size={100} />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform">
                <Layers size={32} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCell(cell);
                    setIsCellModalOpen(true);
                  }}
                  className="p-3 bg-zinc-950 text-zinc-500 hover:text-amber-400 rounded-xl border border-white/5 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCell(cell.id);
                  }}
                  className="p-3 bg-zinc-950 text-zinc-500 hover:text-rose-500 rounded-xl border border-white/5 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">{cell.name}</h3>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 mb-8 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-zinc-600" /> {members.filter(m => m.cellId === cell.id).length} Membros
              </div>
              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-500" /> {cell.averageAttendance || 0} p.
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600">
                <span>Saúde da Célula</span>
                <span className="text-emerald-500">{(cell.averageAttendance || 0) > 10 ? 'Excelente' : 'Estável'}</span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${cell.status === 'MULTIPLYING' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                  style={{ width: `${Math.min(100, ((cell.averageAttendance || 0) / 15) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button className="mt-10 w-full py-4 bg-zinc-950 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-3">
              GERENCIAR CÉLULA <ChevronRight size={14} />
            </button>
          </div>
        ))}

        {cells.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-zinc-900/50">
            <Layers size={64} className="mx-auto mb-6 opacity-10" />
            <p className="text-zinc-600 font-black uppercase tracking-[0.3em]">Nenhuma célula estruturada</p>
          </div>
        )}
      </div>

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
        leadersList={members.filter(m => m.role === UserRole.CELL_LEADER_DISCIPLE || m.role === UserRole.PASTOR)}
      />
    </div>
  );
};

export default Cells;
