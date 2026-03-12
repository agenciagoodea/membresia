
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const supabaseAnonKey = 'sb_publishable_H0Z5VavSF8xGiKNWcdFYWQ_qTULgdT5';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
	console.log('Testando query em "prayers"...');
	try {
		const { data, error } = await supabase
			.from('prayers')
			.select('*')
			.eq('church_id', '779bc274-eab3-489e-a947-d4b0d39ed6ea');

		if (error) {
			console.error('Erro detalhado:', JSON.stringify(error, null, 2));
		} else {
			console.log('Sucesso! Linhas retornadas:', data?.length || 0);
		}
	} catch (err) {
		console.error('Erro de execução:', err);
	}
}

test();
