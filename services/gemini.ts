import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const useGemini = GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key';
const useHuggingFace = HUGGINGFACE_API_KEY && HUGGINGFACE_API_KEY !== 'your-huggingface-api-key';

let ai = useGemini ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const HF_API_BASE = "https://api-inference.huggingface.co/models";

async function callHuggingFace(endpoint: string, payload: any): Promise<any> {
  const response = await fetch(`${HF_API_BASE}/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(useHuggingFace ? { 'Authorization': `Bearer ${HUGGINGFACE_API_KEY}` } : {})
    },
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HF API error: ${response.status}`);
  return response.json();
}

function escapeXml不安全(str: string): string {
  return str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c] || c));
}

export async function generateWritingAssistance(prompt: string, context: string = "") {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Contexto do manuscrito:\n${context}\n\n---\n\nSolicitação do autor:\n${prompt}`,
      config: {
        systemInstruction: `Você é um assistente editorial experiente para a plataforma ORÁCULO. Responda em português brasileiro comtom construtivo. Forneça a versão reescrita completa quando necessário.`,
      },
    });
    return response.text;
  }
  
  if (useHuggingFace) {
    const result = await callHuggingFace("microsoft/Phi-4-mini-instruct", {
      inputs: `<|system|>\nVocê é um assistente editorial experiente. Ajude a melhorar textos em português brasileiro.<|end|>\n<|user|>\nContexto:\n${context}\n\n---\n\nSolicitação: ${prompt}<|end|>\n<|assistant|>`,
      parameters: { max_new_tokens: 2048, temperature: 0.7 }
    });
    return result[0]?.generated_text?.split('<|assistant|>')?.[1] || "Texto processado com sucesso.";
  }

  return mockResponse(prompt, context);
}

export async function completeEditorialReview(text: string, bookTitle: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Título: ${bookTitle}\n\nManuscrito:\n${text}`,
      config: {
        systemInstruction: `Você é um editor profissional. Realize revisão editorial completa: corrija gramática, melhore fluidez, adicione estrutura profissional (título, índice, dedicatória). Retorne o texto completo reescrito em português brasileiro.`,
      },
    });
    return response.text;
  }

  if (useHuggingFace) {
    const result = await callHuggingFace("microsoft/Phi-4-mini-instruct", {
      inputs: `<|system|>\nVocê é um editor profissional brasileiro. Revise e melhore o texto mantendo a voz do autor.<|end|>\n<|user|>\nRevise o seguinte manuscrito do livro "${bookTitle}":\n\n${text}<|end|>\n<|assistant|>`,
      parameters: { max_new_tokens: 4096, temperature: 0.5 }
    });
    return result[0]?.generated_text?.split('<|assistant|>')?.[1] || text;
  }

  return mockEditorialReview(text, bookTitle);
}

export async function generateBookCover(prompt: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image",
      contents: {
        parts: [{ text: `Professional book cover: ${prompt}. High quality, artistic, cinematic.` }],
      },
      config: { responseModalities: [Modality.IMAGE] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  if (useHuggingFace) {
    const result = await callHuggingFace("stabilityai/stable-diffusion-3.5-medium", {
      inputs: `Professional book cover: ${prompt}, high quality, artistic, cinematic lighting, book cover layout`,
    });
    if (result?.[0]?.blob) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(result[0].blob)));
      return `data:image/png;base64,${base64}`;
    }
  }

  return generatePlaceholderCover(prompt);
}

export async function editBookCover(prompt: string, base64Image: string, mimeType: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType } },
          { text: `Modify this book cover: ${prompt}` }
        ],
      },
      config: { responseModalities: [Modality.IMAGE] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return generatePlaceholderCover(prompt);
}

