'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  Loader2, 
  BookOpen, 
  Image as ImageIcon,
  Wand2,
  ArrowRight,
  Save
} from 'lucide-react';
import { generateChildrensStory, generateBookCover } from '@/services/gemini';
import { supabaseService } from '@/services/supabaseService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/AuthProvider';

export default function ChildrensBookCreator() {
  const { user } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [ageGroup, setAgeGroup] = useState('3-5 anos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return toast.error('Informe o tema da história');
    setIsGenerating(true);
    try {
      const result = await generateChildrensStory(topic, ageGroup);
      setStory(result);
      toast.success('História e roteiro gerados!');
    } catch (error) {
      toast.error('Erro ao gerar história.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const bookData = {
        title: topic || 'Livro Infantil',
        content: story,
        genre: 'Infantil',
        author: user.user_metadata?.full_name || 'Autor',
        user_id: user.id,
        status: 'writing',
        type: 'children'
      };

      const newBookId = await supabaseService.addDocument('books', bookData);
      toast.success('Livro salvo com sucesso!');
      router.push(`/editor/${newBookId}`);
    } catch (error) {
      toast.error('Erro ao salvar livro.');
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
          <h1 className="text-4xl font-bold tracking-tight">Criador de Livros Infantis</h1>
          <p className="text-gray-400">Transforme ideias em histórias mágicas com ilustrações geradas por IA.</p>
        </div>

        {!story ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
          >
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-400">Sobre o que é a história?</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Um dragão que tinha medo de fogo e aprendeu a fazer sorvete..."
                className="w-full h-32 bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 resize-none"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-400">Faixa Etária</label>
              <div className="grid grid-cols-3 gap-4">
                {['0-3 anos', '3-5 anos', '6-9 anos'].map((group) => (
                  <button
                    key={group}
                    onClick={() => setAgeGroup(group)}
                    className={`py-3 rounded-xl font-bold transition-all border ${
                      ageGroup === group 
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic}
              className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold hover:bg-[#B8962E] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Gerar História e Roteiro
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Roteiro Gerado</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setStory(null)}
                    className="px-6 py-2 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    Recomeçar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-[#B8962E] transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar e Abrir no Editor
                  </button>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-300 bg-black/30 p-6 rounded-2xl border border-white/5">
                  {story}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
