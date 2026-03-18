import { supabase } from './supabaseClient';
import { PrayerRequest } from '../types';

const mapToFrontend = (p: any): PrayerRequest => ({
	id: p.id,
	name: p.name,
	phone: p.phone,
	email: p.email,
	photo: p.photo,
	request: p.request,
	status: p.status,
	createdAt: p.created_at,
	consentLGPD: p.consent_lgpd,
	isAnonymous: p.is_anonymous,
	targetPerson: p.target_person,
	targetName: p.target_name,
	allowScreenBroadcast: p.show_on_screen,
	requestPastoralCall: p.request_pastoral_call,
	addressDetails: p.address_details,
});

const mapToDb = (p: Partial<PrayerRequest> & { church_id?: string }) => {
	const db: any = {};
	if (p.id) db.id = p.id;
	if (p.church_id) db.church_id = p.church_id;
	if (p.name !== undefined) db.name = p.name;
	if (p.phone !== undefined) db.phone = p.phone;
	if (p.email !== undefined) db.email = p.email;
	if (p.photo !== undefined) db.photo = p.photo;
	if (p.request !== undefined) db.request = p.request;
	if (p.status !== undefined) db.status = p.status;
	if (p.createdAt !== undefined) db.created_at = p.createdAt;
	if (p.consentLGPD !== undefined) db.consent_lgpd = p.consentLGPD;
	if (p.isAnonymous !== undefined) db.is_anonymous = p.isAnonymous;
	if (p.targetPerson !== undefined) db.target_person = p.targetPerson;
	if (p.targetName !== undefined) db.target_name = p.targetName;
	if (p.allowScreenBroadcast !== undefined) db.show_on_screen = p.allowScreenBroadcast;
	if (p.requestPastoralCall !== undefined) db.request_pastoral_call = p.requestPastoralCall;
	if (p.addressDetails !== undefined) db.address_details = p.addressDetails;
	return db;
};

// Colunas essenciais para listagem de orações
const PRAYER_LIST_COLUMNS = 'id, name, phone, email, photo, status, created_at, request, target_name, show_on_screen, is_anonymous, target_person, request_pastoral_call, address_details';

export const prayerService = {
	async getAll(churchId: string, range?: { from: number; to: number }) {
		let query = supabase
			.from('prayers')
			.select(PRAYER_LIST_COLUMNS)
			.eq('church_id', churchId)
			.order('created_at', { ascending: false });

		if (range) {
			query = query.range(range.from, range.to);
		}

		const { data, error } = await query;

		if (error) throw error;
		return (data || []).map(mapToFrontend);
	},

	async create(request: Omit<PrayerRequest, 'id'> & { church_id: string }) {
		const dbData = mapToDb(request);
		const { data, error } = await supabase
			.from('prayers')
			.insert([dbData])
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	async updateStatus(id: string, status: string) {
		const { data, error } = await supabase
			.from('prayers')
			.update({ status })
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;
		return mapToFrontend(data);
	},

	subscribeToPrayers(callback: (payload: any) => void) {
		const channelId = `prayers-${Math.random().toString(36).substring(2, 9)}`;
		return supabase
			.channel(channelId)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'prayers'
				},
				(payload) => callback(payload)
			)
			.subscribe();
	},

	async delete(id: string) {
		const { error } = await supabase
			.from('prayers')
			.delete()
			.eq('id', id);

		if (error) throw error;
	},

	async uploadPhoto(file: File) {
		const fileExt = file.name.split('.').pop();
		const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
		const filePath = `prayer-requests/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('prayer-photos')
			.upload(filePath, file);

		if (uploadError) throw uploadError;

		const { data } = supabase.storage
			.from('prayer-photos')
			.getPublicUrl(filePath);

		return data.publicUrl;
	}
};
