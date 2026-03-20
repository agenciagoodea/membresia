import { supabase } from './supabaseClient';
import { Member, MemberStatus } from '../types';

const mapToFrontend = (m: any): Member => ({
	id: m.id,
	name: m.name,
	email: m.email,
	phone: m.phone,
	churchId: m.church_id,
	role: m.role,
	status: (m.status === 'PENDING' || m.status === 'PENDENTE' || !m.status) ? MemberStatus.PENDING : 
	        (m.status === 'ACTIVE' || m.status === 'ATIVO') ? MemberStatus.ACTIVE :
	        (m.status === 'REJECTED' || m.status === 'REJEITADO') ? MemberStatus.REJECTED : m.status,
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
	sex: m.sex,
	hasChildren: m.has_children,
	children: m.children || [],
	leadingCellIds: m.leading_cell_ids || [],
	conversionDate: m.conversion_date,
	firstAccessCompleted: m.first_access_completed || false,
	milestoneValues: m.milestone_values || {},
});

const mapToDb = (m: Partial<Member> & { church_id?: string }) => {
	const db: any = {};
	if (m.churchId) db.church_id = m.churchId;
	if (m.church_id) db.church_id = m.church_id;
	if (m.name !== undefined) db.name = m.name;
	if (m.email !== undefined) db.email = m.email;
	if (m.phone !== undefined) db.phone = m.phone;
	if (m.role !== undefined) db.role = m.role;
	if (m.status !== undefined) {
		db.status = m.status === MemberStatus.ACTIVE ? 'ACTIVE' : 
		            m.status === MemberStatus.PENDING ? 'PENDING' :
		            m.status === MemberStatus.REJECTED ? 'REJECTED' : m.status;
	}
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
	if (m.sex !== undefined) db.sex = m.sex;
	if (m.hasChildren !== undefined) db.has_children = m.hasChildren;
	if (m.children !== undefined) db.children = m.children;
	if (m.leadingCellIds !== undefined) db.leading_cell_ids = m.leadingCellIds;
	if (m.conversionDate !== undefined) db.conversion_date = m.conversionDate;
	if (m.firstAccessCompleted !== undefined) db.first_access_completed = m.firstAccessCompleted;
	if (m.milestoneValues !== undefined) db.milestone_values = m.milestoneValues;
	return db;
};

// Colunas essenciais para listagem e dashboard (evita payloads pesados mas mantém progresso M12 e hierarquia)
const ESSENTIAL_COLUMNS = 'id, name, email, phone, role, status, stage, cell_id, avatar, church_id, completed_milestones, milestone_values, stage_history, discipler_id, pastor_id, spouse_id, cpf, origin, marital_status, cep, street, number, complement, neighborhood, city, state, login, conversion_date, first_access_completed';

