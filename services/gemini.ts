import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function generateWritingAssistance(prompt: string, context: string = "") {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Contexto do manuscrito:\n${context}\n\n---\n\nSolicitação do autor:\n${prompt}`,
    config: {
      systemInstruction: `Você é um assistente editorial experiente e empático para a plataforma ORÁCULO.

DIRETRIZES DE RESPOSTA:
1. SEA resposta for extensão, organize em seções claras com títulos.
2. Mantenha um tom construtivo e encorajador - o autor está vulnerável ao compartilhar seu trabalho.
3. Quando sugerir mudanças, explique o "porquê" brevemente.
4. Para sugestões de rewrites, forneça a versão reescrita COMPLETA, não apenas partes.
5. Respeite a voz e estilo do autor - não force mudanças desnecessárias.
6. Use formatação leve (negrito para termos-chave, listas apenas quando necessário).
7. Responda sempre no idioma do autor (preferencialmente português brasileiro).
8. seja actionable - o autor deve saber exatamente o que fazer com seu feedback.`,
    },
  });
  return response.text;
}

export async function completeEditorialReview(text: string, bookTitle: string) {
  const model = "gemini-3.1-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Título do Livro: ${bookTitle}\n\nManuscrito:\n${text}`,
    config: {
      systemInstruction: `Você é um Editor-Chefe experiente de uma grande editora (como Companhia das Letras, Penguin Random House, Amazon KDP).

SUA TAREFA: Realizar uma REVISÃO EDITORIAL COMPLETA e formatação profissional do manuscrito.

DIRETRIZES OBRIGATÓRIAS:
1. MELHORIA DE ESCRITA: Aprimore vocabulário, corrija ritmo, adapte tom literário profissional.
2. ESTRUTURA E NARRATIVA: Organize o fluxo narrativo, garanta transições lógicas.
3. ELEMENTOS DO LIVRO: 
   - Criar/Aprimorar Índice (sumário)
   - Redigir Dedicatória e Agradecimentos se ausentes
   - Garantir cabeçalhos de capítulo adequados
4. PADRÃO EDITORIAL: Formatar para padrões profissionais (margens, fonte consistente, página de rosto)
5. OUTPUT: Retornar o conteúdo TOTALMENTE EDITADO e RESTRUCTURADO.
6. IDIOMA: Manter em português brasileiro, corrigindo apenas erros evidentes de outros idiomas.

Mantenha a voz original do autor mas eleve aos padrões profissionais.`,
    },
  });
  return response.text;
}

export async function generateBookCover(prompt: string) {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `Professional book cover design for: ${prompt}. High quality, artistic, cinematic lighting, book cover layout style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate cover image");
}

export async function editBookCover(prompt: string, base64Image: string, mimeType: string) {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: `Improve or modify this book cover based on these instructions: ${prompt}. Maintain professional book cover standards, high quality, artistic.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit cover image");
}

export async function generateIllustration(prompt: string) {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: `Professional book illustration for: ${prompt}. High quality, artistic, detailed, matching book style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate illustration");
}

export async function generateManuscript(text: string, bookTitle: string, author: string) {
  const model = "gemini-3.1-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Book Title: ${bookTitle}\nAuthor: ${author}\n\nContent:\n${text}`,
    config: {
      systemInstruction: `You are a professional literary agent and manuscript specialist. 
      Your task is to transform the provided text into a PROFESSIONAL MANUSCRIPT as required by major publishers and literary agents.
      
      Follow these strict industry standards:
      1. Standard Manuscript Format: Times New Roman, 12pt, double-spaced (simulated in text).
      2. Title Page: Create a professional title page with author contact info (placeholder), word count, and title.
      3. Headers: Include a running header with Author Name / TITLE / Page Number.
      4. Chapter Breaks: Ensure clear and consistent chapter starts.
      5. Scene Breaks: Use standard symbols (e.g., # or ***) for scene transitions.
      6. Dialogue: Ensure proper punctuation and indentation for dialogue.
      7. Output: Return the FULL MANUSCRIPT text, ready for submission.`,
    },
  });
  return response.text;
}

export async function suggestCoverPrompt(title: string, content: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Title: ${title}\n\nContent Summary: ${content.substring(0, 2000)}\n\nTask: Suggest a highly descriptive visual prompt for a book cover that captures the essence of this story. Focus on mood, style, and key elements. Return ONLY the prompt text.`,
    config: {
      systemInstruction: "You are a professional book cover designer. Create compelling visual prompts for AI image generation.",
    },
  });
  return response.text;
}

export async function translateText(text: string, targetLanguage: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Translate the following text to ${targetLanguage}:\n\n${text}`,
    config: {
      systemInstruction: "You are a professional translator. Provide accurate and culturally appropriate translations while maintaining the original tone.",
    },
  });
  return response.text;
}

