import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChurchTenant, UserRole, LadderStage, MemberOrigin, Cell, Member, MemberStatus } from '../../types';
import { churchService } from '../../services/churchService';
import { memberService } from '../../services/memberService';
import { cellService } from '../../services/cellService';
import { m12Service } from '../../services/m12Service';
import { CheckCircle2, UserPlus, Phone, Mail, User, Users, ShieldCheck, Lock, Upload, MapPin, Map, Home, Building, Camera, X, Crop as CropIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';
import DynamicForm from '../Shared/DynamicForm';

const PublicRegistration = () => {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const { search } = useLocation();
	const [church, setChurch] = useState<ChurchTenant | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);

	const [cells, setCells] = useState<Cell[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [winActivities, setWinActivities] = useState<any[]>([]);
	const [fetchingCep, setFetchingCep] = useState(false);
	const [invitedCellName, setInvitedCellName] = useState<string>('');
	const [invitedCellLeadersLabel, setInvitedCellLeadersLabel] = useState<string>('');
	const [invitedCell, setInvitedCell] = useState<Cell | null>(null);

	const calculateAge = (birthDate: string) => {
		if (!birthDate) return '';
		const today = new Date();
		const birth = new Date(birthDate);
		let age = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
			age--;
		}
		return age.toString();
	};

	const [formData, setFormData] = useState({
		name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '',
		cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
		birthDate: '', sex: '' as 'MASCULINO' | 'FEMININO' | '', hasChildren: false,
		children: [] as { id: string, name: string, birthDate: string, photo?: string, cpf?: string }[],
		origin: MemberOrigin.EVANGELISM as string, role: UserRole.MEMBER_VISITOR as UserRole,
		cellId: '', disciplerId: '', pastorId: '', maritalStatus: '', spouseId: '', avatar: '',
		newCellName: '', isCreatingCell: false, conversionDate: '',
		milestoneValues: {} as Record<string, any>
	});

	// Cropper State
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string>('');
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
	const [isCropping, setIsCropping] = useState(false);
	const [isProcessingCrop, setIsProcessingCrop] = useState(false);

	useEffect(() => {
		const loadChurch = async () => {
			try {
				if (!slug) throw new Error("Link inválido");
				const found = await churchService.getBySlug(slug);
				setChurch(found);

				if (found) {
					const [fetchedCells, fetchedMembers, fetchedActivities] = await Promise.all([
						cellService.getAll(found.id),
						memberService.getAll(found.id),
						m12Service.getActivities(found.id)
					]);
					setCells(fetchedCells);
					setMembers(fetchedMembers);
					
					const winStage = fetchedActivities.filter(c => c.stage === LadderStage.WIN);
					setWinActivities(winStage);

					if (winStage.length > 0) {
						setFormData(prev => ({ ...prev, origin: winStage[0].label }));
					}

					// Pre-fill cell, leader, and pastor if coming from invite link
					const queryParams = new URLSearchParams(search);
					const cellParam = queryParams.get('cell');
					if (cellParam) {
						const targetCell = fetchedCells.find(c => c.id === cellParam);
						if (targetCell) {
							// Collect all leaders from leaderIds or leaderId
							const cellLeaderIds = targetCell.leaderIds || (targetCell.leaderId ? [targetCell.leaderId] : []);
							
							// Format the leaders' names for display
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
					processed.add(spouseId); // Evita duplicar no 'for' se o cônjuge também estiver array ids
					continue;
				}
			}
			
			results.push(m.name);
		}
		return results.join(' & ');
	};

	const getDeduplicatedMembersOptions = (list: Member[]) => {
		const processed = new Set<string>();
		const options: { id: string, label: string }[] = [];

		for (const m of list) {
			if (processed.has(m.id)) continue;
			processed.add(m.id);

			const spouseId = m.spouseId || (m as any).spouse_id;
			if (spouseId) {
				const spouse = list.find(x => x.id === spouseId);
				if (spouse) {
					options.push({ id: m.id, label: `${m.name} e ${spouse.name}` });
					processed.add(spouseId);
					continue;
				}
			}
			
			options.push({ id: m.id, label: m.name });
		}

		return options;
	};


	const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		let cep = e.target.value.replace(/\D/g, '');
		setFormData(prev => ({ ...prev, cep }));

		if (cep.length === 8) {
			try {
				setFetchingCep(true);
				const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
				const data = await response.json();
				if (!data.erro) {
					setFormData(prev => ({
						...prev,
						street: data.logradouro || prev.street,
						neighborhood: data.bairro || prev.neighborhood,
						city: data.localidade || prev.city,
						state: data.uf || prev.state
					}));
				}
			} catch (error) {
				console.error('Erro ao buscar CEP:', error);
			} finally {
				setFetchingCep(false);
			}
		}
	};

	const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
		setCroppedAreaPixels(croppedAreaPixels);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotoPreview(reader.result as string);
				setIsCropping(true);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleConfirmCrop = async () => {
		if (photoPreview && croppedAreaPixels) {
			setIsProcessingCrop(true);
			try {
				const croppedFile = await getCroppedImg(photoPreview, croppedAreaPixels);
				if (croppedFile) {
					const reader = new FileReader();
					reader.onloadend = () => {
						setPhotoPreview(reader.result as string);
						setIsCropping(false);
					};
					reader.readAsDataURL(croppedFile);
					setSelectedFile(croppedFile);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setIsProcessingCrop(false);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!church) return;

		if (formData.password !== formData.confirmPassword) {
			alert("As senhas não coincidem!");
			return;
		}

		if (!formData.birthDate) {
			alert("Data de nascimento é obrigatória!");
			return;
		}

		try {
			setSubmitting(true);
			
			let uploadedAvatar = '';
			if (selectedFile) {
				uploadedAvatar = await memberService.uploadAvatar(selectedFile);
			}

			const payload: any = {
				...formData,
				church_id: church.id,
				joinedDate: new Date().toISOString(),
				status: MemberStatus.ACTIVE,
				stage: LadderStage.WIN,
				avatar: uploadedAvatar,
				login: formData.email,
				completedMilestones: formData.origin ? [formData.origin] : [],
				stageHistory: [{
					stage: LadderStage.WIN,
					date: new Date().toISOString(),
					recordedBy: 'Portal Público',
					notes: 'Cadastro via formulário público de membresia.'
				}]
			};

			delete payload.confirmPassword;
			delete payload.newCellName;
			delete payload.isCreatingCell;

			await memberService.create(payload);
			setSuccess(true);
		} catch (err: any) {
			console.error(err);
			alert(err.message || "Erro ao realizar cadastro.");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-10">
			<div className="flex flex-col items-center gap-6">
				<div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
				<h2 className="text-white font-black uppercase tracking-[0.5em] animate-pulse">Sincronizando Portal...</h2>
			</div>
		</div>
	);

	if (!church) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-10">
			<div className="text-center">
				<h2 className="text-4xl text-white font-black uppercase tracking-tighter mb-4">Igreja não encontrada</h2>
				<p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">O link que você acessou parece estar incorreto.</p>
			</div>
		</div>
	);

	if (success) return (
		<div className="min-h-screen bg-black flex items-center justify-center p-4">
			<div className="fixed inset-0 overflow-hidden z-0">
				<img 
					src={church.settings?.bannerImage || "https://images.unsplash.com/photo-1544427928-c49cdfb81949?q=80&w=2670&auto=format&fit=crop"} 
					className="w-full h-full object-cover scale-110 blur-xl opacity-50"
					alt=""
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
			</div>

			<div className="relative z-10 w-full max-w-xl bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl text-center animate-in zoom-in-95 duration-500">
				<div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-blue-500/20">
					<CheckCircle2 size={48} className="text-white" />
				</div>
				<h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-none">CADASTRO CONCLUÍDO</h2>
				<p className="text-zinc-400 font-medium mb-10 leading-relaxed">
					Sua ficha foi enviada com sucesso! Seu acesso já está liberado. Clique no botão abaixo para entrar no sistema.
				</p>
				<div className="space-y-4">
					<button
						onClick={() => navigate('/login')}
						className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
					>
						Acessar o Sistema
					</button>
					<button
						onClick={() => window.location.reload()}
						className="w-full py-5 bg-white/5 text-zinc-400 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all"
					>
						Novo Cadastro
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-black selection:bg-blue-500 selection:text-white pb-20">
			{/* Background Imersivo */}
			<div className="fixed inset-0 overflow-hidden z-0">
				<img 
					src={church.settings?.bannerImage || "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2673&auto=format&fit=crop"} 
					className="w-full h-full object-cover scale-105 opacity-60"
					alt=""
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
			</div>

			<div className="relative z-10 container mx-auto px-4 pt-20">
				<div className="max-w-4xl mx-auto">
					<div className="flex flex-col lg:flex-row items-stretch gap-6 mb-16">
						{/* Card Principal da Igreja */}
						<div className="flex-1 bg-zinc-950/40 backdrop-blur-2xl border border-white/5 p-8 md:p-10 rounded-[3rem] relative overflow-hidden group shadow-2xl">
							<div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
							
							<div className="flex flex-col md:flex-row items-center gap-8 relative z-10 h-full">
								{/* Logo Igreja */}
								<div className="shrink-0">
									<img 
										src={church.logo || "https://ui-avatars.com/api/?name=Church&background=2563eb"} 
										className="w-20 md:w-28 h-auto object-contain transition-all hover:scale-105" 
										alt={church.name} 
									/>
								</div>

								<div className="text-center md:text-left flex-1 border-white/5 md:border-l md:pl-8">
									<div className="flex flex-col gap-3">
										<div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
											<div className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
												<span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
													{invitedCellName ? 'Convite por Célula' : 'Ficha Ministerial'}
												</span>
											</div>
										</div>
										<h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-sm max-w-sm">
											{church.name}
										</h1>
										<div className="flex items-center justify-center md:justify-start gap-4">
											<div className="w-8 h-px bg-white/10" />
											<p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Portal de Integração</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Card da Célula (Se houver convite) */}
						{invitedCell && (
							<div className="lg:w-[400px] bg-blue-600/5 backdrop-blur-2xl border border-blue-500/10 p-8 rounded-[3rem] relative overflow-hidden group shadow-2xl">
								<div className="absolute top-0 right-0 p-4">
									<Users className="text-blue-500/20" size={40} />
								</div>
								
								<div className="flex flex-col gap-6 relative z-10 h-full justify-center">
									<div className="flex items-center gap-4">
										{invitedCell.logo ? (
											<div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
												<img src={invitedCell.logo} className="w-full h-full object-cover" alt={invitedCell.name} />
											</div>
										) : (
											<div className="w-14 h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 shrink-0">
												<Users size={24} />
											</div>
										)}
										<div>
											<p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Você foi convidado para:</p>
											<h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">{invitedCell.name}</h2>
										</div>
									</div>
									
									<div className="space-y-1">
										<p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Liderança da Célula</p>
										<p className="text-xs text-white font-bold uppercase leading-relaxed whitespace-normal break-words">
											{invitedCellLeadersLabel}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
						{/* Seção: Identidade */}
						<div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 p-6 md:p-12 rounded-[3.5rem] shadow-2xl space-y-10 transition-all hover:bg-zinc-950/70">
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
								<div className="flex items-center gap-4">
									<div className="w-1.5 h-10 bg-blue-600 rounded-full" />
									<div>
										<h3 className="text-2xl font-black text-white tracking-tight uppercase">Identidade</h3>
										<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Informações Pessoais</p>
									</div>
								</div>

								{/* Upload de Avatar */}
								<div className="flex items-center gap-6">
									<div 
										onClick={() => document.getElementById('avatar-upload')?.click()}
										className="relative w-24 h-24 rounded-[1.8rem] bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all overflow-hidden group"
									>
										{photoPreview ? (
											<img src={photoPreview} className="w-full h-full object-cover" alt="" />
										) : (
											<div className="text-center group-hover:scale-110 transition-transform">
												<Camera size={24} className="text-zinc-700 mb-1 mx-auto" />
												<span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none">Subir Foto</span>
											</div>
										)}
										<input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
									</div>
									<div className="hidden sm:block">
										<p className="text-white text-xs font-bold uppercase mb-1">Foto de Perfil</p>
										<p className="text-zinc-500 text-[10px] font-medium leading-relaxed max-w-[150px]">Uma boa foto ajuda na sua identificação ministerial.</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
									<div className="relative group/input">
										<User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<input 
											required
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
											placeholder="Ex: João Silva"
											value={formData.name}
											onChange={e => setFormData({ ...formData, name: e.target.value })}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">WhatsApp</label>
									<div className="relative group/input">
										<Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<input 
											required
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
											placeholder="(00) 00000-0000"
											value={formData.phone}
											onChange={e => setFormData({ ...formData, phone: e.target.value })}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">E-mail</label>
									<div className="relative group/input">
										<Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<input 
											required
											type="email" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
											placeholder="exemplo@email.com"
											value={formData.email}
											onChange={e => setFormData({ ...formData, email: e.target.value })}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Cargo / Perfil</label>
									<div className="relative group/input">
										<ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<select 
											required
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer uppercase font-black"
											value={formData.role}
											onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
										>
											{Object.values(UserRole).filter(r => r !== UserRole.MASTER_ADMIN && r !== UserRole.CHURCH_ADMIN).map(role => (
												<option key={role} value={role} className="bg-zinc-950">{role}</option>
											))}
										</select>
									</div>
								</div>


								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-3">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Gênero</label>
										<div className="relative group/input">
											<User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
											<select 
												required
												className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer uppercase font-black"
												value={formData.sex}
												onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
											>
												<option value="" className="bg-zinc-950">Selecionar</option>
												<option value="MASCULINO" className="bg-zinc-950">MASCULINO</option>
												<option value="FEMININO" className="bg-zinc-950">FEMININO</option>
											</select>
										</div>
									</div>
									<div className="space-y-3">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nascimento</label>
										<div className="relative group/input">
											<MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
											<input 
												required
												type="date" 
												className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-8 pl-14 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
												value={formData.birthDate}
												onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Data de Conversão (Opcional)</label>
									<div className="relative group/input">
										<ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<input 
											type="date" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-8 pl-14 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
											value={formData.conversionDate}
											onChange={e => setFormData({ ...formData, conversionDate: e.target.value })}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Estado Civil</label>
									<div className="relative group/input">
										<ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
										<select 
											required
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer uppercase font-black"
											value={formData.maritalStatus}
											onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
										>
											<option value="" className="bg-zinc-950">Selecionar</option>
											{['Solteiro(a)', 'Casado(a)', 'Noivo(a)', 'Moram Juntos', 'Divorciado(a)', 'Viúvo(a)'].map(s => (
												<option key={s} value={s} className="bg-zinc-950">{s}</option>
											))}
										</select>
									</div>
								</div>

								{(['Casado(a)', 'Noivo(a)', 'Moram Juntos'].includes(formData.maritalStatus)) && (
									<div className="space-y-3 animate-in slide-in-from-top-4">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Cônjuge / Parceiro(a)</label>
										<div className="relative group/input">
											<User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/input:text-blue-500 transition-colors" size={20} />
											<select 
												className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer uppercase font-black"
												value={formData.spouseId}
												onChange={e => setFormData({ ...formData, spouseId: e.target.value })}
											>
												<option value="" className="bg-zinc-950">Selecionar Parceiro</option>
												{members
													.filter(m => {
														// Se o usuário já selecionou sexo, filtramos parceiros do sexo oposto
														if (formData.sex === 'MASCULINO') return m.sex === 'FEMININO';
														if (formData.sex === 'FEMININO') return m.sex === 'MASCULINO';
														return true;
													})
													.map(m => (
														<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
													))
												}
											</select>
										</div>
									</div>
								)}
							</div>

							<div className="space-y-6">
								<div className="flex items-center justify-between p-6 bg-zinc-900/30 rounded-3xl border border-white/5 group hover:border-blue-500/20 transition-all">
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
											<Users size={24} />
										</div>
										<div>
											<p className="text-white font-black uppercase tracking-tight">Possui Filhos?</p>
											<p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Marque se tiver dependentes.</p>
										</div>
									</div>
									<button 
										type="button"
										onClick={() => setFormData({ 
											...formData, 
											hasChildren: !formData.hasChildren,
											children: !formData.hasChildren ? formData.children : [] 
										})}
										className={`w-16 h-8 rounded-full relative transition-all duration-500 ${formData.hasChildren ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-zinc-800'}`}
									>
										<div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${formData.hasChildren ? 'left-9' : 'left-1'}`} />
									</button>
								</div>

								{formData.hasChildren && (
									<div className="space-y-6 pt-4 animate-in slide-in-from-top-10">
										{formData.children.map((child, index) => (
											<div key={child.id} className="p-8 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] relative group/child overflow-hidden">
												<button 
													type="button"
													onClick={() => {
														const next = formData.children.filter((_, i) => i !== index);
														setFormData({ ...formData, children: next });
													}}
													className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-rose-500 transition-all opacity-0 group-hover/child:opacity-100"
												>
													<X size={20} />
												</button>
												<div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
													{/* Foto do Filho(a) */}
													<div className="md:col-span-3 flex flex-col items-center gap-4">
														<div 
															onClick={() => document.getElementById(`avatar-child-${index}`)?.click()}
															className="relative w-32 h-32 rounded-[2.5rem] bg-zinc-950 border-2 border-dashed border-white/5 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all overflow-hidden group/avatar"
														>
															{child.photo ? (
																<img src={child.photo} className="w-full h-full object-cover" alt="" />
															) : (
																<div className="text-center">
																	<Camera size={24} className="text-zinc-800 mb-1 mx-auto" />
																	<span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Subir Foto</span>
																</div>
															)}
															<input 
																id={`avatar-child-${index}`} 
																type="file" 
																className="hidden" 
																accept="image/*" 
																onChange={async (e) => {
																	const file = e.target.files?.[0];
																	if (file) {
																		try {
																			const url = await memberService.uploadAvatar(file);
																			const next = [...formData.children];
																			next[index].photo = url;
																			setFormData({ ...formData, children: next });
																		} catch (error) {
																			console.error('Erro ao subir foto do filho:', error);
																		}
																	}
																}} 
															/>
														</div>
														<p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Foto do Dependente</p>
													</div>

													<div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
														<div className="md:col-span-2 space-y-2">
															<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo do Filho(a)</label>
															<input 
																type="text" 
																className="w-full bg-zinc-950/50 border border-white/5 rounded-2x; py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 font-medium"
																placeholder="Nome completo"
																value={child.name}
																onChange={e => {
																	const next = [...formData.children];
																	next[index].name = e.target.value;
																	setFormData({ ...formData, children: next });
																}}
															/>
														</div>
														<div className="space-y-2">
															<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Nascimento</label>
															<input 
																type="date" 
																className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 font-medium"
																value={child.birthDate}
																onChange={e => {
																	const next = [...formData.children];
																	next[index].birthDate = e.target.value;
																	setFormData({ ...formData, children: next });
																}}
															/>
														</div>
														<div className="space-y-2">
															<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF (Opcional)</label>
															<input 
																type="text" 
																className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 font-medium"
																placeholder="000.000.000-00"
																value={child.cpf || ''}
																onChange={e => {
																	const next = [...formData.children];
																	next[index].cpf = e.target.value;
																	setFormData({ ...formData, children: next });
																}}
															/>
														</div>
														<div className="space-y-2">
															<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Idade Calculada</label>
															<div className="w-full bg-zinc-950/30 border border-white/5 rounded-2xl py-4 px-6 text-sm text-zinc-500 font-black uppercase tracking-widest">
																{child.birthDate ? `${calculateAge(child.birthDate)} ANOS` : '---'}
															</div>
														</div>
													</div>
												</div>
											</div>
										))}
										<button 
											type="button"
											onClick={() => {
												setFormData({ 
													...formData, 
													children: [...formData.children, { id: Math.random().toString(36).substr(2, 9), name: '', birthDate: '' }] 
												});
											}}
											className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black uppercase text-zinc-600 hover:text-blue-500 hover:border-blue-500/30 transition-all"
										>
											+ Adicionar Dependente
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Seção: Localização */}
						<div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 p-6 md:p-12 rounded-[3.5rem] shadow-2xl space-y-10 transition-all hover:bg-zinc-950/70">
							<div className="flex items-center gap-4">
								<div className="w-1.5 h-10 bg-indigo-600 rounded-full" />
								<div>
									<h3 className="text-2xl font-black text-white tracking-tight uppercase">Endereço</h3>
									<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Aonde vamos te visitar</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-6 gap-8">
								<div className="md:col-span-2 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">CEP</label>
									<div className="relative group/input">
										<Map className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											required
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
											placeholder="00000-000"
											value={formData.cep}
											onChange={handleCepChange}
											maxLength={9}
										/>
										{fetchingCep && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
									</div>
								</div>

								<div className="md:col-span-4 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Rua / Logradouro</label>
									<div className="relative group/input">
										<Home className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											required
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
											placeholder="Rua, Avenida..."
											value={formData.street}
											onChange={e => setFormData({ ...formData, street: e.target.value })}
										/>
									</div>
								</div>

								<div className="md:col-span-2 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Número</label>
									<div className="relative group/input">
										<MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											required
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
											placeholder="123"
											value={formData.number}
											onChange={e => setFormData({ ...formData, number: e.target.value })}
										/>
									</div>
								</div>

								<div className="md:col-span-4 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Complemento</label>
									<div className="relative group/input">
										<Building className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											type="text" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
											placeholder="Apto, Bloco..."
											value={formData.complement}
											onChange={e => setFormData({ ...formData, complement: e.target.value })}
										/>
									</div>
								</div>

								<div className="md:col-span-2 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Bairro</label>
									<input 
										required
										type="text" 
										className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
										placeholder="Bairro"
										value={formData.neighborhood}
										onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
									/>
								</div>

								<div className="md:col-span-3 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Cidade</label>
									<input 
										required
										type="text" 
										className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
										placeholder="Cidade"
										value={formData.city}
										onChange={e => setFormData({ ...formData, city: e.target.value })}
									/>
								</div>

								<div className="md:col-span-1 space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">UF</label>
									<input 
										required
										type="text" 
										className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 px-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-center"
										placeholder="SP"
										maxLength={2}
										value={formData.state}
										onChange={e => setFormData({ ...formData, state: e.target.value })}
									/>
								</div>
							</div>
						</div>

						{/* Seção: Integração Ministerial */}
						<div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 p-6 md:p-12 rounded-[3.5rem] shadow-2xl space-y-10 transition-all hover:bg-zinc-950/70">
							<div className="flex items-center gap-4">
								<div className="w-1.5 h-10 bg-emerald-600 rounded-full" />
								<div>
									<h3 className="text-2xl font-black text-white tracking-tight uppercase">Jornada Ministerial</h3>
									<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sua conexão com a visão</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Célula que Participa</label>
									<div className="relative">
										<ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<select 
											required
											disabled={!!invitedCellName}
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer uppercase font-black disabled:opacity-50"
											value={formData.cellId}
											onChange={e => {
												const cid = e.target.value;
												const target = cells.find(c => c.id === cid);
												const leaderIds = target?.leaderIds || (target?.leaderId ? [target.leaderId] : []);
												const primaryLeaderId = leaderIds[0] || '';
												const leaderData = members.find(m => m.id === primaryLeaderId);
												
												// Atualiza o label dos líderes para exibição automática
												const leaderNames = getDeduplicatedCouplesLabel(leaderIds, members);
												setInvitedCellLeadersLabel(leaderNames);

												setFormData({ 
													...formData, 
													cellId: cid, 
													disciplerId: primaryLeaderId, 
													pastorId: leaderData?.pastorId || '' 
												});
											}}
										>
											<option value="" className="bg-zinc-950">Selecionar Célula</option>
											{cells.map(c => (
												<option key={c.id} value={c.id} className="bg-zinc-950">{c.name.toUpperCase()}</option>
											))}
										</select>
									</div>
									{invitedCellName && (
										<p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest ml-4 mt-2">Você foi convidado para a célula {invitedCellName}</p>
									)}
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Líder / Discipulador</label>
									<div className="relative">
										<User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										{formData.cellId ? (
											<div className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-zinc-500 font-black uppercase whitespace-normal break-words leading-relaxed min-h-[62px] flex items-center">
												{invitedCellLeadersLabel || 'Selecione uma Célula'}
											</div>
										) : (
											<select 
												required
												className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer uppercase font-black"
												value={formData.disciplerId}
												onChange={e => {
													const did = e.target.value;
													const leader = members.find(m => m.id === did);
													setFormData({ ...formData, disciplerId: did, pastorId: leader?.pastorId || '' });
												}}
											>
												<option value="" className="bg-zinc-950">Selecionar Líder</option>
												{getDeduplicatedMembersOptions(
													members.filter(m => m.role === UserRole.CELL_LEADER_DISCIPLE || m.role === UserRole.PASTOR || m.role === UserRole.CHURCH_ADMIN)
												).map(opt => (
													<option key={opt.id} value={opt.id} className="bg-zinc-950">
														{opt.label}
													</option>
												))}

											</select>
										)}
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Pastor(es)</label>
									<div className="relative">
										<ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<div className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-zinc-500 font-black uppercase whitespace-normal break-words leading-relaxed min-h-[62px] flex items-center">
											{formData.pastorId ? (
												getDeduplicatedCouplesLabel(formData.pastorId.split(',').map(id => id.trim()), members) || 'Nenhum pastor vinculado'
											) : (
												'Nenhum pastor vinculado'
											)}
										</div>
									</div>
								</div>

								<div className="md:col-span-2 space-y-3 pt-6">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Atividades Iniciais (M12)</label>
									<div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem]">
										<DynamicForm
											fields={winActivities}
											values={formData.milestoneValues}
											onChange={async (fieldId, value) => {
												const field = winActivities.find(f => f.id === fieldId);
												if (!field) return;
												const newValues = { ...formData.milestoneValues, [field.label]: value };
												
												// Se for campo de Origem, sincroniza com formData.origin
												let extraData: any = {};
												if (field.label.toLowerCase().includes('origem')) {
													extraData.origin = value;
												}

												setFormData({ ...formData, ...extraData, milestoneValues: newValues });
											}}
											members={members}
											currentUser={{ id: 'public-registration', role: UserRole.MEMBER_VISITOR }}
											isAdmin={false}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Seção: Acesso */}
						<div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 p-6 md:p-12 rounded-[3.5rem] shadow-2xl space-y-10 transition-all hover:bg-zinc-950/70">
							<div className="flex items-center gap-4">
								<div className="w-1.5 h-10 bg-rose-600 rounded-full" />
								<div>
									<h3 className="text-2xl font-black text-white tracking-tight uppercase">Segurança</h3>
									<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sua chave de acesso ao sistema</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Senha de Acesso</label>
									<div className="relative group/input">
										<Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											required
											type="password" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all font-medium"
											placeholder="••••••••"
											value={formData.password}
											onChange={e => setFormData({ ...formData, password: e.target.value })}
										/>
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Confirmar Senha</label>
									<div className="relative group/input">
										<Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
										<input 
											required
											type="password" 
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-8 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all font-medium"
											placeholder="••••••••"
											value={formData.confirmPassword}
											onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Botão Finalizar */}
						<div className="pt-10 flex flex-col items-center gap-6">
							<button
								type="submit"
								disabled={submitting}
								className="w-full md:w-auto px-20 py-6 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
							>
								{submitting ? (
									<>
										<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Processando...
									</>
								) : (
									<>
										<UserPlus size={20} />
										Finalizar meu Cadastro
									</>
								)}
							</button>
							<p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest max-w-sm text-center leading-relaxed">
								Ao clicar em finalizar, você concorda com os termos de uso e política de privacidade da igreja.
							</p>
						</div>
					</form>
				</div>
			</div>

			{/* Modal de Crop */}
			{isCropping && (
				<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
					<div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.2)] animate-in zoom-in-95 duration-300">
						<div className="p-8 border-b border-white/5 flex items-center justify-between">
							<div>
								<h3 className="text-2xl font-black text-white uppercase tracking-tight">Recortar Foto</h3>
								<p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Ajuste o enquadramento</p>
							</div>
							<button onClick={() => setIsCropping(false)} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
								<X size={20} />
							</button>
						</div>
						
						<div className="relative h-[450px] bg-black">
							<Cropper
								image={photoPreview}
								crop={crop}
								zoom={zoom}
								aspect={1}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
								onZoomChange={setZoom}
								cropShape="round"
								showGrid={false}
							/>
						</div>
						
						<div className="p-10 space-y-8 bg-zinc-900/50">
							<div className="space-y-4">
								<div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
									<span>Zoom</span>
									<span>{Math.round(zoom * 100)}%</span>
								</div>
								<input
									type="range"
									value={zoom}
									min={1}
									max={3}
									step={0.1}
									onChange={(e) => setZoom(Number(e.target.value))}
									className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
								/>
							</div>
							
							<div className="flex gap-4">
								<button 
									onClick={() => setIsCropping(false)}
									className="flex-1 py-5 bg-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
								>
									Cancelar
								</button>
								<button 
									onClick={handleConfirmCrop}
									disabled={isProcessingCrop}
									className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
								>
									{isProcessingCrop ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar Recorte'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default PublicRegistration;
