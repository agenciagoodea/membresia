import { supabase } from './supabaseClient';
import { Cell } from '../types';

const mapToFrontend = (c: any): Cell => ({
	id: c.id,
	name: c.name,
	leaderId: c.leader_id,
	hostName: c.host_name,
	address: c.address,
	meetingDay: c.meeting_day,
	meetingTime: c.meeting_time,
	membersCount: c.members_count,
	status: c.status,
	averageAttendance: c.average_attendance,
	logo: c.logo,
});

const mapToDb = (c: Partial<Cell> & { church_id?: string }) => {
	const db: any = {};
	if (c.id) db.id = c.id;
	if (c.church_id) db.church_id = c.church_id;
	if (c.name !== undefined) db.name = c.name;
	if (c.leaderId !== undefined) db.leader_id = c.leaderId || null;
	if (c.hostName !== undefined) db.host_name = c.hostName;
	if (c.address !== undefined) db.address = c.address;
	if (c.meetingDay !== undefined) db.meeting_day = c.meetingDay;
	if (c.meetingTime !== undefined) db.meeting_time = c.meetingTime;
	if (c.membersCount !== undefined) db.members_count = c.membersCount;
	if (c.status !== undefined) db.status = c.status;
	if (c.averageAttendance !== undefined) db.average_attendance = c.averageAttendance;
	if (c.logo !== undefined) db.logo = c.logo;
	return db;
};

export const cellService = {
	async getAll(churchId: string) {
		const { data, error } = await supabase
			.from('cells')
			.select('*')
			.eq('church_id', churchId);

		if (error) throw error;
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
	}
};