function createWavHeader(dataLength: number, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  /* RIFF identifier */
  view.setUint32(0, 0x52494646, false);
  /* file length */
  view.setUint32(4, 36 + dataLength, true);
  /* RIFF type */
  view.setUint32(8, 0x57415645, false);
  /* format chunk identifier */
  view.setUint32(12, 0x666d7420, false);
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  view.setUint32(36, 0x64617461, false);
  /* data chunk length */
  view.setUint32(40, dataLength, true);

  return buffer;
}

export async function generateAudiobook(text: string, voice: string = "Kore") {
  const model = "gemini-2.5-flash-preview-tts";
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = createWavHeader(len, 24000);
    const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
    return URL.createObjectURL(wavBlob);
  }
  throw new Error("Failed to generate audio");
}

export async function generateSynopsis(title: string, genre: string, initialContent: string = "") {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Título: ${title}\nGênero: ${genre}\nIdeia/Conteúdo Inicial: ${initialContent}\n\nTarefa: Gere uma sinopse de livro profissional e envolvente para este projeto. A sinopse deve ser cativante para potenciais leitores e capturar a essência da história. Retorne APENAS o texto da sinopse em português brasileiro. Inclua:\n- Hook inicial (frase de impacto)\n- Apresentação do protagonista e conflito\n- Tom atmosférico que combine com o gênero`,
    config: {
      systemInstruction: "Você é um especialista em marketing de livros e editor. Crie sinopses de alta conversão que vendam o livro.",
    },
  });
  return response.text;
}

export async function generateBackCoverText(title: string, synopsis: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Title: ${title}\nSynopsis: ${synopsis}\n\nTask: Generate a professional and compelling back cover text (texto de contracapa/orelha) for this book. It should include a punchy blurb, a brief author bio placeholder, and a call to action. Return ONLY the text in Portuguese (pt-BR).`,
    config: {
      systemInstruction: "You are a professional book marketing specialist. Create high-converting back cover copy.",
    },
  });
  return response.text;
}

export async function humanizeText(text: string) {
  const model = "gemini-3.1-pro-preview"; // Pro is better for subtle stylistic changes
  const response = await ai.models.generateContent({
    model,
    contents: `Text to humanize:\n\n${text}\n\nTask: Rewrite the text above to make it sound more natural, human, and less like it was generated by an AI. Focus on varied sentence structure, subtle imperfections, emotional depth, and a more personal voice. Maintain the original meaning but improve the "human" feel. Return ONLY the rewritten text in Portuguese (pt-BR).`,
    config: {
      systemInstruction: "You are a professional ghostwriter and stylistic editor. Your goal is to make text indistinguishable from human writing.",
    },
  });
  return response.text;
}

export async function mimicWriterStyle(text: string, styleReference: string) {
  const model = "gemini-3.1-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Style Reference (Writer/Style): ${styleReference}\n\nText to transform:\n\n${text}\n\nTask: Rewrite the text above strictly following the writing style, tone, vocabulary, and sentence structure of the provided style reference. Capture the unique "voice" of the target style. Return ONLY the transformed text in Portuguese (pt-BR).`,
    config: {
      systemInstruction: "You are a master of literary mimicry. You can perfectly replicate any writing style or author's voice.",
    },
  });
  return response.text;
}

export async function generateChildrensStory(topic: string, ageGroup: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Topic: ${topic}\nAge Group: ${ageGroup}\n\nTask: Generate a complete children's story script. Include a title, a brief synopsis, and then the story divided into pages (Page 1, Page 2, etc.). For each page, provide the story text and a detailed illustration prompt for an AI image generator. Return ONLY the script in Portuguese (pt-BR).`,
    config: {
      systemInstruction: "You are a professional children's book author and illustrator. Create engaging, age-appropriate stories with vivid visual descriptions.",
    },
  });
  return response.text;
}

export async function getTrendingThemes() {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: "What are the most discussed and trending book themes, topics, and genres on the web right now? Provide a list of 5-10 themes with a brief explanation for each.",
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a literary trend analyst. Use Google Search to find current trending topics in the book world.",
    },
  });
  return response.text;
}

export async function generateEbookOutline(theme: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Theme: ${theme}\n\nTask: Generate a comprehensive e-book outline. Include a title, a target audience description, and a list of chapters with brief summaries for each. Return ONLY the outline in Portuguese (pt-BR).`,
    config: {
      systemInstruction: "You are a professional non-fiction e-book strategist. Create high-value, structured outlines for digital products.",
    },
  });
  return response.text;
}
