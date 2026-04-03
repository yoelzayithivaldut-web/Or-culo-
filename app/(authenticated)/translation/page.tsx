'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Languages, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Loader2, 
  Globe,
  Sparkles
} from 'lucide-react';
import { translateText } from '@/services/gemini';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'Inglês', flag: '🇺🇸' },
  { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
  { code: 'fr', name: 'Francês', flag: '🇫🇷' },
  { code: 'de', name: 'Alemão', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japonês', flag: '🇯🇵' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

import { useAuth } from '@/components/AuthProvider';

export default function Translation() {
  const { user } = useAuth();
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState('pt');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');

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
      setSourceText(book.content || '');
    }
  };

  const handleTranslate = async () => {
    if (!sourceText) return;
    setIsLoading(true);
    try {
      const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
      const result = await translateText(sourceText, targetLangName);
      setTargetText(result || '');
      toast.success('Tradução concluída!');
    } catch (error) {
      toast.error('Erro ao traduzir.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copiado para a área de transferência!');
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tradução Inteligente</h1>
          <p className="text-gray-400">Traduza seus textos com contexto cultural e precisão literária.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl">
            <select 
              value={sourceLang}
              onChange={e => setSourceLang(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#0A0A0A]">{lang.flag} {lang.name}</option>
              ))}
            </select>
            <Globe className="w-5 h-5 text-gray-500" />
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl h-[400px] relative overflow-hidden">
            <textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="Digite ou cole o texto para traduzir..."
              className="w-full h-full bg-transparent text-white p-8 text-lg leading-relaxed focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
          <button 
            onClick={swapLanguages}
            className="w-12 h-12 bg-[#D4AF37] text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:rotate-180"
          >
            <ArrowRightLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl">
            <select 
              value={targetLang}
              onChange={e => setTargetLang(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-[#0A0A0A]">{lang.flag} {lang.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                disabled={!targetText}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl h-[400px] relative overflow-hidden group">
            <div className={cn(
              "w-full h-full p-8 text-lg leading-relaxed text-gray-300 overflow-y-auto",
              !targetText && "text-gray-600 italic"
            )}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                  <p className="text-sm uppercase tracking-widest text-[#D4AF37]">Traduzindo...</p>
                </div>
              ) : (
                targetText || "A tradução aparecerá aqui..."
              )}
            </div>
            {targetText && !isLoading && (
              <div className="absolute bottom-6 right-6">
                <div className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-xs rounded-full border border-[#D4AF37]/20 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  IA Otimizada
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-6">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !sourceText}
          className="flex items-center gap-3 bg-[#D4AF37] text-black px-12 py-5 rounded-2xl font-bold text-xl hover:bg-[#B8962E] transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Languages className="w-6 h-6" />}
          Traduzir Agora
        </button>
      </div>
    </div>
  );
}
