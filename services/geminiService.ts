
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing (VITE_GEMINI_API_KEY). IA Insights will not work.");
    return null;
  }
  return new GoogleGenAI(apiKey);
};

export async function generatePastoralInsight(context: string) {
  try {
    const ai = getAI();
    if (!ai) return "IA não configurada. Configure a VITE_GEMINI_API_KEY.";

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(`Você é um consultor eclesiástico sênior especialista na Visão Celular. Com base nos seguintes dados da igreja, forneça 3 sugestões estratégicas para acelerar a Escada do Sucesso (Ganhar, Consolidar, Discipular e Enviar). Dados: ${context}`);
    const result = await response.response;
    return result.text();
  } catch (error) {
    console.error("Error generating insight:", error);
    return "Não foi possível gerar insights no momento. Verifique sua conexão.";
  }
}

export async function generateSermonDraft(theme: string) {
  try {
    const ai = getAI();
    if (!ai) return "IA não configurada. Configure a VITE_GEMINI_API_KEY.";

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(`Crie um esboço de sermão impactante para uma célula com o tema: "${theme}". Inclua um texto base bíblico, 3 pontos principais e uma aplicação prática voltada para evangelismo (Ganhar).`);
    const result = await response.response;
    return result.text();
  } catch (error) {
    console.error("Error generating sermon:", error);
    return "Erro ao gerar esboço de sermão.";
  }
}
