
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Erro: Credenciais do Supabase não encontradas no arquivo .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CHURCH_ID = '779bc274-eab3-489e-a947-d4b0d39ed6ea';

const prayers = [
	{
		church_id: CHURCH_ID,
		name: 'Ana Cláudia Oliveira',
		request: 'Pela saúde da minha família, especialmente pelos meus avós que estão em idade avançada.',
		status: 'APROVADO',
		is_anonymous: false,
		show_on_screen: true,
		target_person: 'OTHER',
		target_name: 'Avós'
	},
	{
		church_id: CHURCH_ID,
		name: 'Marcos Roberto',
		request: 'Agradeço a Deus por uma nova oportunidade de emprego que recebi esta semana! Deus é fiel.',
		status: 'APROVADO',
		is_anonymous: false,
		show_on_screen: true,
		target_person: 'SELF'
	},
	{
		church_id: CHURCH_ID,
		name: 'Juliana Santos',
		request: 'Peço oração pelo meu casamento e pela harmonia em nosso lar. Que o Senhor restaure o amor.',
		status: 'APROVADO',
		is_anonymous: false,
		show_on_screen: true,
		target_person: 'OTHER',
		target_name: 'Família Santos'
	},
	{
		church_id: CHURCH_ID,
		name: 'Ricardo Lima',
		request: 'Por uma porta aberta na área financeira e sabedoria para administrar os recursos da melhor forma.',
		status: 'APROVADO',
		is_anonymous: false,
		show_on_screen: true,
		target_person: 'SELF'
	},
	{
		church_id: CHURCH_ID,
		name: 'Irmão em Cristo',
		request: 'Pela restauração da saúde do irmão José que está hospitalizado. Que a mão do Senhor o cure.',
		status: 'APROVADO',
		is_anonymous: true,
		show_on_screen: true,
		target_person: 'OTHER',
		target_name: 'Irmão José'
	},
	{
		church_id: CHURCH_ID,
		name: 'Beatriz Fonseca',
		request: 'Agradecimento pela formatura da minha filha e pelos planos de Deus na vida dela daqui para frente.',
		status: 'APROVADO',
		is_anonymous: false,
		show_on_screen: true,
		target_person: 'OTHER',
		target_name: 'Filha Gabriela'
	}
];

async function seed() {
	console.log('Iniciando inserção de pedidos de oração...');

	const { data, error } = await supabase
		.from('prayers')
		.insert(prayers);

	if (error) {
		console.error('Erro ao inserir dados:', error);
	} else {
		console.log('Sucesso! 6 pedidos de oração foram inseridos.');
	}
}

seed();
