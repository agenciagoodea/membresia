
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkChurches() {
	const { data, error } = await supabase
		.from('churches')
		.select('id, name');

	if (error) {
		console.error('Erro ao buscar igrejas:', error);
	} else {
		console.log('Igrejas encontradas:', data);
	}
}

checkChurches();
