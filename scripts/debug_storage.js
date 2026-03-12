
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZ2p3b2dsbWNtenVscGxjZ2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1Nzk4MywiZXhwIjoyMDg3MjMzOTgzfQ.C_8sW_w8sC8pxgpRuxGCYXSoe9p-4uD0cUC0NXoIpwE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkStorage() {
	const { data: buckets, error } = await supabase.storage.listBuckets();
	if (error) {
		console.error('Error listing buckets:', error);
		return;
	}
	console.log('Buckets:', JSON.stringify(buckets, null, 2));

	const { data: policies, error: polError } = await supabase.rpc('get_storage_policies');
	// get_storage_policies might not exist, but let's see if we can query the table directly if we have service role
	// Actually, let's just try to upload a dummy file via service role to see if it works.

	console.log('--- Testing upload with Service Role ---');
	const dummyFile = Buffer.from('test');
	const { data: uploadData, error: uploadError } = await supabase.storage
		.from('prayer-photos')
		.upload('test.txt', dummyFile, { upsert: true });

	if (uploadError) {
		console.error('Service Role Upload Error:', uploadError);
	} else {
		console.log('Service Role Upload Success:', uploadData);
	}
}

checkStorage();
