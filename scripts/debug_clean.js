
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function debug() {
	const { data: prayers } = await supabase.from('prayers').select('id, name, status, church_id');
	const { data: churches } = await supabase.from('churches').select('id, name');
	console.log('--- CHURCHES ---');
	console.log(JSON.stringify(churches, null, 2));
	console.log('--- PRAYERS ---');
	console.log(JSON.stringify(prayers, null, 2));
}
debug();
