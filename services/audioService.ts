import { toast } from 'sonner';

const VOICE_IDS: { [key: string]: string } = {
  'Kore': '21m00Tcm4TlvDq8ikWAM',
  'Fenrir': 'ErXwbaYgnD2O7hF4LfC2',
  'Puck': 'ThT5KcBeYPv4GrbERlLt',
  'Charon': 'VR6AewLTigWG5sSO9d6',
  'Zephyr': '9DT4Kw7hW4nM9Nzk5P3',
};

let currentUtterance: SpeechSynthesisUtterance | null = null;

async function generateWithElevenLabs(text: string, voiceId: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voice = VOICE_IDS[voiceId] || VOICE_IDS['Kore'];
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('ElevenLabs error:', error);
    return null;
  }
}

async function generateWithSpeechify(text: string, voice: string): Promise<string | null> {
  const apiKey = process.env.SPEECHIFY_API_KEY || process.env.NEXT_PUBLIC_SPEECHIFY_API_KEY;
  if (!apiKey) return null;

  const voiceMap: { [key: string]: string } = {
    'Kore': 'pt_br_female_1',
    'Fenrir': 'pt_br_male_1',
    'Puck': 'pt_br_female_2',
    'Charon': 'pt_br_male_2',
    'Zephyr': 'pt_br_neutral',
  };

  const voiceId = voiceMap[voice] || voiceMap['Kore'];

  try {
    const response = await fetch('https://api.sws.speechify.com/v1/inference/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text: text,
        audio_format: 'mp3',
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data?.audio_url) {
      return data.audio_url;
    }
  } catch (error) {
    console.error('Speechify error:', error);
  }
  return null;
}

async function generateWithOpenAI(text: string, voice: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return null;

  const voiceMap: { [key: string]: string } = {
    'Kore': 'alloy',
    'Fenrir': 'onyx',
    'Puck': 'fable',
    'Charon': 'shimmer',
    'Zephyr': 'nova',
  };

  const voiceId = voiceMap[voice] || 'alloy';

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice: voiceId,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('OpenAI TTS error:', error);
  }
  return null;
}

function useBrowserSpeech(): { play: (text: string, voice: string) => void; stop: () => void; isPlaying: () => boolean } {
  const play = (text: string, voice: string) => {
    if (typeof window === 'undefined') return;

    const voiceSettings: { [key: string]: { rate: number; pitch: number } } = {
      'Kore': { rate: 0.9, pitch: 1.1 },
      'Fenrir': { rate: 0.85, pitch: 0.9 },
      'Puck': { rate: 1.0, pitch: 1.2 },
      'Charon': { rate: 0.8, pitch: 0.85 },
      'Zephyr': { rate: 0.95, pitch: 1.0 },
    };

    const settings = voiceSettings[voice] || voiceSettings['Kore'];
    
    window.speechSynthesis?.cancel();
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'pt-BR';
    currentUtterance.rate = settings.rate;
    currentUtterance.pitch = settings.pitch;
    currentUtterance.volume = 1;

    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const ptVoices = voices.filter(v => v.lang.includes('pt') || v.lang.includes('br'));
      if (ptVoices.length > 0) {
        currentUtterance!.voice = ptVoices[0];
      }
    };

    if (window.speechSynthesis?.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis!.onvoiceschanged = loadVoices;
    }

    window.speechSynthesis?.speak(currentUtterance);
  };

  const stop = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
      currentUtterance = null;
    }
  };

  const isPlaying = () => {
    return typeof window !== 'undefined' && window.speechSynthesis?.speaking === true;
  };

  return { play, stop, isPlaying };
}

const browserSpeech = useBrowserSpeech();

export async function generateAudiobook(text: string, voice: string = "Kore"): Promise<string> {
  console.log('Oráculo: Gerando audiobook com voz:', voice);

  const elevenLabsResult = await generateWithElevenLabs(text, voice);
  if (elevenLabsResult) {
    console.log('Oráculo: Áudio gerado pelo ElevenLabs');
    return elevenLabsResult;
  }

  const speechifyResult = await generateWithSpeechify(text, voice);
  if (speechifyResult) {
    console.log('Oráculo: Áudio gerado pelo Speechify');
    return speechifyResult;
  }

  const openAIResult = await generateWithOpenAI(text, voice);
  if (openAIResult) {
    console.log('Oráculo: Áudio gerado pelo OpenAI TTS');
    return openAIResult;
  }

  console.log('Oráculo: Nenhuma API externa disponível, usando browser speech');
  browserSpeech.play(text, voice);
  return 'browser-speech';
}

export function stopSpeech() {
  browserSpeech.stop();
}

export function isSpeechPlaying(): boolean {
  return browserSpeech.isPlaying();
}