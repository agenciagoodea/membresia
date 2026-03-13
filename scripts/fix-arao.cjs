const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wggjwoglmcmzulplcged.supabase.co';
const supabaseAnonKey = 'sb_publishable_H0Z5VavSF8xGiKNWcdFYWQ_qTULgdT5';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixArao() {
  const email = 'arao@mircentrosul.com';
  const password = '1234567890';
  const name = 'Ap. Arão Amazonas';

  console.log(`Corrigindo acesso de ${name} (${email})...`);

  // 1. Tentar criar usuário no Auth
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
    console.log('Aviso/Erro no Supabase Auth:', authError.message);
    if (authError.message.includes('already registered')) {
      console.log('Usuário já existe no Auth. Para alterar a senha de um usuário existente sem o Admin API (Service Role), o próprio usuário precisaria solicitar a redefinição de senha ou logar e alterar.');
      console.log('TENTANDO EXECUTAR SIGNIN COM A NOVA SENHA PARA VERIFICAR...');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
          console.error('ERRO: Não foi possível logar com a nova senha. Provavelmente o usuário já existia com outra senha e não foi atualizado.');
          console.log('Como sou um agente e não tenho a Service Role Key, não posso "forçar" a alteração da senha de um usuário já registrado no Auth.');
      } else {
          console.log('Sucesso: O usuário já está configurado com esta senha no Auth.');
      }
    }
  } else {
    console.log('Usuário registrado com sucesso no Supabase Auth com a nova senha.');
  }

  // 2. Garantir que o password na tabela members está sincronizado (para fins de histórico/legado que o user parece usar)
  const { error: memberError } = await supabase
    .from('members')
    .update({ password: password })
    .eq('email', email);

  if (memberError) {
    console.error('Erro ao atualizar tabela members:', memberError.message);
  } else {
    console.log('Tabela members atualizada com a nova senha.');
  }
}

fixArao();