export async function generateManuscript(text: string, bookTitle: string, author: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Título: ${bookTitle}\nAutor: ${author}\n\nConteúdo:\n${text}`,
      config: {
        systemInstruction: `Formate o texto como um manuscrito profissional: página de título, cabeçalhos com autor/título, quebras de capítulo com #, etc. Retorne o texto completo em português brasileiro.`,
      },
    });
    return response.text;
  }

  return mockManuscript(text, bookTitle, author);
}

export async function suggestCoverPrompt(title: string, content: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Título: ${title}\nConteúdo: ${content.substring(0, 1000)}`,
      config: {
        systemInstruction: `Crie um prompt visual descritivo para uma capa de livro. Foque em mood, estilo e elementos-chave. Retorne APENAS o prompt em inglês.`,
      },
    });
    return response.text;
  }

  return `Elegant ${title} book cover, mysterious atmosphere, gold accents, professional design`;
}

export async function translateText(text: string, targetLanguage: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Translate to ${targetLanguage}:\n\n${text}`,
      config: { systemInstruction: "Traduza com precisão mantendo o tom original." },
    });
    return response.text;
  }

  return `[Tradução para ${targetLanguage}]\n${text}`;
}

export async function generateSynopsis(title: string, genre: string, initialContent: string = "") {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Título: ${title}\nGênero: ${genre}\nConteúdo: ${initialContent}`,
      config: {
        systemInstruction: `Crie uma sinopse profissional de livro. Inclua: hook inicial, apresentação do protagonista, tom atmosférico. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return `Em "${title}", uma história envolvente aguarda. Quando as circunstâncias mudam tudo, ${genre === 'Ficção' ? 'um protagonista deve enfrentar desafios inesperados' : 'o leitor é levado a uma jornada inesquecível'}. Uma narrativa que captura a essência da experiência humana.`;
}

export async function generateBackCoverText(title: string, synopsis: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Título: ${title}\nSinopse: ${synopsis}`,
      config: {
        systemInstruction: `Crie texto de contracapa profissional: blurb impactante, mini bio do autor, call to action. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return `Prepare-se para uma jornada inesquecível.\n\n${synopsis}\n\nUma obra que vai marcar sua leitura.`;
}

export async function humanizeText(text: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Humanize:\n\n${text}`,
      config: {
        systemInstruction: `Reescreva o texto para parecer mais natural e humano. Evite padrões de IA. Mantenha o significado original. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return text;
}

export async function mimicWriterStyle(text: string, styleReference: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Estilo: ${styleReference}\n\nTexto:\n${text}`,
      config: {
        systemInstruction: `Reescreva o texto no estilo de ${styleReference}. Capture a voz única. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return text;
}

export async function generateIllustration(prompt: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image",
      contents: { parts: [{ text: `Book illustration: ${prompt}, colorful, professional.` }] },
      config: { responseModalities: [Modality.IMAGE] }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return generatePlaceholderIllustration(prompt);
}

export async function generateChildrensStory(topic: string, ageGroup: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Tópico: ${topic}\nFaixa etária: ${ageGroup}`,
      config: {
        systemInstruction: `Crie uma história infantil completa com título, sinopse e história dividida em páginas. Para cada página, forneça o texto e prompt de ilustração. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return `Título: ${topic}\n\nSinopse: Uma aventura mágica para crianças de ${ageGroup} anos.\n\n---\n\nPágina 1: ${topic} era muito curioso...\n[Ilustração: personagem principal olhando algo misterioso]\n\nPágina 2: De repente, algo mágico aconteceu!\n[Ilustração: cena mágica acontecendo]`;
}

export async function getTrendingThemes() {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Quais são os temas de livros mais populares agora? Liste 5-10 com breve explicação.",
      config: { systemInstruction: "Você é um analista de tendências literárias." },
    });
    return response.text;
  }

  return `1. Ficção climática - histórias sobre mudanças climáticas
2. Memórias de resiliência - superação pessoal
3. Ficção histórica brasileira
4. Fantasy urbano brasileiro
5.autoajuda prática`;
}

