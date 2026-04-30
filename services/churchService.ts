import { supabase } from './supabaseClient';
import { ChurchTenant } from '../types';

const mapToFrontend = (c: any): ChurchTenant => ({
	id: c.id,
	name: c.name,
	slug: c.slug,
	logo: c.logo,
	cnpj: c.cnpj,
	responsibleName: c.responsible_name,
	email: c.email,
	phone: c.phone,
	status: c.status,
	plan: c.plan,
	primaryColor: c.primary_color,
	secondaryColor: c.secondary_color,
	createdAt: c.created_at,
	addressDetails: c.address_details,
	stats: c.stats || { totalMembers: 0, activeCells: 0, monthlyGrowth: 0 },
});

const mapToDb = (c: Partial<ChurchTenant>) => {
	const db: any = {};
	// NUNCA enviar id no payload de update/insert se ele for PK auto-gerado ou já passado no filtro
	if (c.name !== undefined) db.name = c.name;
	if (c.slug !== undefined) db.slug = c.slug;
	if (c.logo !== undefined) db.logo = c.logo;
	if (c.cnpj !== undefined) db.cnpj = c.cnpj;
	if (c.responsibleName !== undefined) db.responsible_name = c.responsibleName;
	if (c.email !== undefined) db.email = c.email;
	if (c.phone !== undefined) db.phone = c.phone;
	if (c.status !== undefined) db.status = c.status;
	if (c.plan !== undefined) db.plan = c.plan;
	if (c.primaryColor !== undefined) db.primary_color = c.primaryColor;
	if (c.secondaryColor !== undefined) db.secondary_color = c.secondaryColor;
	if (c.createdAt !== undefined) db.created_at = c.createdAt;
	if (c.addressDetails !== undefined) db.address_details = c.addressDetails;
	if (c.stats !== undefined) db.stats = c.stats;
	return db;
};

export const churchService = {
	async list() {
		const { data, error } = await supabase
			.from('churches')
			.select('*')
			.order('name');

		if (error) throw error;

		const churches = data || [];

		// Buscar estatísticas reais para cada igreja
		const churchesWithStats = await Promise.all(churches.map(async (church) => {
			const [membersCount, cellsCount] = await Promise.all([
				supabase.from('members').select('*', { count: 'exact', head: true }).eq('church_id', church.id),
				supabase.from('cells').select('*', { count: 'exact', head: true }).eq('church_id', church.id)
			]);

			return mapToFrontend({
				...church,
				stats: {
					totalMembers: membersCount.count || 0,
					activeCells: cellsCount.count || 0,
					monthlyGrowth: 0
				}
			});
		}));

		return churchesWithStats;
	},

	async getBySlug(slug: string) {
		if (!slug) return null;
		const { data, error } = await supabase
			.from('churches')
			.select('*')
			.eq('slug', slug)
			.maybeSingle();

		if (error) throw error;
		return data ? mapToFrontend(data) : null;
	},

	async getById(id: string) {
		if (!id) return null;
		const { data, error } = await supabase
			.from('churches')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) throw error;
		return data ? mapToFrontend(data) : null;
	},

	async getFirst() {
		const { data, error } = await supabase
			.from('churches')
			.select('*')
			.limit(1)
			.maybeSingle();

		if (error) throw error;
		return data ? mapToFrontend(data) : null;
	},

	async update(id: string, updates: Partial<ChurchTenant>) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('churches')
			.update(dbData)
			.eq('id', id)
			.select()
			.maybeSingle();

		if (error) throw error;
		return data ? mapToFrontend(data) : null;
	},

	async create(church: Partial<ChurchTenant>) {
		const dbData = mapToDb(church);
		const { data, error } = await supabase
			.from('churches')
			.insert([dbData])
			.select()
			.maybeSingle();

		if (error) throw error;
		return data ? mapToFrontend(data) : null;
	}
};
