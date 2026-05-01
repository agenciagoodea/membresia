import { supabase } from './supabaseClient';
import { PlanLimits } from '../types';

export interface Plan {
	id: string;
	name: string;
	price: number;
	max_members: number;
	max_cells: number;
	max_leaders: number;
	features: string[];
	is_active: boolean;
	created_at: string;
}

const mapToFrontend = (p: any) => ({
	id: p.id,
	name: p.name,
	price: Number(p.price),
	maxMembers: p.max_members,
	maxCells: p.max_cells,
	maxLeaders: p.max_leaders,
	features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]'),
	churchCount: p.churches?.[0]?.count || 0
});

const mapToDb = (p: any) => ({
	name: p.name,
	price: p.price,
	max_members: p.maxMembers,
	max_cells: p.maxCells,
	max_leaders: p.maxLeaders,
	features: p.features,
});

export const planService = {
	async list() {
		const { data, error } = await supabase
			.from('plans')
			.select(`
				*,
				churches:churches(count)
			`)
			.order('price', { ascending: true });

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async create(plan: any) {
		const dbData = mapToDb(plan);
		const { data, error } = await supabase
			.from('plans')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: any) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('plans')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('plans')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}
};
