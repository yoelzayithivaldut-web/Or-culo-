'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  Loader2, 
  TrendingUp, 
  BookOpen, 
  ArrowRight,
  Save,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { getTrendingThemes, generateEbookOutline } from '@/services/gemini';
import { supabaseService } from '@/services/supabaseService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/AuthProvider';

export default function EbookCreator() {
  const { user } = useAuth();
  const router = useRouter();
  const [trendingThemes, setTrendingThemes] = useState('');
  const [isFetchingThemes, setIsFetchingThemes] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outline, setOutline] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    setIsFetchingThemes(true);
    try {
      const themes = await getTrendingThemes();
      setTrendingThemes(themes);
    } catch (error) {
      toast.error('Erro ao buscar temas em alta.');
    } finally {
      setIsFetchingThemes(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTheme) return toast.error('Selecione ou informe um tema');
    setIsGenerating(true);
    try {
      const result = await generateEbookOutline(selectedTheme);
      setOutline(result);
      toast.success('Estrutura do e-book gerada!');
    } catch (error) {
      toast.error('Erro ao gerar estrutura.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const bookData = {
        title: selectedTheme || 'E-book Estratégico',
        content: outline,
        genre: 'E-book / Não-Ficção',
        author: user.user_metadata?.full_name || 'Autor',
        user_id: user.id,
        status: 'writing',
        type: 'ebook'
      };

      const newBookId = await supabaseService.addDocument('books', bookData);
      toast.success('E-book salvo com sucesso!');
      router.push(`/editor/${newBookId}`);
    } catch (error) {
      toast.error('Erro ao salvar e-book.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar ao Painel
        </button>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Criador de E-books Estratégicos</h1>
          <p className="text-gray-400">Crie e-books de alto valor baseados em tendências atuais e temas sugeridos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-xl font-bold">Temas em Alta</h2>
                </div>
                <button 
                  onClick={fetchThemes}
                  disabled={isFetchingThemes}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingThemes ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isFetchingThemes ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Analisando a web por tendências...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-sm text-gray-400">
                  <pre className="whitespace-pre-wrap font-sans bg-black/30 p-4 rounded-xl border border-white/5">
                    {trendingThemes || 'Nenhum tema encontrado.'}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-xl font-bold">Gerar Estrutura</h2>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400">Tema do E-book</label>
                <textarea
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  placeholder="Ex: Guia de Investimentos para Iniciantes em 2026..."
                  className="w-full h-32 bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedTheme}
                className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold hover:bg-[#B8962E] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                Gerar Estrutura do E-book
              </button>
            </div>

            <AnimatePresence>
              {outline && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
                >
                  <h2 className="text-xl font-bold">Estrutura Gerada</h2>
                  <div className="prose prose-invert max-w-none text-sm text-gray-400">
                    <pre className="whitespace-pre-wrap font-sans bg-black/30 p-4 rounded-xl border border-white/5">
                      {outline}
                    </pre>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold hover:bg-[#B8962E] transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar e Abrir no Editor
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
