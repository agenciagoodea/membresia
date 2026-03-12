
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPrayers() {
	const { data, error } = await supabase
		.from('prayers')
		.select('id, name, status, church_id');

	if (error) {
		console.error('Erro ao buscar orações:', error);
	} else {
		console.log('Orações encontradas:', data);
		if (data && data.length > 0) {
			const { data: churches } = await supabase.from('churches').select('id, name');
			console.log('Igrejas no banco:', churches);
		}
	}
}

checkPrayers();
