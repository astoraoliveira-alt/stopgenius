
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Player, Difficulty } from "../types";

const modelName = "gemini-3-flash-preview";

export async function getCategorySuggestions() {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return [];

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Sugira 2 categorias (temas) criativas, divertidas e inusitadas para um jogo de STOP (Adedonha). 
  As categorias devem ser curtas (máximo 3 palavras).
  Responda APENAS um array JSON com strings. Exemplo: ["Vilões de Cinema", "Itens de Mochila"]`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
      }
    });
    const text = response.text || "[]";
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Erro ao sugerir categorias:", error);
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
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
    console.error("ERRO: API_KEY não encontrada.");
    throw new Error("Configuração de API pendente.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = modelName;
  
  const categoryNames = categories.map(c => c.name);
  const targetLetter = letter.toUpperCase();

  const getDifficultyInstruction = (diff?: Difficulty) => {
    switch(diff) {
      case Difficulty.EASY: return "Simples/Iniciante: use palavras óbvias, infantis, ou deixe campos vazios.";
      case Difficulty.HARD: return "Gênio: use palavras complexas, raras ou técnicas.";
      default: return "Médio: use vocabulário comum e padrão de um jogador brasileiro.";
    }
  };

  const botProfiles = botPlayers.map(b => `${b.name} (Dificuldade: ${getDifficultyInstruction(b.difficulty)})`).join("\n- ");
  
  const prompt = `
    VOCÊ É UM JUIZ BRASILEIRO ESPECIALISTA EM 'STOP' (ADEDONHA).
    SUA MISSÃO É ANALISAR AS RESPOSTAS COM RIGOR LÓGICO, MAS SEM SER PEDANTE.

    DADOS DA RODADA:
    - LETRA OBRIGATÓRIA: "${targetLetter}"
    - CATEGORIAS: ${categoryNames.join(", ")}

    PERFIL DOS BOTS PARA GERAR RESPOSTAS:
    - ${botProfiles}

    ENTRADA HUMANA:
    - HUMANO (${humanPlayer.name}): ${JSON.stringify(humanAnswers)}

    SUAS TAREFAS:
    1. GERAR respostas para cada um dos BOTS listados acima, respeitando estritamente a dificuldade/personalidade de cada um.
    2. JULGAR TODAS AS RESPOSTAS (Humano e Bots) para CADA categoria.
    3. REGRAS DE VALIDAÇÃO:
       - A palavra deve começar com "${targetLetter}" (ignore acentos/cedilha: 'Á' vale para 'A').
       - A palavra deve pertencer à categoria. 
       - IMPORTANTE: Não invalide palavras óbvias! "Jaca" é Fruta, "Jabuti" é Animal, "Jarra" é Objeto, "Faca" é Objeto. Seja justo com o vocabulário brasileiro comum.
       - JUSTIFICATIVA: No campo "reason", explique SEMPRE por que aceitou ou recusou. Use um tom amigável mas técnico.

    SISTEMA DE PONTOS:
    - 0: Inválido ou Vazio.
    - 5: Válido, mas repetido (exatamente igual a outra resposta aceita na mesma categoria).
    - 10: Válido e único na categoria.

    RESPOSTA OBRIGATÓRIA EM JSON:
    {
      "judgments": [
        {
          "playerName": "Nome exato do jogador",
          "categoryName": "Nome exato da categoria",
          "answer": "Resposta dada",
          "isValid": true/false,
          "score": 0/5/10,
          "reason": "Explicação detalhada da sua análise"
        }
      ],
      "botAnswers": [
        {
          "botName": "Nome do bot",
          "responses": [{"category": "Nome", "answer": "Resposta"}]
        }
      ]
    }

    NÃO PULE NENHUM JOGADOR. JULGUE O HUMANO "${humanPlayer.name}" COM O MESMO CRITÉRIO DOS BOTS.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, 
      }
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);
    console.debug("Gênio Judgment:", parsed);
    return parsed;
  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    throw error;
  }
}
