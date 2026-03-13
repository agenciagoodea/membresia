import { supabase } from './supabaseClient';
import { Member } from '../types';

const mapToFrontend = (m: any): Member => ({
	id: m.id,
	name: m.name,
	email: m.email,
	phone: m.phone,
	role: m.role,
	stage: m.stage,
	cellId: m.cell_id,
	disciplerId: m.discipler_id,
	pastorId: m.pastor_id,
	baptismDate: m.baptism_date,
	joinedDate: m.joined_date,
	avatar: m.avatar,
	stageHistory: m.stage_history || [],
	completedMilestones: m.completed_milestones || [],
	origin: m.origin,
	cpf: m.cpf,
	cep: m.cep,
	state: m.state,
	city: m.city,
	neighborhood: m.neighborhood,
	street: m.street,
	number: m.number,
	complement: m.complement,
	maritalStatus: m.marital_status,
	spouseId: m.spouse_id,
	login: m.login,
	password: m.password,
	birthDate: m.birth_date,
});

const mapToDb = (m: Partial<Member> & { church_id?: string }) => {
	const db: any = {};
	if (m.church_id) db.church_id = m.church_id;
	if (m.name !== undefined) db.name = m.name;
	if (m.email !== undefined) db.email = m.email;
	if (m.phone !== undefined) db.phone = m.phone;
	if (m.role !== undefined) db.role = m.role;
	if (m.stage !== undefined) db.stage = m.stage;
	if (m.cellId !== undefined) db.cell_id = m.cellId || null;
	if (m.disciplerId !== undefined) db.discipler_id = m.disciplerId || null;
	if (m.pastorId !== undefined) db.pastor_id = m.pastorId || null;
	if (m.baptismDate !== undefined) db.baptism_date = m.baptismDate;
	if (m.joinedDate !== undefined) db.joined_date = m.joinedDate;
	if (m.avatar !== undefined) db.avatar = m.avatar;
	if (m.stageHistory !== undefined) db.stage_history = m.stageHistory;
	if (m.completedMilestones !== undefined) db.completed_milestones = m.completedMilestones;
	if (m.origin !== undefined) db.origin = m.origin;
	if (m.cpf !== undefined) db.cpf = m.cpf;
	if (m.cep !== undefined) db.cep = m.cep;
	if (m.state !== undefined) db.state = m.state;
	if (m.city !== undefined) db.city = m.city;
	if (m.neighborhood !== undefined) db.neighborhood = m.neighborhood;
	if (m.street !== undefined) db.street = m.street;
	if (m.number !== undefined) db.number = m.number;
	if (m.complement !== undefined) db.complement = m.complement;
	if (m.maritalStatus !== undefined) db.marital_status = m.maritalStatus;
	if (m.spouseId !== undefined) db.spouse_id = m.spouseId || null;
	if (m.login !== undefined) db.login = m.login;
	if (m.password !== undefined) db.password = m.password;
	if (m.birthDate !== undefined) db.birth_date = m.birthDate;
	return db;
};

export const memberService = {
	async getAll(churchId: string) {
		const { data, error } = await supabase
			.from('members')
			.select('*')
			.eq('church_id', churchId);

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async search(query: string) {
		const { data, error } = await supabase
			.from('members')
			.select('*')
			.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
			.limit(10);

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async getById(id: string) {
		const { data, error } = await supabase
			.from('members')
			.select('*')
			.eq('id', id)
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async create(member: Omit<Member, 'id'> & { church_id?: string }) {
		const dbData = mapToDb(member);

		// 1. Tentar criar o usuário no Supabase Auth primeiro se houver email e senha
		if (member.email && member.password) {
			const { error: authError } = await supabase.auth.signUp({
				email: member.email,
				password: member.password,
				options: {
					data: {
						name: member.name,
						role: member.role,
						church_id: member.church_id
					}
				}
			});

			if (authError && !authError.message.includes('already registered')) {
				console.error('Erro ao registrar no Auth:', authError.message);
				throw new Error(`Falha na autenticação: ${authError.message}`);
			}
		}

		// 2. Criar o registro na tabela members
		const { data, error } = await supabase
			.from('members')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: Partial<Member>) {
		const dbData = mapToDb(updates);

		// 1. Verificar se houve mudança de senha ou email
		// Nota: No Supabase Auth, o usuário só pode alterar seus próprios dados via frontend.
		// Para administradores alterarem senhas de terceiros, seria necessária uma Edge Function com service_role.
		if (updates.password || updates.email) {
			const { data: { user } } = await supabase.auth.getUser();
			
			// Se o ID sendo editado é o do próprio usuário logado e ele está mudando a senha
			const currentMember = await this.getByEmail(user?.email || '');
			if (currentMember && currentMember.id === id) {
				const authUpdates: any = {};
				if (updates.password) authUpdates.password = updates.password;
				if (updates.email) authUpdates.email = updates.email;

				const { error: authError } = await supabase.auth.updateUser(authUpdates);
				if (authError) {
					console.warn('Não foi possível sincronizar com o Auth (pessoal):', authError.message);
				} else {
					console.log('Dados sincronizados com o Supabase Auth com sucesso.');
				}
			} else if (updates.password) {
				console.log('Aviso: Alteração de senha de terceiros requer permissão administrativa de servidor (Edge Function). A senha foi salva apenas no banco de dados.');
			}
		}

		// 2. Atualizar no banco de dados
		const { data, error } = await supabase
			.from('members')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('members')
			.delete()
			.eq('id', id);

		if (error) throw error;
	},

	async getByEmail(email: string) {
		const { data, error } = await supabase
			.from('members')
			.select('*')
			.ilike('email', email.trim())
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error('Erro ao buscar membro por e-mail:', error);
			return null;
		}
		return data ? mapToFrontend(data) : null;
	},

	async uploadAvatar(file: File) {
		const fileExt = file.name.split('.').pop();
		const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
		const filePath = `avatars/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(filePath, file);

		if (uploadError) throw uploadError;

		const { data } = supabase.storage
			.from('avatars')
			.getPublicUrl(filePath);

		return data.publicUrl;
	}
};
