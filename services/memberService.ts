import { supabase } from './supabaseClient';
import { Member, MemberStatus, UserRole } from '../types';

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
	conversionDate: m.conversion_date,
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
	firstAccessCompleted: m.first_access_completed || false,
	milestoneValues: m.milestone_values || {},
	userId: m.user_id,
});

const mapToDb = (m: Partial<Member> & { church_id?: string }) => {
	const db: any = {};
	
	// Função auxiliar para higienizar valores
	const sanitize = (val: any) => (val === undefined || val === '') ? null : val;

	if (m.churchId) db.church_id = m.churchId;
	if (m.church_id) db.church_id = m.church_id;
	
	// Mapeamento explícito para as colunas reais do banco (name e sex)
	if (m.name !== undefined) db.name = m.name;
	if (m.sex !== undefined) db.sex = m.sex;
	
	if (m.email !== undefined) db.email = m.email;
	if (m.phone !== undefined) db.phone = m.phone;
	if (m.role !== undefined) db.role = m.role;
	
	if (m.status !== undefined) {
		db.status = m.status === MemberStatus.ACTIVE ? 'ACTIVE' : 
		            m.status === MemberStatus.PENDING ? 'PENDING' :
		            m.status === MemberStatus.REJECTED ? 'REJECTED' : m.status;
	}
	
	if (m.stage !== undefined) db.stage = m.stage;
	if (m.cellId !== undefined) db.cell_id = sanitize(m.cellId);
	if (m.disciplerId !== undefined) db.discipler_id = sanitize(m.disciplerId);
	if (m.pastorId !== undefined) db.pastor_id = sanitize(m.pastorId);
	if (m.joinedDate !== undefined) db.joined_date = sanitize(m.joinedDate);
	if (m.avatar !== undefined) db.avatar = sanitize(m.avatar);
	if (m.stageHistory !== undefined) db.stage_history = m.stageHistory;
	if (m.completedMilestones !== undefined) db.completed_milestones = m.completedMilestones;
	if (m.origin !== undefined) db.origin = sanitize(m.origin);
	
	// CPF sem máscara (apenas números)
	if (m.cpf !== undefined) {
		const cleanCpf = m.cpf ? String(m.cpf).replace(/\D/g, '') : null;
		db.cpf = cleanCpf;
	}
	
	if (m.cep !== undefined) db.cep = sanitize(m.cep);
	if (m.state !== undefined) db.state = sanitize(m.state);
	if (m.city !== undefined) db.city = sanitize(m.city);
	if (m.neighborhood !== undefined) db.neighborhood = sanitize(m.neighborhood);
	if (m.street !== undefined) db.street = sanitize(m.street);
	if (m.number !== undefined) db.number = sanitize(m.number);
	if (m.complement !== undefined) db.complement = sanitize(m.complement);
	if (m.maritalStatus !== undefined) db.marital_status = sanitize(m.maritalStatus);
	if (m.spouseId !== undefined) db.spouse_id = sanitize(m.spouseId);
	if (m.login !== undefined) db.login = sanitize(m.login);
	
	// IMPORTANTE: Só envia password se tiver valor
	if (m.password && m.password.trim().length > 0) {
		db.password = m.password;
	}
	
	// Datas no formato YYYY-MM-DD
	if (m.birthDate !== undefined) db.birth_date = sanitize(m.birthDate);
	if (m.conversionDate !== undefined) db.conversion_date = sanitize(m.conversionDate);
	
	if (m.hasChildren !== undefined) db.has_children = m.hasChildren;
	if (m.children !== undefined) db.children = m.children;
	if (m.leadingCellIds !== undefined) db.leading_cell_ids = m.leadingCellIds;
	if (m.firstAccessCompleted !== undefined) db.first_access_completed = m.firstAccessCompleted;
	if (m.milestoneValues !== undefined) db.milestone_values = m.milestoneValues;
	if ((m as any).userId !== undefined) db.user_id = (m as any).userId;
	if ((m as any).user_id !== undefined) db.user_id = (m as any).user_id;
	
	// Segurança: Remover campos que definitivamente não pertencem à tabela
	delete db.confirmPassword;
	delete db.confirm_password;
	
	// Remover campos undefined finais
	Object.keys(db).forEach(key => db[key] === undefined && delete db[key]);
	
	return db;
};

