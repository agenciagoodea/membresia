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
	if (c.id) db.id = c.id;
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
	async getBySlug(slug: string) {
		const { data, error } = await supabase
			.from('churches')
			.select('*')
			.eq('slug', slug)
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async update(id: string, updates: Partial<ChurchTenant>) {
		const dbData = mapToDb(updates);
		const { data, error } = await supabase
			.from('churches')
			.update(dbData)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	}
};
