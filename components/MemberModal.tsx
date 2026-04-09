import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, User, Mail, Phone, Shield, Target, Layers, Users, Camera, ImagePlus, MapPin, Building, Home, Map, Check, Crop as CropIcon, Heart, Lock, Plus, Calendar, Eye, EyeOff } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './Shared/cropImage';
import { Member, UserRole, LadderStage, Cell, MemberOrigin, MemberStatus, M12Activity } from '../types';
import { cellService } from '../services/cellService';
import { memberService } from '../services/memberService';
import { m12Service } from '../services/m12Service';
import DynamicForm from './Shared/DynamicForm';

interface MemberModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (member: Partial<Member>) => Promise<void>;
	member?: Member | null;
	user: any;
}

const MemberModal: React.FC<MemberModalProps> = ({ isOpen, onClose, onSave, member, user }) => {
	const [formData, setFormData] = useState<Partial<Member>>({
		name: '',
		email: '',
		phone: '',
		role: UserRole.MEMBER_VISITOR,
		stage: LadderStage.WIN,
		cellId: '',
		disciplerId: '',
		avatar: '',
		origin: '',
		cpf: '',
		cep: '',
		state: '',
		city: '',
		neighborhood: '',
		street: '',
		number: '',
		complement: '',
		maritalStatus: 'Solteiro(a)',
		spouseId: '',
		pastorId: '',
		login: '',
		password: '',
		status: MemberStatus.ACTIVE,
		sex: 'MASCULINO',
		hasChildren: false,
		children: [],
		leadingCellIds: [],
		birthDate: ''
	});
	const [originalPassword, setOriginalPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string>('');

	// Cropper State
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
	const [isCropping, setIsCropping] = useState(false);
	const [isProcessingCrop, setIsProcessingCrop] = useState(false);



	const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [fetchingCep, setFetchingCep] = useState(false);
	const [cells, setCells] = useState<Cell[]>([]);
	const [allMembers, setAllMembers] = useState<Member[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [saving, setSaving] = useState(false);
	const [allActivities, setAllActivities] = useState<M12Activity[]>([]);
	const [gainActivities, setGainActivities] = useState<M12Activity[]>([]);
	const [activeSection, setActiveSection] = useState<'IDENTITY' | 'MINISTERIAL' | 'FAMILY' | 'ADDRESS'>('IDENTITY');

	// Função de mapeamento para unificar camelCase (Frontend) e snake_case (Backend/Supabase)
	const normalizeMemberData = (m: any): Partial<Member> => {
		if (!m) return {};
		return {
			...m,
			churchId: m.churchId || m.church_id || '',
			maritalStatus: m.maritalStatus || m.marital_status || 'Solteiro(a)',
			spouseId: m.spouseId || m.spouse_id || '',
			pastorId: m.pastorId || m.pastor_id || '',
			disciplerId: m.disciplerId || m.discipler_id || '',
			birthDate: m.birthDate || m.birth_date || '',
			joinedDate: m.joinedDate || m.joined_date || '',
			leadingCellIds: m.leadingCellIds || m.leading_cell_ids || [],
			cellId: m.cellId || m.cell_id || '',
			firstAccessCompleted: m.firstAccessCompleted ?? m.first_access_completed ?? false,
			milestoneValues: m.milestoneValues || m.milestone_values || {}
		};
	};

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoadingData(true);
				const churchId = user?.churchId || user?.church_id;
				const [cellsData, membersData, activitiesData] = await Promise.all([
					cellService.getAll(churchId),
					memberService.getAll(churchId),
					m12Service.getActivities(churchId)
				]);
				setCells(cellsData);
				setAllMembers(membersData || []);
				setAllActivities(activitiesData || []);
				setGainActivities((activitiesData || []).filter(c => c.stage === LadderStage.WIN));
			} catch (error) {
				console.error('Erro ao carregar dados:', error);
			} finally {
				setLoadingData(false);
			}
		};

		if (isOpen) {
			loadData();
		}
	}, [isOpen, user?.churchId, user?.church_id]);

	useEffect(() => {
		if (member) {
			const normalized = normalizeMemberData(member);
			setFormData(normalized);
			setOriginalPassword(normalized.password || '');
			setConfirmPassword(normalized.password || '');
			setPhotoPreview('');
			setSelectedFile(null);
		} else {
			setFormData({
				name: '',
				email: '',
				phone: '',
				role: UserRole.MEMBER_VISITOR,
				stage: LadderStage.WIN,
				cellId: '',
				disciplerId: '',
				avatar: '',
				origin: '',
				cpf: '',
				cep: '',
				state: '',
				city: '',
				neighborhood: '',
				street: '',
				number: '',
				complement: '',
				maritalStatus: 'Solteiro(a)',
				spouseId: '',
				pastorId: '',
				login: '',
				password: '',
				status: MemberStatus.ACTIVE,
				sex: 'MASCULINO',
				hasChildren: false,
				children: [],
				leadingCellIds: [],
				birthDate: ''
			});
			setOriginalPassword('');
			setConfirmPassword('');
			setPhotoPreview('');
			setSelectedFile(null);
		}
	}, [member, isOpen]);

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
					processed.add(spouseId); // Evita gerar opção dupla se ambos estiverem na lista
					continue;
				}
			}
			
			options.push({ id: m.id, label: m.name });
		}

		return options;
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

	const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleCropConfirm = async () => {
		try {
			setIsProcessingCrop(true);
			const croppedImageFile = await getCroppedImg(
				photoPreview,
				croppedAreaPixels
			);

			if (croppedImageFile) {
				const reader = new FileReader();
				reader.onloadend = () => {
					setPhotoPreview(reader.result as string);
				};
				reader.readAsDataURL(croppedImageFile);
				setSelectedFile(croppedImageFile);
			}
			setIsCropping(false);
		} catch (e) {
			console.error(e);
			alert("Erro ao recortar imagem.");
		} finally {
			setIsProcessingCrop(false);
		}
	};

	const handleCropCancel = () => {
		setIsCropping(false);
		if (!selectedFile) {
			setPhotoPreview('');
		}
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (formData.password !== confirmPassword) {
			alert('As senhas digitadas não conferem.');
			return;
		}

		if (!formData.birthDate) {
			alert('A data de nascimento é obrigatória para todos os cadastros.');
			return;
		}

		try {
			setSaving(true);
			let finalFormData = { ...formData };

			// Se a senha não mudou, remover do payload para evitar erros de RPC no Supabase
			if (finalFormData.password === originalPassword) {
				delete finalFormData.password;
			}

			if (selectedFile) {
				const photoUrl = await memberService.uploadAvatar(selectedFile);
				finalFormData.avatar = photoUrl;
			}

			await onSave(finalFormData);
			onClose();
		} catch (error: any) {
			console.error('Erro ao salvar membro:', error);
			const errorMessage = error?.message || 'Erro ao salvar os dados do membro.';
			alert(errorMessage);
		} finally {
			setSaving(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto pt-4 md:pt-10">
			<div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

			<div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
				<div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
					<div>
						<h3 className="text-2xl font-black text-white tracking-tight">
							{isCropping ? 'Recortar Foto' : (member ? 'Editar Membro' : 'Novo Registro')}
						</h3>
						<p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
							{isCropping ? 'Ajuste a imagem para o perfil' : 'Gestão de Identidade Ministerial'}
						</p>
					</div>
					<button onClick={isCropping ? handleCropCancel : onClose} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
						<X size={20} />
					</button>
				</div>

				{isCropping ? (
					<div className="flex flex-col h-[500px]">
						<div className="relative flex-1 bg-zinc-950">
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
						<div className="p-6 bg-zinc-900 border-t border-white/5 flex items-center gap-4">
							<div className="flex-1">
								<input
									type="range"
									value={zoom}
									min={1}
									max={3}
									step={0.1}
									aria-labelledby="Zoom"
									onChange={(e) => {
										setZoom(Number(e.target.value))
									}}
									className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
								/>
							</div>
							<button
								onClick={handleCropCancel}
								className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5"
							>
								Cancelar
							</button>
							<button
								onClick={handleCropConfirm}
								disabled={isProcessingCrop}
								className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
							>
								{isProcessingCrop ? (
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<><Check size={16} /> Confirmar</>
								)}
							</button>
						</div>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="p-0 flex flex-col max-h-[85vh] overflow-hidden">
					{/* Navegação de Seções */}
					<div className="flex bg-zinc-900/50 p-2 gap-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
						{[
							{ id: 'IDENTITY', label: 'Identidade', icon: <User size={14} /> },
							{ id: 'MINISTERIAL', label: 'Ministerial', icon: <Plus size={14} /> },
							{ id: 'FAMILY', label: 'Família', icon: <Heart size={14} /> },
							{ id: 'ADDRESS', label: 'Endereço', icon: <MapPin size={14} /> },
						].map(section => (
							<button
								key={section.id}
								type="button"
								onClick={() => setActiveSection(section.id as any)}
								className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSection === section.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
							>
								{section.icon}
								{section.label}
							</button>
						))}
					</div>

					<div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
						{/* Seção de Identidade */}
						{activeSection === 'IDENTITY' && (
							<div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
								<div className="flex flex-col items-center justify-center space-y-3 mb-6 relative">
									<div
										onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
										className="relative w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all overflow-hidden group bg-zinc-900"
									>
										{photoPreview || formData.avatar ? (
											<>
												<img 
													src={photoPreview || (formData.avatar as string)} 
													onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random`; }}
													className="w-full h-full object-cover" 
													alt="Avatar" 
												/>
												<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
													<Camera className="text-white" size={24} />
												</div>
											</>
										) : (
											<div className="text-center group-hover:scale-110 transition-transform flex flex-col items-center">
												<Camera size={32} className="text-zinc-600 mb-2" />
												<span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Foto</span>
											</div>
										)}
									</div>

									{isPhotoMenuOpen && (
										<div className="absolute top-32 z-50 bg-zinc-900 border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-1 w-48 animate-in fade-in slide-in-from-top-2">
											<button
												type="button"
												onClick={() => { cameraInputRef.current?.click(); setIsPhotoMenuOpen(false); }}
												className="flex items-center gap-3 px-4 py-3 text-sm text-white font-medium hover:bg-zinc-800 rounded-xl transition-colors text-left"
											>
												<Camera size={18} className="text-blue-500" />
												Tirar Foto
											</button>
											<button
												type="button"
												onClick={() => { galleryInputRef.current?.click(); setIsPhotoMenuOpen(false); }}
												className="flex items-center gap-3 px-4 py-3 text-sm text-white font-medium hover:bg-zinc-800 rounded-xl transition-colors text-left"
											>
												<ImagePlus size={18} className="text-blue-500" />
												Escolher da Galeria
											</button>
										</div>
									)}

									<input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="user" onChange={handleFileChange} />
									<input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome Completo</label>
										<div className="relative">
											<User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												required
												type="text"
												value={formData.name}
												onChange={(e) => setFormData({ ...formData, name: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="Ex: Adriano Amorim"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">E-mail</label>
										<div className="relative">
											<Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												required
												type="email"
												value={formData.email}
												onChange={(e) => {
													const email = e.target.value.toLowerCase();
													setFormData({ ...formData, email, login: email });
												}}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="exemplo@email.com"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Gênero</label>
										<div className="relative">
											<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.sex}
												onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												<option value="MASCULINO" className="bg-zinc-950">Masculino</option>
												<option value="FEMININO" className="bg-zinc-950">Feminino</option>
											</select>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Data de Nascimento *</label>
										<div className="relative">
											<Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												required
												type="date"
												value={formData.birthDate || ''}
												onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Telefone / WhatsApp</label>
										<div className="relative">
											<Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												required
												type="text"
												value={formData.phone}
												onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="(00) 00000-0000"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Login de Acesso</label>
										<div className="relative">
											<User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												disabled
												readOnly
												type="text"
												value={formData.login || ''}
												className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-zinc-500 font-medium cursor-not-allowed"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Senha</label>
										<div className="relative">
											<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="password"
												value={formData.password || ''}
												onChange={(e) => setFormData({ ...formData, password: e.target.value })}
												autoComplete="new-password"
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="••••••••"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Confirmar Senha</label>
										<div className="relative">
											<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="••••••••"
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Seção Ministerial */}
						{activeSection === 'MINISTERIAL' && (
							<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cargo / Perfil</label>
										<div className="relative">
											<Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.role}
												onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												{Object.values(UserRole).filter(r => r !== 'MASTER ADMIN' && r !== 'ADMINISTRADOR DA IGREJA').map(role => (
													<option key={role} value={role} className="bg-zinc-950">{role}</option>
												))}
											</select>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Estágio na Escada</label>
										<div className="relative">
											<Target className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.stage}
												onChange={(e) => {
													const newStage = e.target.value as LadderStage;
													let extraData: any = {};
													if (newStage === 'ENVIAR') {
														const m12Label = (allActivities || []).find(a => a.stage === 'ENVIAR' && a.label.toLowerCase().includes('m12'))?.label || 'Você é um M12?';
														extraData.milestoneValues = {
															...(formData.milestoneValues || {}),
															[m12Label]: true
														};
														extraData.completedMilestones = Array.from(new Set([...(formData.completedMilestones || []), m12Label]));
													}
													setFormData({ ...formData, stage: newStage, ...extraData });
												}}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												{Object.values(LadderStage).map(stage => (
													<option key={stage} value={stage} className="bg-zinc-950">{stage}</option>
												))}
											</select>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Célula que Participa</label>
										<div className="relative">
											<Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.cellId}
												onChange={(e) => setFormData({ ...formData, cellId: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												<option value="" className="bg-zinc-950">Sem Célula</option>
												{cells.map(cell => (
													<option key={cell.id} value={cell.id} className="bg-zinc-950">{cell.name}</option>
												))}
											</select>
										</div>
									</div>

									{(formData.role === UserRole.CELL_LEADER_DISCIPLE || formData.role === UserRole.PASTOR || formData.role === UserRole.CHURCH_ADMIN) && (
										<div className="space-y-2 md:col-span-2">
											<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Célula que Lidera (Eco-sistema)</label>
											<div className="relative">
												<Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
												<select
													value={(formData.leadingCellIds && formData.leadingCellIds.length > 0) ? formData.leadingCellIds[0] : ''}
													onChange={(e) => setFormData({ ...formData, leadingCellIds: e.target.value ? [e.target.value] : [] })}
													className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
												>
													<option value="" className="bg-zinc-950">Selecione a Célula que Lidera</option>
													{cells.map(cell => (
														<option key={cell.id} value={cell.id} className="bg-zinc-950">{cell.name}</option>
													))}
												</select>
											</div>
										</div>
									)}

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Discipulador</label>
										<div className="relative">
											<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.disciplerId || ''}
												onChange={(e) => setFormData({ ...formData, disciplerId: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												<option value="" className="bg-zinc-950">Sem Discipulador</option>
												{getDeduplicatedMembersOptions(
													allMembers.filter(m => {
														if (m.id === member?.id) return false;
														const isLeader = m.role === UserRole.CELL_LEADER_DISCIPLE || m.role === 'LEADER' || m.role === 'CELL_LEADER' || m.role === 'CELL_LEADER_DISCIPLE';
														const isPastor = m.role === UserRole.PASTOR || m.role === 'PASTOR';
														const isAdmin = m.role === UserRole.CHURCH_ADMIN || m.role === 'ADMIN' || m.role === 'CHURCH_ADMIN';
														
														if (formData.role === UserRole.PASTOR) return isAdmin;
														return isLeader || isPastor || isAdmin;
													})
												).map(opt => (
													<option key={opt.id} value={opt.id} className="bg-zinc-950">{opt.label}</option>
												))}
											</select>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Pastores</label>
										<div className="relative">
											<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.pastorId || ''}
												onChange={(e) => setFormData({ ...formData, pastorId: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												<option value="" className="bg-zinc-950">Selecione os Pastores</option>
												{getDeduplicatedMembersOptions(
													allMembers.filter(m => {
														if (m.id === member?.id) return false;
														const isPastor = m.role === UserRole.PASTOR || m.role === 'PASTOR';
														const isAdmin = m.role === UserRole.CHURCH_ADMIN || m.role === 'ADMIN' || m.role === 'CHURCH_ADMIN';
														return isPastor || isAdmin;
													})
												).map(opt => (
													<option key={opt.id} value={opt.id} className="bg-zinc-950">{opt.label}</option>
												))}
											</select>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF</label>
										<div className="relative">
											<Target className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
											<input
												value={formData.cpf || ''}
												onChange={e => setFormData({ ...formData, cpf: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="000.000.000-00"
											/>
										</div>
									</div>

									{/* Ficha Ministerial Dinâmica */}
									<div className="md:col-span-2 space-y-4 pt-4">
										<div className="flex items-center gap-4 text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
											<div className="w-8 h-px bg-white/10" />
											<span className="flex items-center gap-2"><Target size={14} className="text-blue-500" /> Ficha Ministerial ({formData.stage})</span>
											<div className="w-full h-px bg-white/10 flex-1" />
										</div>
										<div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem]">
											<DynamicForm
												fields={(allActivities || []).filter(a => a.stage === formData.stage && a.isActive && (formData.stage !== 'ENVIAR' || a.label.toLowerCase().includes('m12')))}
												values={formData.milestoneValues || {}}
												onChange={async (fieldId, value) => {
													const field = allActivities.find(f => f.id === fieldId);
													if (!field) return;
													const newValues = { ...(formData.milestoneValues || {}), [field.label]: value };
													let extraData: any = {};
													if (formData.stage === LadderStage.WIN && field.label.toLowerCase().includes('origem')) {
														extraData.origin = value;
													}
													const isNowDone = (field.logicType === 'BOOLEAN' && value === true) || (field.logicType === 'STATUS' && value === 'Concluído') || (['SELECT', 'MULTI_SELECT', 'DATE', 'TEXT', 'NUMBER', 'UPLOAD', 'RELATIONAL'].includes(field.logicType) && !!value);
													const newMilestones = isNowDone ? Array.from(new Set([...(formData.completedMilestones || []), field.label])) : (formData.completedMilestones || []).filter(m => m !== field.label);
													setFormData({ ...formData, ...extraData, milestoneValues: newValues, completedMilestones: newMilestones });
												}}
												members={allMembers}
												currentUser={user}
												isAdmin={user.role === UserRole.CHURCH_ADMIN || user.role === UserRole.MASTER_ADMIN || user.role === UserRole.PASTOR}
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Seção de Família */}
						{activeSection === 'FAMILY' && (
							<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Estado Civil</label>
										<div className="relative">
											<Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<select
												value={formData.maritalStatus || 'Solteiro(a)'}
												onChange={(e) => {
													const newStatus = e.target.value;
													setFormData({ ...formData, maritalStatus: newStatus, spouseId: newStatus === 'Casado(a)' ? formData.spouseId : '' });
												}}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
											>
												{['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'].map(status => (
													<option key={status} value={status} className="bg-zinc-950">{status}</option>
												))}
											</select>
										</div>
									</div>

									{formData.maritalStatus === 'Casado(a)' && (
										<div className="space-y-2">
											<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cônjuge</label>
											<div className="relative">
												<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
												<select
													value={formData.spouseId || ''}
													onChange={(e) => setFormData({ ...formData, spouseId: e.target.value })}
													className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
												>
													<option value="" className="bg-zinc-950">Selecione o Cônjuge</option>
													{allMembers
														.filter(m => m.id !== member?.id && (m.maritalStatus === 'Casado(a)' || m.marital_status === 'Casado(a)'))
														.map(m => (
															<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
														))}
												</select>
											</div>
										</div>
									)}

									<div className="space-y-4 md:col-span-2">
										<div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-[1.5rem]">
											<div>
												<p className="text-sm font-black text-white uppercase tracking-tight">Possui Filhos?</p>
												<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Gestão de Núcleo Familiar</p>
											</div>
											<button 
												type="button"
												onClick={() => setFormData({ ...formData, hasChildren: !formData.hasChildren, children: !formData.hasChildren ? formData.children : [] })}
												className={`w-14 h-7 rounded-full relative transition-all duration-300 ${formData.hasChildren ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-zinc-800'}`}
											>
												<div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${formData.hasChildren ? 'left-8' : 'left-1'}`} />
											</button>
										</div>

										{formData.hasChildren && (
											<div className="space-y-4 pt-4">
												{formData.children?.map((child, index) => (
													<div key={child.id} className="p-6 bg-zinc-900 border border-white/5 rounded-[2rem] relative group animate-in slide-in-from-top-4">
														<button 
															type="button"
															onClick={() => {
																const newChildren = (formData.children || []).filter((_, i) => i !== index);
																setFormData({ ...formData, children: newChildren });
															}}
															className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-800 border border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-rose-500 transition-all shadow-xl"
														>
															<X size={14} />
														</button>
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
															<div className="space-y-2">
																<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome do Filho(a)</label>
																<input
																	type="text"
																	value={child.name}
																	onChange={(e) => {
																		const newChildren = [...(formData.children || [])];
																		newChildren[index].name = e.target.value;
																		setFormData({ ...formData, children: newChildren });
																	}}
																	className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
																	placeholder="Nome completo"
																/>
															</div>
															<div className="space-y-2">
																<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Data de Nascimento</label>
																<input
																	type="date"
																	value={child.birthDate}
																	onChange={(e) => {
																		const newChildren = [...(formData.children || [])];
																		newChildren[index].birthDate = e.target.value;
																		setFormData({ ...formData, children: newChildren });
																	}}
																	className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
																/>
															</div>
															<div className="space-y-2">
																<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CPF (Opcional)</label>
																<input
																	type="text"
																	value={child.cpf || ''}
																	onChange={(e) => {
																		const newChildren = [...(formData.children || [])];
																		newChildren[index].cpf = e.target.value;
																		setFormData({ ...formData, children: newChildren });
																	}}
																	className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
																	placeholder="000.000.000-00"
																/>
															</div>
															<div className="space-y-2 sm:col-span-2">
																<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Foto (Opcional)</label>
																<div className="flex items-center gap-4">
																	<div className="relative w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden flex items-center justify-center group/child">
																		{child.photo ? (
																			<img src={child.photo} className="w-full h-full object-cover" alt="" />
																		) : (
																			<Camera size={20} className="text-zinc-700" />
																		)}
																		<input 
																			type="file" 
																			className="absolute inset-0 opacity-0 cursor-pointer" 
																			accept="image/*"
																			onChange={async (e) => {
																				const file = e.target.files?.[0];
																				if (file) {
																					try {
																						const photoUrl = await memberService.uploadAvatar(file);
																						const newChildren = [...(formData.children || [])];
																						newChildren[index].photo = photoUrl;
																						setFormData({ ...formData, children: newChildren });
																					} catch (err) {
																						console.error("Erro ao subir foto do filho:", err);
																						alert("Erro ao subir imagem.");
																					}
																				}
																			}}
																		/>
																	</div>
																	<div className="flex-1">
																		<p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Clique para enviar <br />foto do filho(a)</p>
																	</div>
																</div>
															</div>
														</div>
													</div>
												))}
												<button
													type="button"
													onClick={() => {
														const newChild = { id: Math.random().toString(36).substr(2, 9), name: '', birthDate: '', cpf: '' };
														setFormData({ ...formData, children: [...(formData.children || []), newChild] });
													}}
													className="w-full py-4 bg-zinc-900 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-zinc-500 hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center gap-3"
												>
													<Plus size={16} /> Adicionar Filho(a)
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Seção de Endereço */}
						{activeSection === 'ADDRESS' && (
							<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CEP</label>
										<div className="relative">
											<Map className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.cep || ''}
												onChange={handleCepChange}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="00000-000"
												maxLength={9}
											/>
											{fetchingCep && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
										</div>
									</div>

									<div className="space-y-2 md:col-span-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Rua / Logradouro</label>
										<div className="relative">
											<Home className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.street || ''}
												onChange={(e) => setFormData({ ...formData, street: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="Nome da rua"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Número</label>
										<div className="relative">
											<MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.number || ''}
												onChange={(e) => setFormData({ ...formData, number: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="123"
											/>
										</div>
									</div>

									<div className="space-y-2 md:col-span-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Complemento</label>
										<div className="relative">
											<Building className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.complement || ''}
												onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="Apto, Bloco, etc"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Bairro</label>
										<div className="relative">
											<Map className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.neighborhood || ''}
												onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="Bairro"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cidade</label>
										<div className="relative">
											<Building className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.city || ''}
												onChange={(e) => setFormData({ ...formData, city: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="Cidade"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">UF</label>
										<div className="relative">
											<MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
											<input
												type="text"
												value={formData.state || ''}
												onChange={(e) => setFormData({ ...formData, state: e.target.value })}
												className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
												placeholder="SP"
												maxLength={2}
											/>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="p-6 border-t border-white/5 bg-zinc-900/30">
						<div className="flex gap-4">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
							>
								Cancelar
							</button>
							{member?.status === MemberStatus.PENDING && (
								<button
									type="button"
									onClick={async () => {
										try {
											setSaving(true);
											let finalFormData: any = { status: MemberStatus.ACTIVE };
											const { password, ...otherData } = formData;
											finalFormData = { ...otherData, ...finalFormData };
											if (selectedFile) {
												const photoUrl = await memberService.uploadAvatar(selectedFile);
												finalFormData.avatar = photoUrl;
											}
											await onSave(finalFormData);
											onClose();
										} catch (error: any) {
											console.error('Erro ao aprovar membro:', error);
											alert(error?.message || 'Erro ao aprovar o membro.');
										} finally {
											setSaving(false);
										}
									}}
									disabled={saving}
									className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
								>
									<Check size={18} /> Aprovar Cadastro
								</button>
							)}
							<button
								type="submit"
								disabled={saving || loadingData}
								className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
							>
								{saving ? (
									<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<>
										<Save size={18} />
										{member ? 'Salvar Alterações' : 'Finalizar Cadastro'}
									</>
								)}
							</button>
						</div>
					</div>
				</form>
				)}
			</div>
		</div>
	);
};

export default MemberModal;