export async function generateEbookOutline(theme: string) {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Tema: ${theme}`,
      config: {
        systemInstruction: `Crie um outline de e-book: título, audiência-alvo, capítulos com resumos. Retorne em português brasileiro.`,
      },
    });
    return response.text;
  }

  return `Título: Guia Completo de ${theme}\n\nAudiência: Interessados no tema\n\nCapítulos:\n1. Introdução\n2. Fundamentos\n3. Aplicação Prática\n4. Casos de Estudo\n5. Conclusão`;
}

function mockResponse(prompt: string, context: string): string {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('expand') || lowerPrompt.includes('expanda')) {
    return `${context}\n\n*A narrativa continua enquanto os eventos se desenrolam, revelando camadas mais profundas de significado e emocões que permeiam cada cena, criando uma atmosfera envolvente que captura a atenção do leitor do início ao fim.*`;
  }
  if (lowerPrompt.includes('improve') || lowerPrompt.includes('melhore')) {
    return context.split('.').map(s => s.trim()).filter(s => s).map(s => s.charAt(0).toUpperCase() + s.slice(1) + '.').join(' ');
  }
  if (lowerPrompt.includes('summarize') || lowerPrompt.includes('resuma')) {
    return 'Este trecho apresenta uma narrativa envolvente que explora temas de importância significativa, com desenvolvimento de personagens que reflete as complexities da experiência humana.';
  }
  if (lowerPrompt.includes('suggest') || lowerPrompt.includes('sugira')) {
    return 'Baseado no contexto, a narrativa poderia continuar com: um evento inesperado que muda tudo, uma revelação sobre o protagonista, ou uma escolha difícil que definirá o destino do herói.';
  }
  return 'Texto processado com sucesso pela IA local.';
}

function mockEditorialReview(text: string, bookTitle: string): string {
  return `=== EDIÇÃO EDITORIAL COMPLETA ===

${bookTitle.toUpperCase()}

--- DEDICATÓRIA ---
Aos leitores que acreditam no poder das histórias.

--- AGRADECIMENTOS ---
A todos que tornaram este projeto possível.

--- ÍNDICE ---
1. Introdução..............1
2. Desenvolvimento........5
3. Conclusão...............15

--- CAPÍTULO 1 ---

${text}

--- FIM DO MANUSCRITO ---`;
}

function mockManuscript(text: string, bookTitle: string, author: string): string {
  return `══════════════════════════════════════════
${bookTitle.toUpperCase()}
por ${author}
══════════════════════════════════════════

${text}

══════════════════════════════════════════
Fim
══════════════════════════════════════════`;
}

function generatePlaceholderCover(prompt: string): string {
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483'];
  const color = colors[prompt.length % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect fill="url(#grad)" width="600" height="800"/>
    <rect x="50" y="50" width="500" height="700" fill="none" stroke="#D4AF37" stroke-width="3"/>
    <text x="300" y="400" font-family="Georgia, serif" font-size="32" fill="#D4AF37" text-anchor="middle" font-weight="bold">${escapeXml不安全(prompt.substring(0, 30))}</text>
    <text x="300" y="450" font-family="Georgia, serif" font-size="18" fill="#888" text-anchor="middle">Capa Gerada</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generatePlaceholderIllustration(prompt: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect fill="#1a1a2e" width="512" height="512"/>
    <circle cx="256" cy="200" r="80" fill="#D4AF37" opacity="0.3"/>
    <rect x="136" y="320" width="240" height="120" rx="10" fill="#D4AF37" opacity="0.5"/>
    <text x="256" y="390" font-family="Arial" font-size="16" fill="white" text-anchor="middle">Ilustração: ${escapeXml不安全(prompt.substring(0, 20))}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export async function generateAudiobook(text: string, voice: string = "Kore") {
  if (useGemini && ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-tts",
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
  }
  
  return null;
}

function createWavHeader(dataLength: number, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataLength, true);

  return buffer;
}
