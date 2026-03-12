
import React, { useState, useEffect } from 'react';
import { X, Save, Users, MapPin, Calendar, Clock, User, Heart } from 'lucide-react';
import { Cell, Member } from '../types';

interface CellModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (cell: Partial<Cell>) => Promise<void>;
	cell?: Cell | null;
	availableLeaders: Member[];
}

const CellModal: React.FC<CellModalProps> = ({ isOpen, onClose, onSave, cell, availableLeaders }) => {
	const [formData, setFormData] = useState<Partial<Cell>>({
		name: '',
		leaderId: '',
		hostName: '',
		address: '',
		meetingDay: 'Terça-feira',
		meetingTime: '20:00',
		status: 'ACTIVE'
	});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (cell) {
			setFormData(cell);
		} else {
			setFormData({
				name: '',
				leaderId: '',
				hostName: '',
				address: '',
				meetingDay: 'Terça-feira',
				meetingTime: '20:00',
				status: 'ACTIVE'
			});
		}
	}, [cell, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setLoading(true);
			await onSave(formData);
			onClose();
		} catch (error) {
			console.error('Erro ao salvar célula:', error);
			alert('Erro ao salvar os dados da célula.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

			<div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
				<div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
					<div>
						<h3 className="text-2xl font-black text-white tracking-tight uppercase">
							{cell ? 'Editar Unidade' : 'Nova Comunidade'}
						</h3>
						<p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Expansão do Reino & Cuidado Local</p>
					</div>
					<button onClick={onClose} className="p-3 text-zinc-500 hover:text-white bg-white/5 rounded-2xl transition-all">
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-8">
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
							<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Líder Responsável</label>
							<div className="relative">
								<User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
								<select
									required
									value={formData.leaderId}
									onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
									className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black uppercase appearance-none cursor-pointer"
								>
									<option value="" className="bg-zinc-950">Selecionar Líder</option>
									{availableLeaders.map(leader => (
										<option key={leader.id} value={leader.id} className="bg-zinc-950">{leader.name}</option>
									))}
								</select>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Anfitrião</label>
							<div className="relative">
								<Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
								<input
									required
									type="text"
									value={formData.hostName}
									onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
									className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
									placeholder="Quem recebe a célula?"
								/>
							</div>
						</div>

						<div className="md:col-span-2 space-y-2">
							<label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Endereço Completo</label>
							<div className="relative">
								<MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
								<input
									required
									type="text"
									value={formData.address}
									onChange={(e) => setFormData({ ...formData, address: e.target.value })}
									className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
									placeholder="Rua, Número, Bairro"
								/>
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
						<button
							type="button"
							onClick={onClose}
							className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
						>
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
								<>
									<Save size={18} />
									{cell ? 'Salvar Alterações' : 'Criar Célula'}
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CellModal;
