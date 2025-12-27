
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Player, Difficulty } from "../types";

// Modelos otimizados para velocidade (Flash) e qualidade (Pro)
const FAST_MODEL = "gemini-3-flash-preview";

export async function getDailyChallenge(dateSeed: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Gere um desafio de Stop para a data ${dateSeed}.
  Escolha 1 letra difícil e 5 categorias criativas.
  Responda APENAS JSON: {"letter": "X", "categories": ["Item A", "Item B", ...]}`;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0,
        seed: parseInt(dateSeed.replace(/-/g, '').substring(0, 8))
      }
    });
    return JSON.parse(response.text || "{}") as { letter: string, categories: string[] };
  } catch (error) {
    console.error("Erro ao gerar desafio diário:", error);
    return null;
  }
}

export async function getCategorySuggestions(exclude: string[] = []) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const randomSeed = Math.random().toString(36).substring(7);
  
  const prompt = `Sugira 2 categorias únicas para Stop (não use: ${exclude.join(", ")}).
  Responda APENAS array JSON de strings.`;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1.0, 
      }
    });
    return JSON.parse(response.text || "[]") as string[];
  } catch (error) {
    return [];
  }
}

export async function processMultiplayerRound(
  letter: string,
  categories: Category[],
  humanPlayer: Player,
  humanAnswers: Record<string, string>,
  botPlayers: Player[]
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetLetter = letter.toUpperCase();

  // Otimização: Passar apenas o essencial no prompt para reduzir tokens e tempo de processamento
  const botInfo = botPlayers.map(b => `${b.name} (Nível: ${b.difficulty})`).join(", ");
  
  const prompt = `
    Aja como Juiz de Stop. Letra: "${targetLetter}".
    Categorias: ${categories.map(c => c.name).join(", ")}.
    Humano (${humanPlayer.name}): ${JSON.stringify(humanAnswers)}.
    Bots: ${botInfo}.

    TAREFAS:
    1. Gere respostas realistas para os Bots (bots fáceis erram/deixam vazio).
    2. Julgue todos. Resposta deve começar com "${targetLetter}".
    3. Pontos: 0 (inválido), 10 (padrão), 15/20 (raro/genial).
    4. Comentário sarcástico curto.

    Retorne APENAS JSON:
    {
      "commentary": "texto",
      "judgments": [
        {"playerName": "n", "categoryName": "c", "answer": "a", "isValid": bool, "score": int, "reason": "r", "isGeniusChoice": bool, "emoji": "e"}
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL, // Mudança para o modelo Flash para avaliação ultra-rápida
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 0 } // Desabilita pensamento profundo para resposta instantânea
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Erro na avaliação:", error);
    throw error;
  }
}
