const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const supabaseAnonKey = 'sb_publishable_H0Z5VavSF8xGiKNWcdFYWQ_qTULgdT5';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addMaster() {
  const email = 'contato@agenciagoodea.com';
  const password = '04039866@AAs';
  const name = 'Agência Goodea';

  console.log(`Iniciando cadastro de ${name} (${email})...`);

  // 1. Criar usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
      }
    }
  });

  if (authError) {
    console.error('Erro no Supabase Auth:', authError.message);
    // Se o erro for que o usuário já existe, continuamos para o banco
    if (authError.message.includes('already registered')) {
      console.log('Usuário já existe no Auth, prosseguindo para o banco de dados...');
    } else {
      process.exit(1);
    }
  } else {
    console.log('Usuário criado com sucesso no Supabase Auth.');
  }

  // 2. Inserir na tabela members
  // Buscamos a primeira igreja disponível para vincular (mesmo que Master Admin seja global)
  const { data: churches } = await supabase.from('churches').select('id').limit(1);
  const churchId = churches && churches.length > 0 ? churches[0].id : null;

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .insert([
      {
        name: name,
        email: email,
        role: 'MASTER ADMIN',
        stage: 'ENVIAR',
        church_id: churchId,
        avatar: 'https://ui-avatars.com/api/?name=Agencia+Goodea&background=2563eb&color=fff&size=200'
      }
    ])
    .select();

  if (memberError) {
    console.error('Erro ao inserir na tabela members:', memberError.message);
    process.exit(1);
  }

  console.log('Usuário Master Administrador cadastrado com sucesso no banco de dados!');
  console.log('Dados do membro:', memberData);
}

addMaster();
