import { supabase } from './supabaseClient';

export async function generatePastoralInsight(context: string) {
  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-content', {
      body: { 
        prompt: `Você é um consultor eclesiástico sênior especialista na Visão Celular. Com base nos seguintes dados da igreja, forneca 3 sugestões estratégicas para acelerar a Escada do Sucesso (Ganhar, Consolidar, Discipular e Enviar). Dados: ${context}`,
        type: 'insight'
      }
    });

    if (error) throw error;
    if (!data.ok) throw new Error(data.message);

    return data.text;
  } catch (error: any) {
    console.error("Error generating insight:", error);
    return error.message || "Não foi possível gerar insights no momento. Verifique as configurações de IA.";
  }
}

export async function generateSermonDraft(theme: string) {
  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-content', {
      body: { 
        prompt: `Crie um esboço de sermão impactante para uma célula com o tema: "${theme}". Inclua um texto base bíblico, 3 pontos principais e uma aplicação prática voltada para evangelismo (Ganhar).`,
        type: 'sermon'
      }
    });

    if (error) throw error;
    if (!data.ok) throw new Error(data.message);

    return data.text;
  } catch (error: any) {
    console.error("Error generating sermon:", error);
    return error.message || "Erro ao gerar esboço de sermão. Verifique as configurações de IA.";
  }
}
