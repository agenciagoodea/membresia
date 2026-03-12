
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZ2p3b2dsbWNtenVscGxjZ2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1Nzk4MywiZXhwIjoyMDg3MjMzOTgzfQ.C_8sW_w8sC8pxgpRuxGCYXSoe9p-4uD0cUC0NXoIpwE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixStorage() {
	console.log('--- ATUALIZANDO CONFIGURAÇÃO DO BUCKET ---');

	// Atualiza o bucket para ser mais flexível
	const { error: bucketError } = await supabase.storage.updateBucket('prayer-photos', {
		public: true,
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif'], // Adicionado image/jpeg e heic
		fileSizeLimit: 10485760 // Aumentado para 10MB
	});

	if (bucketError) {
		console.error('Erro ao atualizar bucket:', bucketError.message);
	} else {
		console.log('Sucesso: Bucket atualizado com suporte a image/jpeg e heic.');
	}

	console.log('--- FIM DO SCRIPT DE AJUSTE ---');
}

fixStorage();
