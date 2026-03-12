
import { supabase } from './supabaseClient';
import { FinancialRecord } from '../types';

const mapToFrontend = (f: any): FinancialRecord => ({
	id: f.id,
	description: f.description,
	amount: Number(f.amount),
	type: f.type,
	date: f.date,
	category: f.category,
});

const mapToDb = (f: Partial<FinancialRecord> & { church_id?: string }) => {
	const db: any = {};
	if (f.id) db.id = f.id;
	if (f.church_id) db.church_id = f.church_id;
	if (f.description !== undefined) db.description = f.description;
	if (f.amount !== undefined) db.amount = f.amount;
	if (f.type !== undefined) db.type = f.type;
	if (f.date !== undefined) db.date = f.date;
	if (f.category !== undefined) db.category = f.category;
	return db;
};

export const financeService = {
	async getAll(churchId: string) {
		const { data, error } = await supabase
			.from('financial_records')
			.select('*')
			.eq('church_id', churchId)
			.order('date', { ascending: false });

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async create(record: Omit<FinancialRecord, 'id'> & { church_id: string }) {
		const dbData = mapToDb(record);
		const { data, error } = await supabase
			.from('financial_records')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: Partial<FinancialRecord>) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('financial_records')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('financial_records')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}
};
