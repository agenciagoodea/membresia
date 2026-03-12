
import { supabase } from './supabaseClient';
import { MeetingReport } from '../types';

const mapToFrontend = (r: any): MeetingReport => ({
	id: r.id,
	cellId: r.cell_id,
	date: r.date,
	presentMemberIds: r.present_member_ids || [],
	visitorCount: r.visitor_count,
	childrenCount: r.children_count || 0,
	photoUrl: r.photo_url,
	offeringAmount: r.offering_amount,
	report: r.report,
	recordedBy: r.recorded_by,
});

const mapToDb = (r: Partial<MeetingReport>) => {
	const db: any = {};
	if (r.id) db.id = r.id;
	if (r.cellId) db.cell_id = r.cellId;
	if (r.date) db.date = r.date;
	if (r.presentMemberIds) db.present_member_ids = r.presentMemberIds;
	if (r.visitorCount !== undefined) db.visitor_count = r.visitorCount;
	if (r.childrenCount !== undefined) db.children_count = r.childrenCount;
	if (r.photoUrl !== undefined) db.photo_url = r.photoUrl;
	if (r.offeringAmount !== undefined) db.offering_amount = r.offeringAmount;
	if (r.report !== undefined) db.report = r.report;
	if (r.recordedBy !== undefined) db.recorded_by = r.recordedBy;
	return db;
};

export const meetingReportService = {
	async getByCell(cellId: string) {
		const { data, error } = await supabase
			.from('meeting_reports')
			.select('*')
			.eq('cell_id', cellId)
			.order('date', { ascending: false });

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async create(report: Omit<MeetingReport, 'id'>) {
		const dbData = mapToDb(report);
		const { data, error } = await supabase
			.from('meeting_reports')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: Partial<MeetingReport>) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('meeting_reports')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('meeting_reports')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}
};
