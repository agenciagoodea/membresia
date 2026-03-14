import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChurchTenant, UserRole, LadderStage, MemberOrigin, Cell, Member } from '../../types';
import { churchService } from '../../services/churchService';
import { memberService } from '../../services/memberService';
import { cellService } from '../../services/cellService';
import { CheckCircle2, UserPlus, Phone, Mail, User, ShieldCheck, Lock, Upload, MapPin, Map, Home, Building, Camera, X, Crop as CropIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../Shared/cropImage';

const PublicRegistration = () => {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [church, setChurch] = useState<ChurchTenant | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);

	const [cells, setCells] = useState<Cell[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [fetchingCep, setFetchingCep] = useState(false);

	const [formData, setFormData] = useState({
		name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '',
		cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
		origin: MemberOrigin.EVANGELISM as MemberOrigin, cellId: '', disciplerId: '', pastorId: '', maritalStatus: '', spouseId: '', avatar: ''
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
					const [fetchedCells, fetchedMembers] = await Promise.all([
						cellService.getAll(found.id),
						memberService.getAll(found.id)
					]);
					setCells(fetchedCells);
					setMembers(fetchedMembers);
				}
			} catch (err) {
				console.error("Igreja não encontrada", err);
			} finally {
				setLoading(false);
			}
		};
		loadChurch();
	}, [slug]);

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

	const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			setPhotoPreview(reader.result as string);
			setIsCropping(true);
		};
		reader.readAsDataURL(file);
	};

	const onCropComplete = React.useCallback((_croppedArea: any, croppedAreaPixels: any) => {
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
					setFormData(prev => ({ ...prev, avatar: reader.result as string }));
					setSelectedFile(croppedImageFile);
				};
				reader.readAsDataURL(croppedImageFile);
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!church) return;

		if (!formData.avatar) {
			alert("A foto de perfil é OBRIGATÓRIA. Envie uma foto de boa qualidade do seu rosto.");
			return;
		}

		if (formData.password !== formData.confirmPassword) {
			alert("As senhas não coincidem!");
			return;
		}

		setSubmitting(true);
		try {
			let finalAvatar = formData.avatar;
			if (selectedFile) {
				finalAvatar = await memberService.uploadAvatar(selectedFile);
			}

			await memberService.create({
				name: formData.name,
				email: formData.email,
				login: formData.email,
				phone: formData.phone,
				cpf: formData.cpf,
				cep: formData.cep,
				street: formData.street,
				number: formData.number,
				complement: formData.complement,
				neighborhood: formData.neighborhood,
				city: formData.city,
				state: formData.state,
				origin: formData.origin,
				cellId: formData.cellId,
				disciplerId: formData.disciplerId,
				pastorId: formData.pastorId,
				maritalStatus: formData.maritalStatus,
				spouseId: formData.spouseId,
				avatar: finalAvatar,
				role: UserRole.MEMBER_VISITOR,
				stage: LadderStage.WIN,
				joinedDate: new Date().toISOString(),
				church_id: church.id,
				stageHistory: [],
				password: formData.password
			} as any);

			setSuccess(true);
		} catch (err: any) {
			console.error(err);
			const errorMessage = err?.message || "Houve um erro ao processar seu cadastro. Pode ser que o e-mail ou CPF já estejam em uso.";
			alert(errorMessage);
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
				<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
				<p className="text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando...</p>
			</div>
		);
	}

	if (!church || success) {
		return (
			<div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
				{success ? (
					<div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-500">
						<div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-inner">
							<CheckCircle2 size={40} />
						</div>
						<h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Cadastro Concluído!</h2>
						<p className="text-zinc-400 text-sm mb-8 leading-relaxed font-medium">
							Sua conta na instituição <span className="text-white font-bold">{church.name}</span> foi criada com sucesso. Procure a liderança para obter seu acesso.
						</p>
					</div>
				) : (
					<div className="flex flex-col items-center">
						<ShieldCheck size={48} className="text-rose-500 mb-6" />
						<h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Link Inválido</h1>
						<p className="text-zinc-500 font-medium max-w-sm">A instituição que você está tentando acessar não foi encontrada no servidor.</p>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-x-hidden selection:bg-blue-500/30">
			{/* Fundo Imersivo (Tela Cheia) */}
			<div className="fixed inset-0 z-0">
				<div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-zinc-950/90 to-zinc-950 z-10" />
				<div 
					className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
					style={{ 
						backgroundImage: "url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2000&auto=format&fit=crop')",
						filter: 'brightness(0.4) saturate(1.2)'
					}} 
				/>
			</div>

			{/* Modal do Cropper de Foto */}
			{isCropping && (
				<div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto pt-4 md:pt-10 backdrop-blur-md">
					<div className="absolute inset-0 bg-black/60" onClick={handleCropCancel} />
					<div className="relative w-full max-w-lg mx-auto bg-zinc-950/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
						<div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
							<div>
								<h3 className="text-lg font-black text-white tracking-tight">Ajustar Foto de Perfil</h3>
								<p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Recorte para enquadrar seu rosto</p>
							</div>
							<button type="button" onClick={handleCropCancel} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
								<X size={20} />
							</button>
						</div>
						<div className="relative h-[50vw] max-h-[380px] min-h-[260px] bg-black/20">
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
								style={{
									containerStyle: { backgroundColor: 'transparent' },
									cropAreaStyle: { border: '2px solid rgba(255,255,255,0.5)' }
								}}
							/>
						</div>
						<div className="p-5 bg-white/5 border-t border-white/5">
							<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 text-center">Ajuste o Zoom</label>
							<input type="range" value={zoom} min={1} max={3} step={0.1}
								aria-label="Zoom" onChange={(e) => setZoom(Number(e.target.value))}
								className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-6"
							/>
							<div className="flex gap-3">
								<button type="button" onClick={handleCropCancel} disabled={isProcessingCrop}
									className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/10 transition-all">
									Cancelar
								</button>
								<button type="button" onClick={handleCropConfirm} disabled={isProcessingCrop}
									className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20">
									{isProcessingCrop
										? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										: <><CropIcon size={16} /> Confirmar</>
									}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="relative z-10 flex flex-col items-center">
				{/* Header Imersivo */}
				<div className="w-full py-12 md:py-20 flex flex-col items-center animate-in fade-in slide-in-from-top-10 duration-1000">
					<div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/20 mb-8 p-5 shadow-2xl transition-transform hover:scale-110">
						{church.logo ? (
							<img src={church.logo} className="w-full h-full object-contain" alt="Logo" />
						) : (
							<div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl">
								{church.name.charAt(0)}
							</div>
						)}
					</div>
					<h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter text-center px-4 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] max-w-3xl leading-none">
						{church.name}
					</h1>
					<div className="h-1 w-20 bg-blue-500 mt-6 md:mt-8 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
				</div>

				{/* Formulário com Efeito de Vidro */}
				<div className="w-full max-w-4xl px-4 sm:px-8 pb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
					<div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 lg:p-16 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
						<div className="mb-12 text-center">
							<span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-3 block">Ambiente de Cadastro</span>
							<h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Ficha Ministerial</h2>
							<p className="text-zinc-400 text-xs font-medium uppercase tracking-widest mt-2 opacity-60">Sincronizando seus dados com a rede local</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-12">
							{/* Seção 1: Foto */}
							<div className="flex flex-col items-center">
								<div className="relative group mb-8">
									<div className={`w-44 h-44 rounded-full flex items-center justify-center border-2 border-dashed ${formData.avatar ? 'border-transparent' : 'border-white/10 bg-white/5'} overflow-hidden shadow-2xl transition-all group-hover:border-blue-500/50 backdrop-blur-md relative`}>
										{formData.avatar ? (
											<img src={formData.avatar} className="w-full h-full object-cover rounded-full" alt="Sua Foto" />
										) : (
											<div className="flex flex-col items-center text-zinc-500">
												<Camera size={48} className="mb-2 opacity-20" />
												<span className="text-[10px] font-black uppercase tracking-widest text-center opacity-40">Perfil</span>
											</div>
										)}
									</div>
								</div>

								<div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
									<label htmlFor="camera-upload" className="flex-1 flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl cursor-pointer transition-all shadow-xl shadow-blue-500/10 group">
										<Camera size={20} className="group-hover:scale-110 transition-transform" />
										<div className="flex flex-col items-start leading-none">
											<span className="text-[11px] font-black uppercase tracking-wider">Tirar Foto</span>
											<span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-0.5">Usar Câmera</span>
										</div>
									</label>
									
									<label htmlFor="gallery-upload" className="flex-1 flex items-center justify-center gap-3 py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl cursor-pointer border border-white/5 transition-all group">
										<Upload size={20} className="group-hover:-translate-y-1 transition-transform text-zinc-500" />
										<div className="flex flex-col items-start leading-none">
											<span className="text-[11px] font-black uppercase tracking-wider">Galeria</span>
											<span className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-0.5">Escolher Arquivo</span>
										</div>
									</label>
								</div>

								<input id="camera-upload" type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
								<input id="gallery-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
								
								<div className="mt-6 px-6 py-2 bg-rose-500/5 border border-rose-500/10 rounded-full">
									<p className="text-[9px] text-rose-500/70 font-black uppercase tracking-widest text-center italic">⚠️ A foto de perfil é obrigatória para identificação</p>
								</div>
							</div>

							{/* Seção 2: Dados Básicos */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="md:col-span-2 flex items-center gap-4 text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">
									<span className="shrink-0">Dados Pessoais</span>
									<div className="h-px bg-white/10 w-full" />
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Nome Civil Completo</label>
									<div className="relative group">
										<User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
										<input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" placeholder="Digite seu nome..." />
									</div>
								</div>
								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Número do CPF</label>
									<div className="relative group">
										<ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
										<input required value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" placeholder="000.000.000-00" />
									</div>
								</div>
								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Estado Civil</label>
									<select value={formData.maritalStatus} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
										<option value="" className="bg-zinc-900">Selecione...</option>
										<option value="Solteiro(a)" className="bg-zinc-900">Solteiro(a)</option>
										<option value="Casado(a)" className="bg-zinc-900">Casado(a)</option>
										<option value="Divorciado(a)" className="bg-zinc-900">Divorciado(a)</option>
										<option value="Viúvo(a)" className="bg-zinc-900">Viúvo(a)</option>
									</select>
								</div>
								{formData.maritalStatus === 'Casado(a)' && (
									<div className="space-y-3">
										<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Cônjuge (Se for membro)</label>
										<select value={formData.spouseId} onChange={e => setFormData({ ...formData, spouseId: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
											<option value="" className="bg-zinc-900">Selecione o cônjuge...</option>
											{members
												.filter(m => m.id !== formData.spouseId && m.maritalStatus === 'Casado(a)')
												.map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)}
										</select>
									</div>
								)}
							</div>

							{/* Seção 3: Endereço */}
							<div className="grid grid-cols-1 md:grid-cols-6 gap-6">
								<div className="md:col-span-6 flex items-center gap-4 text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em]">
									<span className="shrink-0">Endereço Residencial</span>
									<div className="h-px bg-white/10 w-full" />
								</div>

								<div className="space-y-3 md:col-span-2">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">CEP</label>
									<div className="relative group">
										<MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
										<input value={formData.cep} onChange={handleCepChange} maxLength={9} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" placeholder="00000-000" />
										{fetchingCep && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
									</div>
								</div>
								<div className="space-y-3 md:col-span-4">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Rua / Logradouro</label>
									<div className="relative group">
										<Home size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
										<input value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" placeholder="Nome da via..." />
									</div>
								</div>
								<div className="space-y-3 md:col-span-2">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Número</label>
									<input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" placeholder="Ex: 123" />
								</div>
								<div className="space-y-3 md:col-span-4">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Complemento / Bairro</label>
									<div className="relative group">
										<Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
										<input value={`${formData.neighborhood}${formData.complement ? ' - ' + formData.complement : ''}`} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-700" />
									</div>
								</div>
								<div className="space-y-3 md:col-span-4">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Cidade de Residência</label>
									<input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-medium" />
								</div>
								<div className="space-y-3 md:col-span-2">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">UF</label>
									<input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} maxLength={2} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-4 text-sm text-center text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-bold uppercase" />
								</div>
							</div>

							{/* Seção 4: Eclesiástico */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="md:col-span-2 flex items-center gap-4 text-amber-500 font-black text-[10px] uppercase tracking-[0.3em]">
									<span className="shrink-0">Vida na Comunidade</span>
									<div className="h-px bg-white/10 w-full" />
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Origem / Indicação</label>
									<select value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value as MemberOrigin })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
										<option value={MemberOrigin.EVANGELISM} className="bg-zinc-900">Evangelismo / Ganho</option>
										<option value={MemberOrigin.CELL_VISIT} className="bg-zinc-900">Visita na Célula</option>
										<option value={MemberOrigin.PRAYER_REQUEST} className="bg-zinc-900">Pedido de Oração (Telão)</option>
										<option value={MemberOrigin.OTHER_CHURCH} className="bg-zinc-900">Transmissão de Outra Igreja</option>
									</select>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Célula Principal</label>
									<select value={formData.cellId} onChange={e => setFormData({ ...formData, cellId: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
										<option value="" className="bg-zinc-900">Ainda não participo...</option>
										{cells.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>)}
									</select>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Líder Direto / Cuidado</label>
									<select value={formData.disciplerId} onChange={e => setFormData({ ...formData, disciplerId: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
										<option value="" className="bg-zinc-900">Não tenho / Não sei</option>
										{members
											.filter(m => m.role === UserRole.CELL_LEADER_DISCIPLE)
											.map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)}
									</select>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Pastor(a) Supervisor</label>
									<select value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })} className="w-full bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl py-5 px-6 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all font-medium appearance-none cursor-pointer">
										<option value="" className="bg-zinc-900">Não tenho / Não sei</option>
										{members
											.filter(m => m.role === UserRole.PASTOR)
											.map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)}
									</select>
								</div>
							</div>

							{/* Seção 5: Acesso Digital */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10">
								<div className="md:col-span-2 flex items-center gap-4 text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">
									<span className="shrink-0">Credenciais Digitais</span>
									<div className="h-px bg-blue-500/20 w-full" />
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Seu WhatsApp</label>
									<div className="relative group">
										<Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
										<input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-zinc-950/40 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium" placeholder="(00) 00000-0000" />
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-2">E-mail (Será seu Login)</label>
									<div className="relative group">
										<Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold" />
										<input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-md rounded-2xl py-5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-zinc-700" placeholder="escolha@email.com" />
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Nova Senha</label>
									<div className="relative group">
										<Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
										<input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-zinc-950/40 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-zinc-700" placeholder="••••••••" />
									</div>
								</div>

								<div className="space-y-3">
									<label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Confirme a Senha</label>
									<div className="relative group">
										<Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
										<input type="password" required value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full bg-zinc-950/40 border border-white/5 backdrop-blur-md rounded-2xl py-5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-zinc-700" placeholder="••••••••" />
									</div>
								</div>
							</div>

							<button
								type="submit"
								disabled={submitting}
								className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-all flex items-center justify-center gap-4 disabled:opacity-50 group hover:scale-[1.02] active:scale-95 duration-200 mt-12 mb-4"
							>
								{submitting ? (
									<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<>
										<UserPlus size={22} className="group-hover:rotate-12 transition-transform" /> 
										Finalizar Cadastro Oficial
									</>
								)}
							</button>

							<p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">
								Ao confirmar, seus dados serão enviados sob criptografia end-to-end.
							</p>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PublicRegistration;