export const memberService = {
	async getAll(churchId: string, range?: { from: number; to: number }) {
		let query = supabase
			.from('members')
			.select('*')
			.eq('church_id', churchId)
			.order('name');

		if (range) {
			query = query.range(range.from, range.to);
		}

		const { data, error } = await query;

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
		const emailNormalized = (member.email || '').trim().toLowerCase();

		// ── PASSO 0: Verificar se o e-mail já existe na tabela members ────────
		const existingMember = await this.getByEmail(emailNormalized);

		if (existingMember) {
			// Cadastro completo real → bloquear com mensagem clara
			if (existingMember.firstAccessCompleted === true) {
				throw new Error('Este e-mail já está cadastrado. Acesse o sistema com seu login e senha.');
			}

			// Cadastro incompleto (firstAccessCompleted = false ou null) →
			// Pode ser uma retentativa após falha. Tentar atualizar o registro existente.
			console.warn('memberService.create: membro com cadastro incompleto encontrado. Retentando...');

			// Tentar autenticar/recriar o Auth user (pode já existir)
			if (member.email && member.password) {
				await supabase.auth.signUp({
					email: emailNormalized,
					password: member.password,
					options: { 
						data: { 
							name: member.name, 
							role: member.role, 
							church_id: member.church_id 
						} 
					}
				});
				// Ignoramos o erro do Auth — pode já existir (ghost user)
			}

			// Atualizar o registro incompleto com os novos dados enviados
			const { data: updatedData, error: updateError } = await supabase
				.from('members')
				.update({
					...dbData,
					email: emailNormalized,
					status: dbData.status || 'ACTIVE'
				})
				.eq('id', existingMember.id)
				.select()
				.single();

			if (updateError) {
				console.error('Erro ao atualizar membro incompleto:', updateError);
				throw new Error('Erro ao finalizar cadastro. Tente novamente.');
			}
			return mapToFrontend(updatedData);
		}

		// ── PASSO 1: Novo usuário — criar no Supabase Auth ────────────────────
		if (member.email && member.password) {
			const { error: authError } = await supabase.auth.signUp({
				email: emailNormalized,
				password: member.password,
				options: {
					data: {
						name: member.name,
						role: member.role,
						church_id: member.church_id
					}
				}
			});

			if (authError) {
				const isAlreadyRegistered =
					authError.message.toLowerCase().includes('already registered') ||
					authError.message.toLowerCase().includes('user already registered') ||
					authError.message.toLowerCase().includes('email address is already') ||
					authError.status === 422;

				if (!isAlreadyRegistered) {
					// Erro real de autenticação (senha fraca, email inválido, etc.)
					throw new Error(`Falha no cadastro: ${authError.message}`);
				}
				// Ghost user: Auth existe mas members não tinha registro → continuar
				console.warn('Auth: ghost user detectado. Criando apenas o registro members...');
			}
		}

		// ── PASSO 2: Inserir na tabela members ────────────────────────────────
		const { data, error } = await supabase
			.from('members')
			.insert([{
				...dbData,
				email: emailNormalized,
				status: dbData.status || 'ACTIVE'
			}])
			.select()
			.single();

		if (error) {
			console.error('Erro ao inserir membro:', error);
			throw new Error('Erro ao salvar o cadastro. Verifique as informações e tente novamente.');
		}
		return mapToFrontend(data);
	},


	async update(id: string, updates: Partial<Member>) {
		const dbData = mapToDb(updates);

		// 1. Verificar se houve mudança de senha ou email (e se não são vazios)
		if ((updates.password && updates.password.length > 0) || (updates.email && updates.email.length > 0)) {
			const { data: { user: currentUser } } = await supabase.auth.getUser();
			const targetMember = await this.getById(id);
			
			// Se for a própria senha, usa o método padrão
			if (currentUser?.email === targetMember.email) {
				const authUpdates: any = {};
				if (updates.password) authUpdates.password = updates.password;
				if (updates.email) authUpdates.email = updates.email;
				await supabase.auth.updateUser(authUpdates);
			} else if (updates.password) {
				// Se for senha de terceiro (Master Admin alterando), usa a RPC segura
				const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
					user_email: targetMember.email,
					new_password: updates.password
				});
				
				if (rpcError) {
					console.error('Erro ao trocar senha via RPC:', rpcError.message);
					throw new Error('Falha ao atualizar senha: a função SQL pode não estar configurada.');
				}
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
		try {
			// 1. Desvincular de cônjuges e ajustar estado civil deles
			await supabase.from('members').update({ spouse_id: null, marital_status: 'Solteiro(a)' }).eq('spouse_id', id);

			// 2. Desvincular liderados (onde este membro era pastor ou discipulador)
			await supabase.from('members').update({ pastor_id: null }).eq('pastor_id', id);
			await supabase.from('members').update({ discipler_id: null }).eq('discipler_id', id);

			// 3. Desvincular de células (onde este membro era líder)
			await supabase.from('cells').update({ leader_id: null }).eq('leader_id', id);

			// 4. Limpar histórico do membro na M12
			await supabase.from('m12_members_activities').delete().eq('member_id', id);
			await supabase.from('m12_performances').delete().eq('member_id', id);

			// 5. Excluir o registro principal de membro
			const { error } = await supabase
				.from('members')
				.delete()
				.eq('id', id);

			if (error) throw error;
		} catch (error) {
			console.error('Falha completa na deleção em cascata:', error);
			throw error;
		}
	},

	async getByEmail(email: string) {
		const { data, error } = await supabase
			.from('members')
			.select('*')
			.eq('email', email.trim().toLowerCase())
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