// Colunas essenciais para listagem e dashboard
const ESSENTIAL_COLUMNS = 'id, name, email, phone, role, status, stage, cell_id, avatar, church_id, completed_milestones, milestone_values, stage_history, discipler_id, pastor_id, spouse_id, cpf, origin, marital_status, cep, street, number, complement, neighborhood, city, state, login, conversion_date, first_access_completed, children';

export const memberService = {
	async getAll(churchId: string, range?: { from: number; to: number }, currentUser?: any) {
		console.log('[DEBUG RBAC] memberService.getAll - Iniciando busca para:', currentUser?.name || 'Sistema', 'ID:', currentUser?.id);
		
		let query = supabase
			.from('members')
			.select('*')
			.eq('church_id', churchId);

		// Aplicar Filtros de Hierarquia Pastoral (RBAC)
		if (currentUser) {
			const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN].includes(currentUser.role);
			const myId = currentUser.id;

			if (!isAdmin) {
				// 1. Obter Ecossistema Recursivo via RPC
				const ecosystemIds = await this.getEcosystemIds(myId);
				
				// 2. Obter células ligadas a qualquer membro do ecossistema
				const { data: managedCells } = await supabase
					.from('cells')
					.select('id')
					.or(`pastor_id.in.(${ecosystemIds.join(',')}),leader_id.in.(${ecosystemIds.join(',')}),supervisor_id.in.(${ecosystemIds.join(',')})`);
				
				const allowedCellIds = (managedCells || []).map(c => c.id);
				const myCellId = currentUser.cellId || currentUser.cell_id;
				if (myCellId && !allowedCellIds.includes(myCellId)) {
					allowedCellIds.push(myCellId);
				}

				// Incluir Pastor e Discipulador do próprio usuário para que apareçam nos selects de perfil
				const leaderIds = [];
				if (currentUser.pastorId) leaderIds.push(currentUser.pastorId);
				if (currentUser.disciplerId) leaderIds.push(currentUser.disciplerId);

				// 3. Filtro Unificado: Todo o Ecossistema + Células Ligadas + Meus Líderes
				let filterStr = `id.in.(${[...ecosystemIds, ...leaderIds].join(',')}),spouse_id.eq.${myId}`;
				if (allowedCellIds.length > 0) {
					filterStr += `,cell_id.in.(${allowedCellIds.join(',')})`;
				}
				query = query.or(filterStr);
			}
		}

		query = query.order('name');

		if (range) {
			query = query.range(range.from, range.to);
		}

		const { data, error, count } = await query;

		if (error) {
			console.error('[DEBUG RBAC] memberService.getAll - Erro:', error);
			throw error;
		}

		console.log('[DEBUG RBAC] memberService.getAll - Registros retornados:', data?.length || 0);
		return (data || []).map(mapToFrontend);
	},

	async getEcosystemIds(rootMemberId: string): Promise<string[]> {
		if (!rootMemberId) return [];
		const { data, error } = await supabase.rpc('get_member_ecosystem', { root_member_id: rootMemberId });
		if (error) {
			console.error('Erro ao buscar ecossistema:', error);
			return [rootMemberId]; // Fallback para apenas o próprio membro
		}
		return data.map((item: any) => item.id);
	},

	async search(queryStr: string, currentUser?: any) {
		console.log('[DEBUG RBAC] memberService.search - Query:', queryStr);
		let query = supabase
			.from('members')
			.select('*')
			.or(`name.ilike.%${queryStr}%,email.ilike.%${queryStr}%`);

		if (currentUser) {
			const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN].includes(currentUser.role);
			const myId = currentUser.id;

			if (!isAdmin) {
				// 1. Obter Ecossistema Recursivo
				const ecosystemIds = await this.getEcosystemIds(myId);

				// 2. Obter células ligadas
				const { data: managedCells } = await supabase
					.from('cells')
					.select('id')
					.or(`pastor_id.in.(${ecosystemIds.join(',')}),leader_id.in.(${ecosystemIds.join(',')}),supervisor_id.in.(${ecosystemIds.join(',')})`);
				
				const allowedCellIds = (managedCells || []).map(c => c.id);
				const myCellId = currentUser.cellId || currentUser.cell_id;
				if (myCellId && !allowedCellIds.includes(myCellId)) {
					allowedCellIds.push(myCellId);
				}

				// Incluir líderes do usuário na busca
				const leaderIds = [];
				if (currentUser.pastorId) leaderIds.push(currentUser.pastorId);
				if (currentUser.disciplerId) leaderIds.push(currentUser.disciplerId);

				// 3. Filtro Unificado Recursivo + Líderes
				let filterStr = `id.in.(${[...ecosystemIds, ...leaderIds].join(',')}),spouse_id.eq.${myId}`;
				if (allowedCellIds.length > 0) {
					filterStr += `,cell_id.in.(${allowedCellIds.join(',')})`;
				}
				query = query.or(filterStr);
			}
		}

		const { data, error } = await query.limit(10);

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
			if (existingMember.firstAccessCompleted === true) {
				throw new Error('Este e-mail já está cadastrado. Acesse o sistema com seu login e senha.');
			}
			console.warn('memberService.create: membro com cadastro incompleto encontrado. Retentando...');
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
			}

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
					throw new Error(`Falha no cadastro: ${authError.message}`);
				}
				console.warn('Auth: ghost user detectado. Criando apenas o registro members...');
			}
		}

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
		const churchId = updates.churchId || (updates as any).church_id;

		if (process.env.NODE_ENV !== 'production') {
			console.log(`[DEBUG memberService.update] ID: ${id} | Payload:`, dbData);
		}

		if ((updates.password && updates.password.trim().length > 0) || (updates.email && updates.email.trim().length > 0)) {
			try {
				const { data: { user: currentUser } } = await supabase.auth.getUser();
				const targetMember = await this.getById(id);
				
				if (currentUser?.email === targetMember.email) {
					const authUpdates: any = {};
					if (updates.password) authUpdates.password = updates.password;
					if (updates.email) authUpdates.email = updates.email;
					await supabase.auth.updateUser(authUpdates);
				} else if (updates.password) {
					const { error: rpcError } = await supabase.rpc('admin_update_user_password', {
						user_email: targetMember.email,
						new_password: updates.password
					});
					
					if (rpcError) {
						console.error('Erro ao trocar senha via RPC:', rpcError.message);
					}
				}
			} catch (authErr) {
				console.error('Erro ao processar atualizações de Auth:', authErr);
			}
		}

		let query = supabase
			.from('members')
			.update(dbData)
			.eq('id', id);
		
		if (churchId) {
			query = query.eq('church_id', churchId);
		}

		const { data, error } = await query.select().maybeSingle();

		if (error) {
			console.error('Erro ao atualizar membro:', error);
			throw error;
		}

		if (!data) {
			console.warn(`memberService.update: Nenhum registro atualizado para o ID ${id}. Verifique as permissões (RLS).`);
		}

		return data ? mapToFrontend(data) : null;
	},

	async delete(id: string) {
		try {
			await supabase.from('members').update({ spouse_id: null, marital_status: 'Solteiro(a)' }).eq('spouse_id', id);
			await supabase.from('members').update({ pastor_id: null }).eq('pastor_id', id);
			await supabase.from('members').update({ discipler_id: null }).eq('discipler_id', id);
			await supabase.from('cells').update({ leader_id: null }).eq('leader_id', id);
			await supabase.from('m12_members_activities').delete().eq('member_id', id);
			await supabase.from('m12_performances').delete().eq('member_id', id);

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

	async getAvailablePastorsForFilter(churchId: string, currentUser: any) {
		const members = await this.getAll(churchId, undefined, currentUser);
		return members.filter(m => 
			m.role === 'PASTOR' || 
			m.role === 'CHURCH_ADMIN' || 
			m.role === 'ADMINISTRADOR_IGREJA'
		).sort((a, b) => a.name.localeCompare(b.name));
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
