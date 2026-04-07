'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface VoiceOption {
  id: string;
  name: string;
  type: string;
  description: string;
  lang: string;
  gender: 'female' | 'male' | 'neutral';
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', type: 'Feminina', description: 'Voz feminina suave e profissional', lang: 'pt-BR', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir', type: 'Masculina', description: 'Voz masculina profunda e narrativa', lang: 'pt-BR', gender: 'male' },
  { id: 'Puck', name: 'Puck', type: 'Feminina', description: 'Voz feminina energética e jovem', lang: 'pt-BR', gender: 'female' },
  { id: 'Charon', name: 'Charon', type: 'Masculina', description: 'Voz masculina séria e autoritária', lang: 'pt-BR', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr', type: 'Neutra', description: 'Voz neutra suave e etérea', lang: 'pt-BR', gender: 'neutral' },
];

interface GeneratedAudio {
  id: string;
  title: string;
  url: string;
  voice: string;
  date: string;
  provider: string;
  isDownloadable: boolean;
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const result = buffer.getChannelData(0);
  
  return encodeWAV(result, sampleRate);
}

export function useAudioService() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentAudioTitle, setCurrentAudioTitle] = useState('');
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioProvider, setAudioProvider] = useState<string>('Navegador');
  const [generationProgress, setGenerationProgress] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const generateWithBrowserAndRecord = useCallback(async (text: string, voiceId: string): Promise<{ url: string; isDownloadable: boolean }> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve({ url: '', isDownloadable: false });
        return;
      }

      const voiceSettings: { [key: string]: { rate: number; pitch: number } } = {
        'Kore': { rate: 0.9, pitch: 1.1 },
        'Fenrir': { rate: 0.85, pitch: 0.9 },
        'Puck': { rate: 1.0, pitch: 1.2 },
        'Charon': { rate: 0.8, pitch: 0.85 },
        'Zephyr': { rate: 0.95, pitch: 1.0 },
      };

      const settings = voiceSettings[voiceId] || voiceSettings['Kore'];
      
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = 1;

      const loadVoices = () => {
        const voices = window.speechSynthesis?.getVoices() || [];
        const ptVoices = voices.filter(v => v.lang.includes('pt') || v.lang.includes('br'));
        
        if (ptVoices.length > 0) {
          const voiceGender = AVAILABLE_VOICES.find(v => v.id === voiceId)?.gender || 'female';
          const filteredVoices = ptVoices.filter(v => {
            const name = v.name.toLowerCase();
            if (voiceGender === 'female') return !name.includes('male');
            if (voiceGender === 'male') return name.includes('male');
            return true;
          });
          utterance.voice = filteredVoices[0] || ptVoices[0];
        }
      };

      if (window.speechSynthesis?.getVoices().length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis!.onvoiceschanged = loadVoices;
      }

      speechUtteranceRef.current = utterance;
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis?.speak(utterance);
      setIsPlaying(true);
      
      resolve({ url: 'browser-speech', isDownloadable: false });
    });
  }, []);

  const generateAudio = useCallback(async (text: string, voiceId: string): Promise<{ url: string; provider: string; isDownloadable: boolean }> => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress('Preparando síntese de voz...');

    console.log('Oráculo: Gerando áudio com voz:', voiceId);

    let url = 'browser-speech';
    let usedProvider = 'Navegador (Speech Synthesis)';
    let isDownloadable = false;

    try {
      setGenerationProgress('Sintetizando voz...');
      const result = await generateWithBrowserAndRecord(text, voiceId);
      url = result.url;
      isDownloadable = result.isDownloadable;
    } catch (err) {
      console.error('Erro ao gerar áudio:', err);
      setError('Erro ao gerar áudio');
    }

    setAudioProvider(usedProvider);
    setCurrentAudioUrl(url);
    setGenerationProgress('');
    setIsGenerating(false);

    return { url, provider: usedProvider, isDownloadable };
  }, [generateWithBrowserAndRecord]);

  const playAudio = useCallback((url: string) => {
    if (url === 'browser-speech') {
      setIsPlaying(true);
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(err => {
        console.error('Erro ao reproduzir:', err);
        setError('Erro ao reproduzir áudio');
      });
      setIsPlaying(true);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioRef.current && currentAudioUrl !== 'browser-speech') {
      audioRef.current.pause();
    } else {
      window.speechSynthesis?.cancel();
    }
    setIsPlaying(false);
  }, [currentAudioUrl]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  const downloadAudio = useCallback((url: string, title: string) => {
    if (url === 'browser-speech') {
      toast.error('Áudio do navegador não pode ser baixado diretamente.');
      toast.info('O áudio será reproduzido. Para baixar, configure uma API key no arquivo .env.local');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'audiobook'}.mp3`;
    link.click();
    toast.success('Download iniciado!');
  }, []);

  const addToPlaylist = useCallback((title: string, url: string, voice: string, provider: string, isDownloadable: boolean) => {
    const newAudio: GeneratedAudio = {
      id: Date.now().toString(),
      title,
      url,
      voice,
      date: new Date().toLocaleDateString('pt-BR'),
      provider,
      isDownloadable,
    };
    setGeneratedAudios(prev => [...prev, newAudio]);
    setCurrentAudioTitle(title);
  }, []);

  const removeFromPlaylist = useCallback((id: string) => {
    setGeneratedAudios(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearPlaylist = useCallback(() => {
    generatedAudios.forEach(audio => {
      if (audio.url && audio.url.startsWith('blob:')) {
        URL.revokeObjectURL(audio.url);
      }
    });
    setGeneratedAudios([]);
    setCurrentAudioUrl(null);
    setCurrentAudioTitle('');
  }, [generatedAudios]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    isGenerating,
    isPlaying,
    currentAudioUrl,
    currentAudioTitle,
    generatedAudios,
    error,
    audioProvider,
    generationProgress,
    audioRef,
    generateAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    downloadAudio,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    setCurrentAudioUrl,
    setCurrentAudioTitle,
    setIsPlaying,
  };
}