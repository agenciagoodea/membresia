import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Users, MapPin, Calendar, Clock, User, Heart, Camera, Check, Map, Home, Building, Upload } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from './Shared/cropImage';
import { Cell, Member } from '../types';
import { supabase } from '../services/supabaseClient';

interface CellModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (cell: Partial<Cell>) => Promise<void>;
	cell?: Cell | null;
	availableLeaders: Member[];
	allMembers: Member[];
}

const CellModal: React.FC<CellModalProps> = ({ isOpen, onClose, onSave, cell, availableLeaders, allMembers }) => {
	const [formData, setFormData] = useState<Partial<Cell>>({
		name: '',
		leaderIds: [],
		hostId: '',
		hostName: '',
		address: '',
		cep: '',
		state: '',
		city: '',
		neighborhood: '',
		street: '',
		number: '',
		complement: '',
		meetingDay: 'Terça-feira',
		meetingTime: '20:00',
		status: 'ACTIVE',
		logo: ''
	});
	const [loading, setLoading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string>('');
	const [fetchingCep, setFetchingCep] = useState(false);

	// Cropper State
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
	const [isCropping, setIsCropping] = useState(false);
	const [isProcessingCrop, setIsProcessingCrop] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (cell) {
			setFormData(cell);
		} else {
			setFormData({
				name: '',
				leaderId: '',
				hostName: '',
				address: '',
				cep: '',
				state: '',
				city: '',
				neighborhood: '',
				street: '',
				number: '',
				complement: '',
				meetingDay: 'Terça-feira',
				meetingTime: '20:00',
				status: 'ACTIVE',
				logo: ''
			});
		}
		setPhotoPreview('');
		setSelectedFile(null);
	}, [cell, isOpen]);

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
						state: data.uf || prev.state,
						// Também atualiza o campo de busca genérico para compatibilidade
						address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
					}));
				}
			} catch (error) {
				console.error('Erro ao buscar CEP:', error);
			} finally {
				setFetchingCep(false);
			}
		}
	};
	
	const handleHostChange = (memberId: string) => {
		const member = allMembers.find(m => m.id === memberId);
		if (member) {
			setFormData(prev => ({
				...prev,
				hostId: member.id,
				hostName: member.name,
				cep: member.cep || prev.cep,
				street: member.street || prev.street,
				number: member.number || prev.number,
				complement: member.complement || prev.complement,
				neighborhood: member.neighborhood || prev.neighborhood,
				city: member.city || prev.city,
				state: member.state || prev.state,
				address: member.street ? `${member.street}, ${member.number || ''}, ${member.neighborhood}, ${member.city} - ${member.state}` : prev.address
			}));
		} else {
			setFormData(prev => ({ ...prev, hostId: '', hostName: '' }));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setLoading(true);
			let finalLogoUrl = formData.logo;

			if (selectedFile) {
				const fileExt = selectedFile.name.split('.').pop();
				const fileName = `${Math.random()}.${fileExt}`;
				const { error: uploadError } = await supabase.storage
					.from('cell_logos')
					.upload(fileName, selectedFile);

				if (uploadError) {
					console.error('Erro de Storage:', uploadError);
					if (uploadError.message.includes('Bucket not found') || uploadError.message === 'The resource was not found') {
						throw new Error('O bucket "cell_logos" não existe no Supabase. Por favor, crie um bucket público chamado "cell_logos" no Storage.');
					}
					if (uploadError.message.includes('row-level security policy') || uploadError.message.includes('permission denied')) {
						throw new Error('Falta permissão no Supabase. Acesse Storage > cell_logos -> Policies e adicione uma política permitindo INSERT/UPDATE para todos (ou para usuários autenticados).');
					}
					throw new Error(`Erro ao enviar imagem: ${uploadError.message}`);
				}

				const { data: { publicUrl } } = supabase.storage
					.from('cell_logos')
					.getPublicUrl(fileName);

				finalLogoUrl = publicUrl;
			}

			// Concatenar endereço completo se não preenchido manualmente
			const fullAddress = formData.street 
				? `${formData.street}, ${formData.number || ''}, ${formData.neighborhood}, ${formData.city} - ${formData.state}`
				: formData.address;

			await onSave({ 
				...formData, 
				logo: finalLogoUrl,
				address: fullAddress
			});
			onClose();
		} catch (error: any) {
			console.error('Erro ao salvar célula:', error);
			const errorMessage = error?.message || 'Erro ao salvar os dados da célula.';
			alert(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto pt-4 md:pt-10">
			<div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

			<div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
				<div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
					<div>
						<h3 className="text-2xl font-black text-white tracking-tight uppercase">
							{isCropping ? 'Recortar Foto' : (cell ? 'Editar Comunidade' : 'Nova Comunidade')}
						</h3>
						<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
							{isCropping ? 'Ajuste a imagem para a célula' : 'Expansão do Reino & Cuidado Local'}
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
									onChange={(e) => setZoom(Number(e.target.value))}
									className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
								/>
							</div>
							<button onClick={handleCropCancel} className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5">
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
					<form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
						{/* Foto de Perfil Circular */}
						<div className="flex flex-col items-center justify-center space-y-3 mb-4">
							<div
								onClick={() => fileInputRef.current?.click()}
								className="relative w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all overflow-hidden group bg-zinc-900"
							>
								<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
								{photoPreview || formData.logo ? (
									<>
										<img src={photoPreview || formData.logo} className="w-full h-full object-cover" alt="Logo da Célula" />
										<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
											<Camera className="text-white" size={24} />
										</div>
									</>
								) : (
									<div className="text-center group-hover:scale-110 transition-transform flex flex-col items-center">
										<Camera size={32} className="text-zinc-600 mb-2" />
										<span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logo</span>
									</div>
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="md:col-span-2 space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nome da Célula</label>
								<div className="relative">
									<Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<input
										required
										type="text"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
										placeholder="Ex: Célula Renovo"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Líderes Responsáveis</label>
								<div className="relative">
									<User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<div className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 pl-12 max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
										{(availableLeaders || []).map(leader => (
											<label key={leader.id} className="flex items-center gap-3 cursor-pointer group">
												<input
													type="checkbox"
													checked={(formData.leaderIds || []).includes(leader.id) || formData.leaderId === leader.id}
													onChange={(e) => {
														const current = formData.leaderIds || (formData.leaderId ? [formData.leaderId] : []);
														const next = e.target.checked 
															? [...current, leader.id]
															: current.filter(id => id !== leader.id);
														setFormData({ ...formData, leaderIds: next, leaderId: next[0] || '' });
													}}
													className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-all"
												/>
												<span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest transition-colors">{leader.name}</span>
											</label>
										))}
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Anfitrião</label>
								<div className="relative">
									<Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										required
										value={formData.hostId || formData.hostName}
										onChange={(e) => {
											const val = e.target.value;
											const member = allMembers.find(m => m.id === val || m.name === val);
											if (member) {
												handleHostChange(member.id);
											} else {
												setFormData({ ...formData, hostName: val, hostId: '' });
											}
										}}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										<option value="" className="bg-zinc-950">Selecionar Anfitrião</option>
										{allMembers.map(m => (
											<option key={m.id} value={m.id} className="bg-zinc-950">{m.name}</option>
										))}
									</select>
								</div>
							</div>

							{/* Endereço Estruturado */}
							<div className="md:col-span-2 pt-4 border-t border-white/5 space-y-6">
								<div className="flex items-center gap-4 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
									<div className="w-8 h-px bg-blue-500/30" />
									<span className="flex items-center gap-2"><MapPin size={14} /> Endereço Residencial</span>
									<div className="w-full h-px bg-blue-500/30 flex-1" />
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Dia do Encontro</label>
								<div className="relative">
									<Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<select
										value={formData.meetingDay}
										onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
									>
										{['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(day => (
											<option key={day} value={day} className="bg-zinc-950">{day}</option>
										))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Horário</label>
								<div className="relative">
									<Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
									<input
										required
										type="time"
										value={formData.meetingTime}
										onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
										className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
									/>
								</div>
							</div>
						</div>

						<div className="pt-4 flex gap-4">
							<button type="button" onClick={onClose} className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white transition-all border border-white/5">
								Cancelar
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
							>
								{loading ? (
									<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : (
									<><Save size={18} /> {cell ? 'Salvar Alterações' : 'Criar Célula'}</>
								)}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
};

export default CellModal;
