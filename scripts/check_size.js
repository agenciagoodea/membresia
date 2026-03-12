
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function checkPayloadSize() {
	const { data: prayers, error } = await supabase.from('prayers').select('id, name, photo');
	if (error) {
		console.error('Error:', error);
		return;
	}
	console.log('--- PAYLOAD SIZE ANALYSIS ---');
	prayers?.forEach(p => {
		const sizeKB = p.photo ? (p.photo.length / 1024).toFixed(2) : 0;
		console.log(`ID: ${p.id} | Name: ${p.name} | Photo Size: ${sizeKB} KB`);
	});
}
checkPayloadSize();
