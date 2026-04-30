import { supabase } from './supabaseClient';
import { Cell, UserRole } from '../types';
import { memberService } from './memberService';

const mapToFrontend = (c: any): Cell => ({
	id: c.id,
	churchId: c.church_id,
	name: c.name,
	leaderId: c.leader_id,
	leaderIds: c.leader_ids || [],
	hostId: c.host_id,
	hostName: c.host_name,
	address: c.address,
	cep: c.cep,
	state: c.state,
	city: c.city,
	neighborhood: c.neighborhood,
	street: c.street,
	number: c.number,
	complement: c.complement,
	meetingDay: c.meeting_day,
	meetingTime: c.meeting_time,
	membersCount: c.members_count,
	status: c.status,
	averageAttendance: c.average_attendance,
	logo: c.logo,
	supervisorId: c.supervisor_id,
	pastorId: c.pastor_id,
});

const mapToDb = (c: Partial<Cell> & { church_id?: string }) => {
	const db: any = {};
	if (c.id) db.id = c.id;
	if (c.church_id) db.church_id = c.church_id;
	if (c.name !== undefined) db.name = c.name;
	if (c.leaderId !== undefined) db.leader_id = c.leaderId || null;
	if (c.leaderIds !== undefined) db.leader_ids = c.leaderIds;
	if (c.hostId !== undefined) db.host_id = c.hostId || null;
	if (c.hostName !== undefined) db.host_name = c.hostName;
	if (c.address !== undefined) db.address = c.address;
	if (c.cep !== undefined) db.cep = c.cep;
	if (c.state !== undefined) db.state = c.state;
	if (c.city !== undefined) db.city = c.city;
	if (c.neighborhood !== undefined) db.neighborhood = c.neighborhood;
	if (c.street !== undefined) db.street = c.street;
	if (c.number !== undefined) db.number = c.number;
	if (c.complement !== undefined) db.complement = c.complement;
	if (c.meetingDay !== undefined) db.meeting_day = c.meetingDay;
	if (c.meetingTime !== undefined) db.meeting_time = c.meetingTime;
	if (c.membersCount !== undefined) db.members_count = c.membersCount;
	if (c.status !== undefined) db.status = c.status;
	if (c.averageAttendance !== undefined) db.average_attendance = c.averageAttendance;
	if (c.logo !== undefined) db.logo = c.logo;
	if (c.supervisorId !== undefined) db.supervisor_id = c.supervisorId || null;
	if (c.pastorId !== undefined) db.pastor_id = c.pastorId || null;
	return db;
};

// Colunas para listagem (remove dados pesados se houver)
const CELL_LIST_COLUMNS = 'id, name, leader_id, leader_ids, host_id, host_name, address, cep, state, city, neighborhood, street, number, complement, meeting_day, meeting_time, members_count, status, logo, church_id, supervisor_id, pastor_id';

export const cellService = {
	async getAll(churchId: string, currentUser?: any) {
		const isAdmin = [UserRole.CHURCH_ADMIN, UserRole.MASTER_ADMIN].includes(currentUser?.role);
		const myId = currentUser?.id;
		const myCellId = currentUser?.cellId || currentUser?.cell_id;

		let query = supabase
			.from('cells')
			.select(CELL_LIST_COLUMNS)
			.eq('church_id', churchId);

		if (currentUser && !isAdmin) {
			console.log('[DEBUG RBAC] cellService.getAll - Chamando RPC get_cells_by_member_ecosystem');
			const { data, error } = await supabase.rpc('get_cells_by_member_ecosystem', { root_member_id: myId });
			
			if (error) {
				console.error('[DEBUG RBAC] Erro na RPC de células:', error);
				// Fallback para comportamento anterior se falhar
				const ecosystemIds = await memberService.getEcosystemIds(myId);
				let conditions = [
					`pastor_id.in.(${ecosystemIds.join(',')})`,
					`supervisor_id.in.(${ecosystemIds.join(',')})`,
					`leader_id.in.(${ecosystemIds.join(',')})`
				];
				if (myCellId) conditions.push(`id.eq.${myCellId}`);
				query = query.or(conditions.join(','));
			} else {
				return (data || []).map(mapToFrontend);
			}
		}

		query = query.order('name');
		const { data, error } = await query;

		if (error) {
			console.error('[DEBUG RBAC] cellService.getAll - Erro:', error);
			throw error;
		}

		console.log('[DEBUG RBAC] cellService.getAll - Células retornadas:', data?.length || 0);
		return (data || []).map(mapToFrontend);
	},

	async create(cell: Omit<Cell, 'id'> & { church_id?: string }) {
		const dbData = mapToDb(cell);
		const { data, error } = await supabase
			.from('cells')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: Partial<Cell>) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('cells')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('cells')
			.delete()
			.eq('id', id);

		if (error) throw error;
	},

	async getReports(cellId: string) {
		const { data, error } = await supabase
			.from('meeting_reports')
			.select('*')
			.eq('cell_id', cellId)
			.order('date', { ascending: false });

		if (error) throw error;
		return data || [];
	},

	async getAvailableCellsForFilter(churchId: string, currentUser: any) {
		return this.getAll(churchId, currentUser);
	},

	async getCellsByLeader(leaderId: string) {
		const { data, error } = await supabase
			.from('cells')
			.select(CELL_LIST_COLUMNS)
			.or(`leader_id.eq.${leaderId},leader_ids.cs.{${leaderId}}`);

		if (error) {
			console.error('Erro ao buscar células lideradas:', error);
			return [];
		}

		return (data || []).map(mapToFrontend);
	}
};
