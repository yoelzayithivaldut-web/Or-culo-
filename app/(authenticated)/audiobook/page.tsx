'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  Mic2, 
  Sparkles, 
  Loader2,
  Settings2,
  Waves
} from 'lucide-react';
import { generateAudiobook } from '@/services/gemini';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const voices = [
  { id: 'Kore', name: 'Kore', type: 'Feminina', desc: 'Calma e profissional' },
  { id: 'Fenrir', name: 'Fenrir', type: 'Masculina', desc: 'Profunda e narrativa' },
  { id: 'Puck', name: 'Puck', type: 'Feminina', desc: 'Energética e jovem' },
  { id: 'Charon', name: 'Charon', type: 'Masculina', desc: 'Séria e autoritária' },
  { id: 'Zephyr', name: 'Zephyr', type: 'Neutra', desc: 'Suave e etérea' },
];

import { useAuth } from '@/components/AuthProvider';

export default function Audiobook() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = supabaseService.subscribeToCollection(
        'books',
        { column: 'user_id', value: user.id },
        (data) => {
          setBooks(data || []);
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user]);

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId);
    const book = books.find(b => b.id === bookId);
    if (book) {
      setText(book.content || '');
    }
  };

  const handleGenerate = async () => {
    if (!text) return;
    setIsLoading(true);
    setAudioUrl(null);
    try {
      const url = await generateAudiobook(text, selectedVoice);
      setAudioUrl(url);
      toast.success('Audiobook gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar áudio.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Gerador de Audiobook</h1>
          <p className="text-gray-400">Transforme seus manuscritos em áudio de alta fidelidade com vozes naturais.</p>
        </div>
        {books.length > 0 && (
          <div className="flex items-center gap-3 bg-[#0A0A0A] border border-white/10 px-4 py-2 rounded-2xl">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <select 
              value={selectedBookId}
              onChange={e => handleBookSelect(e.target.value)}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer max-w-[200px]"
            >
              <option value="" className="bg-[#0A0A0A]">Importar de um livro...</option>
              {books.map(book => (
                <option key={book.id} value={book.id} className="bg-[#0A0A0A]">{book.title}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl h-[500px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Texto para Conversão</span>
              <div className="text-xs text-gray-500">
                {text.length} / 5000 caracteres
              </div>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Cole aqui o capítulo ou trecho que deseja converter em áudio..."
              className="w-full h-full bg-transparent text-white p-10 pt-16 text-lg leading-relaxed focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !text}
              className="flex items-center gap-3 bg-[#D4AF37] text-black px-12 py-5 rounded-2xl font-bold text-xl hover:bg-[#B8962E] transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic2 className="w-6 h-6" />}
              Gerar Áudio
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#D4AF37]" />
              Configurações de Voz
            </h3>
            <div className="space-y-3">
              {voices.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left group",
                    selectedVoice === voice.id 
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-white" 
                      : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("font-bold", selectedVoice === voice.id ? "text-[#D4AF37]" : "text-white")}>
                      {voice.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md">
                      {voice.type}
                    </span>
                  </div>
                  <p className="text-xs opacity-60">{voice.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#D4AF37] p-8 rounded-3xl text-black shadow-[0_20px_50px_rgba(212,175,55,0.3)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Waves className="text-[#D4AF37] w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Áudio Gerado</h4>
                  <p className="text-black/60 text-xs uppercase tracking-widest font-bold">Pronto para ouvir</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlay}
                  className="w-14 h-14 bg-black text-[#D4AF37] rounded-full flex items-center justify-center hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: isPlaying ? ['0%', '100%'] : '0%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-1/3 h-full bg-black"
                  />
                </div>
                <a 
                  href={audioUrl} 
                  download="audiobook.mp3"
                  className="p-3 bg-black/10 hover:bg-black/20 rounded-xl transition-all"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
              <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
