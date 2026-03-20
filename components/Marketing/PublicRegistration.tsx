import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChurchTenant, UserRole, LadderStage, MemberOrigin, Cell, Member, MemberStatus } from '../../types';
import { churchService } from '../../services/churchService';
import { memberService } from '../../services/memberService';
import { cellService } from '../../services/cellService';
import { CheckCircle2, UserPlus, Mail, User, Users, ShieldCheck, Lock, LogIn, ArrowRight, Sparkles } from 'lucide-react';

const PublicRegistration = () => {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const { search } = useLocation();
	const [church, setChurch] = useState<ChurchTenant | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);
	const [registeredName, setRegisteredName] = useState('');

	const [cells, setCells] = useState<Cell[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [invitedCellName, setInvitedCellName] = useState<string>('');
	const [invitedCellLeadersLabel, setInvitedCellLeadersLabel] = useState<string>('');
	const [invitedCell, setInvitedCell] = useState<Cell | null>(null);

	// Tipo de ficha detectado via URL
	const [formType, setFormType] = useState<'cell-invite' | 'ministerial'>('ministerial');

	// FormData básico — apenas os 5 campos da Etapa 1
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		role: UserRole.MEMBER_VISITOR as UserRole,
		// Dados pré-preenchidos do convite por célula (não exibidos na etapa 1)
		cellId: '',
		disciplerId: '',
		pastorId: '',
		origin: MemberOrigin.EVANGELISM as string,
	});

	useEffect(() => {
		const loadChurch = async () => {
			try {
				if (!slug) throw new Error('Link inválido');
				const found = await churchService.getBySlug(slug);
				setChurch(found);

				if (found) {
					const [fetchedCells, fetchedMembers] = await Promise.all([
						cellService.getAll(found.id),
						memberService.getAll(found.id),
					]);
					setCells(fetchedCells);
					setMembers(fetchedMembers);

					// Verificar se veio de um convite de célula
					const queryParams = new URLSearchParams(search);
					const cellParam = queryParams.get('cell');
					if (cellParam) {
						setFormType('cell-invite');
						const targetCell = fetchedCells.find(c => c.id === cellParam);
						if (targetCell) {
							const cellLeaderIds = targetCell.leaderIds || (targetCell.leaderId ? [targetCell.leaderId] : []);
							const leaderNames = getDeduplicatedCouplesLabel(cellLeaderIds, fetchedMembers);
							setInvitedCellLeadersLabel(leaderNames);

							const primaryLeaderId = cellLeaderIds[0] || '';
							const leader = fetchedMembers.find(m => m.id === primaryLeaderId);

							setFormData(prev => ({
								...prev,
								cellId: cellParam,
								disciplerId: primaryLeaderId,
								pastorId: leader?.pastorId || ''
							}));
							setInvitedCellName(targetCell.name);
							setInvitedCell(targetCell);
						}
					}
				}
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		loadChurch();
	}, [slug, search]);

	const getDeduplicatedCouplesLabel = (ids: string[], list: Member[]) => {
		const processed = new Set<string>();
		const results: string[] = [];

		for (const id of ids) {
			if (!id || processed.has(id)) continue;
			const m = list.find(x => x.id === id);
			if (!m) continue;
			processed.add(id);

			const spouseId = m.spouseId || (m as any).spouse_id;
			if (spouseId) {
				const spouse = list.find(x => x.id === spouseId);
				if (spouse) {
					results.push(`${m.name} e ${spouse.name}`);
					processed.add(spouseId);
					continue;
				}
			}
			results.push(m.name);
		}
		return results.join(' & ');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!church) return;

		if (formData.password !== formData.confirmPassword) {
			alert('As senhas não coincidem!');
			return;
		}

		if (formData.password.length < 6) {
			alert('A senha deve ter pelo menos 6 caracteres!');
			return;
		}

		try {
			setSubmitting(true);

			const payload: any = {
				name: formData.name,
				email: formData.email.trim().toLowerCase(),
				password: formData.password,
				phone: '',
				role: formData.role,
				church_id: church.id,
				joinedDate: new Date().toISOString(),
				birthDate: '',
				status: MemberStatus.ACTIVE,
				stage: LadderStage.WIN,
				avatar: '',
				login: formData.email.trim().toLowerCase(),
				completedMilestones: [],
				stageHistory: [{
					stage: LadderStage.WIN,
					date: new Date().toISOString(),
					recordedBy: 'Portal Público',
					notes: formType === 'cell-invite'
						? `Cadastro via convite da célula ${invitedCellName || ''}`
						: 'Cadastro via Ficha Ministerial pública.'
				}],
				// Dados de célula pré-preenchidos (se houver convite)
				...(formData.cellId && { cellId: formData.cellId }),
				...(formData.disciplerId && { disciplerId: formData.disciplerId }),
				...(formData.pastorId && { pastorId: formData.pastorId }),
				// first_access_completed = false: indica que o perfil ainda não foi completado
				firstAccessCompleted: false,
			};

			await memberService.create(payload);
			setRegisteredName(formData.name.split(' ')[0]);
			setSuccess(true);
		} catch (err: any) {
			console.error(err);
			alert(err.message || 'Erro ao realizar cadastro.');
		} finally {
			setSubmitting(false);
		}
	};

	// ─── TELA DE CARREGAMENTO ─────────────────────────────────────────────────
	if (loading) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-10">
			<div className="flex flex-col items-center gap-6">
				<div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
				<h2 className="text-white font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando Portal...</h2>
			</div>
		</div>
	);

	// ─── IGREJA NÃO ENCONTRADA ────────────────────────────────────────────────
	if (!church) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-10">
			<div className="text-center">
				<h2 className="text-4xl text-white font-black uppercase tracking-tighter mb-4">Igreja não encontrada</h2>
				<p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">O link que você acessou parece estar incorreto.</p>
			</div>
		</div>
	);

	// ─── TELA DE SUCESSO (ETAPA 2) ────────────────────────────────────────────
	if (success) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-4">
			<div className="fixed inset-0 overflow-hidden z-0">
				<img
					src={church.settings?.bannerImage || 'https://images.unsplash.com/photo-1544427928-c49cdfb81949?q=80&w=2670&auto=format&fit=crop'}
					className="w-full h-full object-cover scale-110 blur-xl opacity-40"
					alt=""
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
			</div>

			<div className="relative z-10 w-full max-w-lg text-center animate-in zoom-in-95 duration-500">
				{/* Ícone de sucesso com glow */}
				<div className="relative inline-flex items-center justify-center mb-10">
					<div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150" />
					<div className="relative w-28 h-28 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] flex items-center justify-center">
						<CheckCircle2 size={56} className="text-emerald-400" />
					</div>
				</div>

				<h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-3 leading-none">
					Olá, {registeredName}!
				</h2>
				<p className="text-emerald-400 font-black uppercase tracking-widest text-xs mb-6">
					Cadastro realizado com sucesso!
				</p>

				<div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-2xl space-y-6 mb-8">
					<div className="flex items-start gap-4 text-left p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
						<Sparkles size={20} className="text-blue-400 mt-0.5 shrink-0" />
						<div>
							<p className="text-white text-sm font-bold leading-snug">
								Seu acesso está liberado!
							</p>
							<p className="text-zinc-500 text-xs mt-1 leading-relaxed">
								Ao entrar no sistema, você será guiado para completar seu perfil e suas atividades M12.
							</p>
						</div>
					</div>

					<button
						onClick={() => navigate('/login')}
						className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
					>
						<LogIn size={18} />
						Entrar no Sistema
					</button>

					<button
						onClick={() => { setSuccess(false); setFormData({ name: '', email: '', password: '', confirmPassword: '', role: UserRole.MEMBER_VISITOR, cellId: formData.cellId, disciplerId: formData.disciplerId, pastorId: formData.pastorId, origin: formData.origin }); }}
						className="w-full py-4 bg-white/5 text-zinc-400 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all"
					>
						Novo Cadastro
					</button>
				</div>

				<p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
					{church.name} · Portal de Membros
				</p>
			</div>
		</div>
	);

	// ─── FORMULÁRIO (ETAPA 1) ─────────────────────────────────────────────────
	return (
		<div className="min-h-screen bg-black selection:bg-blue-500 selection:text-white">
			{/* Background Imersivo */}
			<div className="fixed inset-0 overflow-hidden z-0">
				<img
					src={church.settings?.bannerImage || 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2673&auto=format&fit=crop'}
					className="w-full h-full object-cover scale-105 opacity-50"
					alt=""
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
			</div>

			<div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
				<div className="w-full max-w-lg">

					{/* Header da Igreja */}
					<div className="text-center mb-10">
						<img
							src={church.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(church.name)}&background=2563eb&color=fff`}
							className="w-16 h-16 object-contain mx-auto mb-5 rounded-2xl"
							alt={church.name}
						/>
						<div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full mb-3">
							<span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
								{formType === 'cell-invite' ? 'Convite por Célula' : 'Ficha Ministerial'}
							</span>
						</div>
						<h1 className="text-3xl font-black text-white uppercase tracking-tighter">
							{church.name}
						</h1>
						<p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
							Portal de Integração de Membros
						</p>
					</div>

					{/* Card de Convite por Célula */}
					{invitedCell && (
						<div className="mb-6 p-5 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
							<div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
								{invitedCell.logo ? (
									<img src={invitedCell.logo} className="w-full h-full object-cover rounded-2xl" alt="" />
								) : (
									<Users size={20} className="text-blue-500" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Você foi convidado para</p>
								<p className="text-sm font-black text-white uppercase tracking-tight truncate">{invitedCell.name}</p>
								{invitedCellLeadersLabel && (
									<p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate">Líder: {invitedCellLeadersLabel}</p>
								)}
							</div>
						</div>
					)}

					{/* Formulário Principal */}
					<div className="bg-zinc-950/70 backdrop-blur-3xl border border-white/10 p-8 sm:p-10 rounded-[3rem] shadow-2xl">
						{/* Indicador de etapa */}
						<div className="flex items-center gap-3 mb-8">
							<div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-black">1</div>
							<div>
								<p className="text-white text-sm font-black uppercase tracking-tight">Criar sua conta</p>
								<p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Etapa 1 de 3 · leva menos de 1 minuto</p>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="space-y-5">
							{/* Nome */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
								<div className="relative group/input">
									<User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
									<input
										required
										type="text"
										autoComplete="name"
										className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
										placeholder="Seu nome completo"
										value={formData.name}
										onChange={e => setFormData({ ...formData, name: e.target.value })}
									/>
								</div>
							</div>

							{/* Email */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
								<div className="relative group/input">
									<Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
									<input
										required
										type="email"
										autoComplete="email"
										className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
										placeholder="seu@email.com"
										value={formData.email}
										onChange={e => setFormData({ ...formData, email: e.target.value })}
									/>
								</div>
							</div>

							{/* Cargo */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Cargo / Perfil</label>
								<div className="relative group/input">
									<ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
									<select
										required
										className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer uppercase font-black"
										value={formData.role}
										onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
									>
										<option value={UserRole.MEMBER_VISITOR} className="bg-zinc-950">Membro / Visitante</option>
										<option value={UserRole.CELL_LEADER_DISCIPLE} className="bg-zinc-950">Líder de Célula</option>
										<option value={UserRole.PASTOR} className="bg-zinc-950">Pastor</option>
									</select>
								</div>
							</div>

							{/* Divider */}
							<div className="flex items-center gap-3 py-2">
								<div className="flex-1 h-px bg-white/5" />
								<span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest flex items-center gap-1.5">
									<Lock size={10} /> Segurança
								</span>
								<div className="flex-1 h-px bg-white/5" />
							</div>

							{/* Senha */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Senha de Acesso</label>
								<div className="relative group/input">
									<Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
									<input
										required
										type="password"
										autoComplete="new-password"
										className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
										placeholder="Mínimo 6 caracteres"
										minLength={6}
										value={formData.password}
										onChange={e => setFormData({ ...formData, password: e.target.value })}
									/>
								</div>
							</div>

							{/* Confirmar Senha */}
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Confirmar Senha</label>
								<div className="relative group/input">
									<Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={18} />
									<input
										required
										type="password"
										autoComplete="new-password"
										className={`w-full bg-zinc-900/60 border rounded-2xl py-4 pl-12 pr-5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-4 transition-all font-medium ${
											formData.confirmPassword && formData.confirmPassword !== formData.password
												? 'border-rose-500/50 focus:ring-rose-500/10 focus:border-rose-500/50'
												: 'border-white/5 focus:border-blue-500/50 focus:ring-blue-500/10'
										}`}
										placeholder="Repita a senha"
										value={formData.confirmPassword}
										onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
									/>
									{formData.confirmPassword && formData.confirmPassword === formData.password && (
										<div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
											<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
										</div>
									)}
								</div>
							</div>

							{/* Botão de envio */}
							<div className="pt-4">
								<button
									type="submit"
									disabled={submitting}
									className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{submitting ? (
										<>
											<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
											Criando sua conta...
										</>
									) : (
										<>
											<UserPlus size={18} />
											Criar Minha Conta
											<ArrowRight size={16} />
										</>
									)}
								</button>
							</div>

							<p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center leading-relaxed pt-2">
								Ao criar sua conta, você concorda com os termos de uso da igreja.
							</p>
						</form>
					</div>

					{/* Rodapé */}
					<p className="text-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest mt-8">
						{church.name} · Portal Seguro
					</p>
				</div>
			</div>
		</div>
	);
};

export default PublicRegistration;
