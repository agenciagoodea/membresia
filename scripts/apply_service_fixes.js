
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Usando as chaves fornecidas pelo usuário
const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZ2p3b2dsbWNtenVscGxjZ2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1Nzk4MywiZXhwIjoyMDg3MjMzOTgzfQ.C_8sW_w8sC8pxgpRuxGCYXSoe9p-4uD0cUC0NXoIpwE';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

async function applyFixes() {
	console.log('--- INICIANDO APLICAÇÃO DE CORREÇÕES (SERVICE ROLE) ---');

	// 1. Upsert da Igreja (Garante que o ID esperado existe)
	console.log('1. Garantindo existência da Igreja Vida Nova...');
	const { error: churchError } = await supabase
		.from('churches')
		.upsert({
			id: '779bc274-eab3-489e-a947-d4b0d39ed6ea',
			name: 'Igreja Vida Nova',
			slug: 'vida-nova',
			status: 'ATIVO',
			plan: 'PRO',
			primary_color: '#2563eb',
			secondary_color: '#1e40af'
		}, { onConflict: 'id' });

	if (churchError) {
		console.error('Erro ao inserir igreja:', churchError.message);
	} else {
		console.log('Sucesso: Igreja configurada.');
	}

	// 2. Criação do Bucket de Storage
	console.log('2. Configurando Bucket de Fotos (prayer-photos)...');
	const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('prayer-photos', {
		public: true,
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
		fileSizeLimit: 5242880 // 5MB
	});

	if (bucketError) {
		if (bucketError.message.includes('already exists')) {
			console.log('Aviso: O bucket "prayer-photos" já existe.');
		} else {
			console.error('Erro ao criar bucket:', bucketError.message);
		}
	} else {
		console.log('Sucesso: Bucket "prayer-photos" criado.');
	}

	console.log('--- FIM DAS CORREÇÕES PROGRAMÁTICAS ---');
	console.log('IMPORTANTE: Políticas de RLS (CREATE POLICY) ainda precisam ser executadas no SQL Editor.');
}

applyFixes();
