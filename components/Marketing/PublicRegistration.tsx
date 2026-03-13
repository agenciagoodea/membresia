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
		} catch (err) {
			console.error(err);
			alert("Houve um erro ao processar seu cadastro. Pode ser que o e-mail ou CPF já estejam em uso.");
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
		<div className="min-h-screen bg-zinc-950 flex flex-col relative overflow-x-hidden">
			{/* Modal do Cropper de Foto — fora do contêiner com scroll para funcionar corretamente */}
			{isCropping && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={handleCropCancel} />
					<div className="relative w-full max-w-lg mx-auto bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
						<div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/80">
							<div>
								<h3 className="text-lg font-black text-white tracking-tight">Ajustar Foto de Perfil</h3>
								<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Recorte para enquadrar seu rosto</p>
							</div>
							<button type="button" onClick={handleCropCancel} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
								<X size={20} />
							</button>
						</div>
						<div className="relative h-[50vw] max-h-[380px] min-h-[260px] bg-zinc-950">
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
									containerStyle: { backgroundColor: '#09090b' },
									cropAreaStyle: { border: '2px solid rgba(255,255,255,0.5)' }
								}}
							/>
						</div>
						<div className="p-5 bg-zinc-900/80 border-t border-white/5">
							<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-3">Zoom</label>
							<input type="range" value={zoom} min={1} max={3} step={0.1}
								aria-label="Zoom" onChange={(e) => setZoom(Number(e.target.value))}
								className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-6"
							/>
							<div className="flex gap-3">
								<button type="button" onClick={handleCropCancel} disabled={isProcessingCrop}
									className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-zinc-300 hover:bg-white/5 transition-all">
									Cancelar
								</button>
								<button type="button" onClick={handleCropConfirm} disabled={isProcessingCrop}
									className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
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
			{/* Banner Topo */}
			<div className="w-full h-48 md:h-64 relative flex items-center justify-center overflow-hidden shrink-0">
				<div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-zinc-950 z-0" />
				<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center md:bg-[center_top_-200px] opacity-10 mix-blend-luminosity z-0" />
				<div className="relative z-10 flex flex-col items-center mt-8">
					<div className="w-20 h-20 bg-white/5 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/10 mb-4 p-4 shadow-2xl">
						{church.logo ? (
							<img src={church.logo} className="w-full h-full object-contain" alt="Logo" />
						) : (
							<div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl">
								{church.name.charAt(0)}
							</div>
						)}
					</div>
					<h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight text-center px-4 drop-shadow-md">
						{church.name}
					</h1>
				</div>
			</div>

			{/* Formulário */}
			<div className="flex-1 flex items-start justify-center p-4 sm:p-8 relative z-10 overflow-y-auto w-full">
				<div className="w-full max-w-4xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl -mt-16 sm:-mt-24 mb-10 text-left">

					<div className="mb-8 text-center">
						<h2 className="text-xl font-black text-white uppercase tracking-tight">Ficha de Membro</h2>
						<p className="text-zinc-400 text-xs font-medium uppercase tracking-widest mt-1">Preencha seus dados reais com atenção</p>
					</div>


					<form onSubmit={handleSubmit} className="space-y-8">
						{/* Seção 1: Foto */}
						<div className="flex flex-col items-center">
							<div className="relative group cursor-pointer mb-2">
								<div className={`w-36 h-36 rounded-full flex items-center justify-center border-2 border-dashed ${formData.avatar ? 'border-transparent' : 'border-zinc-700 bg-zinc-950'} overflow-hidden shadow-2xl transition-all group-hover:border-blue-500 group-hover:bg-blue-500/5`}>
									{formData.avatar ? (
										<img src={formData.avatar} className="w-full h-full object-cover rounded-full" alt="Sua Foto" />
									) : (
										<div className="flex flex-col items-center text-zinc-500 group-hover:text-blue-500 transition-colors">
											<Camera size={32} className="mb-2" />
											<span className="text-[9px] font-black uppercase tracking-widest text-center">Enviar<br />Foto</span>
										</div>
									)}
								</div>
								<label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
									<Upload className="text-white mb-1" size={24} />
									<span className="text-white text-[9px] font-black uppercase tracking-widest">Mudar Foto</span>
								</label>
								<input id="avatar-upload" type="file" accept="image/*" className="hidden" aria-hidden="true" onChange={handlePhotoSelect} />
							</div>
							<p className="text-[10px] text-rose-400 font-bold max-w-xs text-center">⚠️ A foto de perfil é OBRIGATÓRIA. Envie uma imagem nítida, de boa qualidade, apenas do seu rosto.</p>
						</div>

						{/* Seção 2: Dados Básicos */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-950 rounded-3xl border border-white/5">
							<div className="md:col-span-2 border-b border-white/5 pb-2">
								<h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Informações Pessoais</h3>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome Completo</label>
								<div className="relative">
									<User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-zinc-600" placeholder="Nome Civil" />
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CPF</label>
								<div className="relative">
									<ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input required value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-zinc-600" placeholder="Apenas números" />
								</div>
							</div>
							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Estado Civil</label>
								<select value={formData.maritalStatus} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
									<option value="" className="bg-zinc-950">Selecione...</option>
									<option value="Solteiro(a)" className="bg-zinc-950">Solteiro(a)</option>
									<option value="Casado(a)" className="bg-zinc-950">Casado(a)</option>
									<option value="Divorciado(a)" className="bg-zinc-950">Divorciado(a)</option>
									<option value="Viúvo(a)" className="bg-zinc-950">Viúvo(a)</option>
								</select>
							</div>
							{formData.maritalStatus === 'Casado(a)' && (
								<div className="space-y-2">
									<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cônjuge (Opcional)</label>
									<select value={formData.spouseId} onChange={e => setFormData({ ...formData, spouseId: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
										<option value="" className="bg-zinc-950">Selecione se já for membro...</option>
										{members
											.filter(m => m.id !== formData.spouseId && m.maritalStatus === 'Casado(a)')
											.map(m => <option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>)}
									</select>
								</div>
							)}
						</div>

						{/* Seção 3: Endereço */}
						<div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-6 bg-zinc-950 rounded-3xl border border-white/5">
							<div className="md:col-span-6 border-b border-white/5 pb-2">
								<h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Endereço de Residência</h3>
							</div>

							<div className="space-y-2 md:col-span-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">CEP</label>
								<div className="relative">
									<MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input value={formData.cep} onChange={handleCepChange} maxLength={9} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-zinc-600" placeholder="00000000" />
									{fetchingCep && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
								</div>
							</div>
							<div className="space-y-2 md:col-span-4">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Rua / Logradouro</label>
								<div className="relative">
									<Home size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" />
								</div>
							</div>
							<div className="space-y-2 md:col-span-1">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Número</label>
								<input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-4 text-sm text-center text-white focus:outline-none focus:border-blue-500 transition-all font-medium" />
							</div>
							<div className="space-y-2 md:col-span-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Complemento</label>
								<div className="relative">
									<Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" />
								</div>
							</div>
							<div className="space-y-2 md:col-span-3">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Bairro</label>
								<div className="relative">
									<Map size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" />
								</div>
							</div>
							<div className="space-y-2 md:col-span-5">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Cidade</label>
								<input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" />
							</div>
							<div className="space-y-2 md:col-span-1">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">UF</label>
								<input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} maxLength={2} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-4 text-sm text-center text-white focus:outline-none focus:border-blue-500 transition-all font-medium uppercase" />
							</div>
						</div>

						{/* Seção 4: Eclesiástico */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-950 rounded-3xl border border-white/5">
							<div className="md:col-span-2 border-b border-white/5 pb-2">
								<h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Vínculo Espiritual</h3>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Origem / Como nos Conheceu?</label>
								<select value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value as MemberOrigin })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
									<option value={MemberOrigin.EVANGELISM} className="bg-zinc-950">Evangelismo / Ganho</option>
									<option value={MemberOrigin.CELL_VISIT} className="bg-zinc-950">Visita na Célula</option>
									<option value={MemberOrigin.PRAYER_REQUEST} className="bg-zinc-950">Pedido de Oração (Telão)</option>
									<option value={MemberOrigin.OTHER_CHURCH} className="bg-zinc-950">Vim de Outra Igreja</option>
								</select>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Sua Célula de Frequência</label>
								<select value={formData.cellId} onChange={e => setFormData({ ...formData, cellId: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
									<option value="" className="bg-zinc-950">Ainda não participo...</option>
									{cells.map(c => <option key={c.id} value={c.id} className="bg-zinc-950">{c.name}</option>)}
								</select>
							</div>

							<div className="space-y-2 md:col-span-1">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Discipulador(a) (Líder / Cuidador)</label>
								<select value={formData.disciplerId} onChange={e => setFormData({ ...formData, disciplerId: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
									<option value="" className="bg-zinc-950">Não tenho / Não sei</option>
									{members
										.filter(m => m.role === UserRole.CELL_LEADER_DISCIPLE)
										.map(m => <option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>)}
								</select>
							</div>

							<div className="space-y-2 md:col-span-1">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Pastor(a) Direto</label>
								<select value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium appearance-none">
									<option value="" className="bg-zinc-950">Não tenho / Não sei</option>
									{members
										.filter(m => m.role === UserRole.PASTOR)
										.map(m => <option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>)}
								</select>
							</div>
						</div>

						{/* Seção 5: Acesso */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-950 rounded-3xl border border-white/5">
							<div className="md:col-span-2 border-b border-white/5 pb-2">
								<h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Acesso ao Aplicativo</h3>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">WhatsApp</label>
								<div className="relative">
									<Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" placeholder="(00) 00000-0000" />
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">E-mail (Login de Acesso)</label>
								<div className="relative">
									<Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700 font-bold" />
									<input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-zinc-600" placeholder="Este será seu Login" />
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Criar Senha</label>
								<div className="relative">
									<Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" placeholder="••••••••" />
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Repetir Senha</label>
								<div className="relative">
									<Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
									<input type="password" required value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" placeholder="••••••••" />
								</div>
							</div>
						</div>

						<button
							type="submit"
							disabled={submitting}
							className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group hover:scale-[1.02] active:scale-95 duration-200 mt-10"
						>
							{submitting ? (
								<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
							) : (
								<>
									<UserPlus size={20} /> Finalizar Cadastro Oficial
								</>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default PublicRegistration;
