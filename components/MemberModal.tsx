import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, User, Mail, Phone, Shield, Target, Layers, Users, Camera, MapPin, Building, Home, Map, Check, Crop as CropIcon, Heart, Lock } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './Shared/cropImage';
import { Member, UserRole, LadderStage, Cell, MemberOrigin, MemberStatus } from '../types';
import { cellService } from '../services/cellService';
import { memberService } from '../services/memberService';
import { MOCK_TENANT } from '../constants';

interface MemberModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (member: Partial<Member>) => Promise<void>;
	member?: Member | null;
}

const MemberModal: React.FC<MemberModalProps> = ({ isOpen, onClose, onSave, member }) => {
	const [formData, setFormData] = useState<Partial<Member>>({
		name: '',
		email: '',
		phone: '',
		role: UserRole.MEMBER_VISITOR,
		stage: LadderStage.WIN,
		cellId: '',
		disciplerId: '',
		avatar: '',
		origin: MemberOrigin.OTHER_CHURCH,
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
		status: MemberStatus.ACTIVE
	});
	const [confirmPassword, setConfirmPassword] = useState('');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string>('');

	// Cropper State
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
	const [isCropping, setIsCropping] = useState(false);
	const [isProcessingCrop, setIsProcessingCrop] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [fetchingCep, setFetchingCep] = useState(false);
	const [cells, setCells] = useState<Cell[]>([]);
	const [allMembers, setAllMembers] = useState<Member[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoadingData(true);
				const [cellsData, membersData] = await Promise.all([
					cellService.getAll(MOCK_TENANT.id),
					memberService.getAll(MOCK_TENANT.id)
				]);
				setCells(cellsData);
				setAllMembers(membersData);
			} catch (error) {
				console.error('Erro ao carregar dados:', error);
			} finally {
				setLoadingData(false);
			}
		};

		if (isOpen) {
			loadData();
		}
	}, [isOpen]);

	useEffect(() => {
		if (member) {
			setFormData(member);
			setConfirmPassword(member.password || '');
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
				origin: MemberOrigin.OTHER_CHURCH,
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
				status: MemberStatus.ACTIVE
			});
			setConfirmPassword('');
			setPhotoPreview('');
			setSelectedFile(null);
		}
	}, [member, isOpen]);

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

		try {
			setSaving(true);
			let finalFormData = { ...formData };

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
					<form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
						<div className="flex flex-col items-center justify-center space-y-3 mb-6">
							<div
								onClick={() => fileInputRef.current?.click()}
								className="relative w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all overflow-hidden group bg-zinc-900"
							>
								<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
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
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cargo / Perfil</label>
								<div className="relative">
									<Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										value={formData.role}
										onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										{Object.values(UserRole).filter(r => r !== UserRole.MASTER_ADMIN).map(role => (
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
										onChange={(e) => setFormData({ ...formData, stage: e.target.value as LadderStage })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										{Object.values(LadderStage).map(stage => (
											<option key={stage} value={stage} className="bg-zinc-950">{stage}</option>
										))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Célula</label>
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
										{allMembers
											.filter(m => {
												if (m.id === member?.id) return false;
												// Regra: Ocultar admin para membros e líderes de célula
												const hideAdmin = formData.role === UserRole.MEMBER_VISITOR || formData.role === UserRole.CELL_LEADER_DISCIPLE;
												if (hideAdmin && m.role === UserRole.CHURCH_ADMIN) return false;

												if (formData.role === UserRole.PASTOR) {
													return m.role === UserRole.CHURCH_ADMIN;
												}
												return m.role === UserRole.CELL_LEADER_DISCIPLE || m.role === UserRole.PASTOR || m.role === UserRole.CHURCH_ADMIN;
											})
											.map(m => (
												<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
											))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Pastor Direto</label>
								<div className="relative">
									<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										value={formData.pastorId || ''}
										onChange={(e) => setFormData({ ...formData, pastorId: e.target.value })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										<option value="" className="bg-zinc-950">Sem Pastor</option>
										{allMembers
											.filter(m => {
												if (m.id === member?.id) return false;
												// Regra: Ocultar admin para membros e líderes de célula
												const hideAdmin = formData.role === UserRole.MEMBER_VISITOR || formData.role === UserRole.CELL_LEADER_DISCIPLE;
												if (hideAdmin && m.role === UserRole.CHURCH_ADMIN) return false;

												if (formData.role === UserRole.PASTOR) {
													return m.role === UserRole.CHURCH_ADMIN || m.role === UserRole.PASTOR;
												}
												return m.role === UserRole.PASTOR || m.role === UserRole.CHURCH_ADMIN;
											})
											.map(m => (
												<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
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

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Origem / Como Chegou</label>
								<div className="relative">
									<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										value={formData.origin}
										onChange={(e) => setFormData({ ...formData, origin: e.target.value as MemberOrigin })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										{Object.values(MemberOrigin).map(origin => (
											<option key={origin} value={origin} className="bg-zinc-950">{origin}</option>
										))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Estado Civil</label>
								<div className="relative">
									<Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										value={formData.maritalStatus}
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
												.filter(m => m.id !== member?.id && m.maritalStatus === 'Casado(a)')
												.map(m => (
													<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
												))}
										</select>
									</div>
								</div>
							)}
						</div>

						<div className="pt-6 border-t border-white/5 space-y-6">
							<div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
								<div className="w-8 h-px bg-blue-500/30" />
								<span className="flex items-center gap-2"><Lock size={14} /> Acesso ao Sistema</span>
								<div className="w-full h-px bg-blue-500/30 flex-1" />
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Login de Acesso</label>
									<div className="relative">
										<User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
										<input
											disabled
											readOnly
											type="text"
											value={formData.login || ''}
											onChange={(e) => setFormData({ ...formData, login: e.target.value })}
											autoComplete="new-password"
											className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-zinc-500 focus:outline-none transition-all font-medium cursor-not-allowed"
											placeholder="ex: usuario@email.com"
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

						<div className="pt-6 border-t border-white/5 space-y-6">
							<div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
								<div className="w-8 h-px bg-blue-500/30" />
								<span className="flex items-center gap-2"><MapPin size={14} /> Endereço Residencial</span>
								<div className="w-full h-px bg-blue-500/30 flex-1" />
							</div>

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

						<div className="pt-4 flex gap-4">
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
									onClick={() => {
										setFormData({ ...formData, status: MemberStatus.ACTIVE });
										handleSubmit({ preventDefault: () => { } } as any);
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
					</form>
				)}
			</div>
		</div>
	);
};

export default MemberModal;
