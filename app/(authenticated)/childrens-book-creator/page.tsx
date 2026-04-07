'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  Loader2, 
  BookOpen, 
  Image as ImageIcon,
  Wand2,
  ArrowRight,
  Save,
  Upload,
  RefreshCw,
  Download,
  Lightbulb,
  Edit3,
  Maximize2,
  Minimize2,
  User,
  FileSignature,
  BookPlus,
  X,
  FileDown,
  Trash2,
  Book
} from 'lucide-react';
import { generateChildrensStory, generateBookCover, generateWritingAssistance, completeEditorialReview, humanizeText } from '@/services/gemini';
import { supabaseService } from '@/services/supabaseService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import Image from 'next/image';

import { useAuth } from '@/components/AuthProvider';

export default function ChildrensBookCreator() {
  const { user } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [ageGroup, setAgeGroup] = useState('3-5 anos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
    genre: 'Infantil',
    language: 'Português (Brasil)',
    synopsis: '',
    subtitle: '',
    illustrator: 'Ilustrações geradas por IA'
  });
  const [customPrompt, setCustomPrompt] = useState('');

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

  const handleAiAction = async (action: string, selectedText?: string) => {
    if (!story) return;
    setIsAiProcessing(true);
    setShowAiMenu(false);
    
    try {
      let result = '';
      
      switch (action) {
        case 'improve':
          result = await generateWritingAssistance(
            'Melhore esta história infantil para ser mais envolvente, adequada para a faixa etária e com linguagem mais rica:',
            typeof story === 'string' ? story : JSON.stringify(story)
          );
          setStory(result);
          toast.success('História melhorada!');
          break;
          
        case 'expand':
          result = await generateWritingAssistance(
            'Expanda esta história infantil adicionando mais detalhes, diálogos e descrições vividas:',
            typeof story === 'string' ? story : JSON.stringify(story)
          );
          setStory(result);
          toast.success('História expandida!');
          break;
          
        case 'summarize':
          result = await generateWritingAssistance(
            'Resuma esta história infantil mantendo os pontos principais e a magia:',
            typeof story === 'string' ? story : JSON.stringify(story)
          );
          setStory(result);
          toast.success('História resumida!');
          break;
          
        case 'humanize':
          result = await humanizeText(typeof story === 'string' ? story : JSON.stringify(story));
          setStory(result);
          toast.success('Texto humanizado!');
          break;
          
        case 'editorial':
          const title = bookMetadata.title || topic || 'Livro Infantil';
          result = await completeEditorialReview(typeof story === 'string' ? story : JSON.stringify(story), title);
          setStory(result);
          toast.success('Edição completa aplicada!');
          break;
          
        case 'ideas':
          result = await generateWritingAssistance(
            `Sugira 5 ideias criativas para expandir ou melhorar esta história infantil para ${ageGroup}:`,
            typeof story === 'string' ? story : JSON.stringify(story)
          );
          toast.success('Sugestões geradas!');
          alert('💡 SUGESTÕES PARA MELHORAR SUA HISTÓRIA:\n\n' + result);
          break;
          
        case 'character':
          result = await generateWritingAssistance(
            'Crie uma descrição detalhada dos personagens principais desta história infantil, incluindo aparências e personalidades:',
            typeof story === 'string' ? story : JSON.stringify(story)
          );
          toast.success('Personagens detalhados!');
          alert('🎭 PERSONAGENS:\n\n' + result);
          break;
          
        case 'custom':
          if (customPrompt) {
            result = await generateWritingAssistance(customPrompt, typeof story === 'string' ? story : JSON.stringify(story));
            setStory(result);
            toast.success('Prompt personalizado aplicado!');
            setCustomPrompt('');
          }
          break;
      }
    } catch (error) {
      toast.error('Erro ao processar com IA.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleGenerateImage = async (prompt: string, index?: number) => {
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateBookCover(prompt);
      
      if (index !== undefined && index < generatedImages.length) {
        const newImages = [...generatedImages];
        newImages[index] = imageUrl;
        setGeneratedImages(newImages);
      } else {
        setGeneratedImages([...generatedImages, imageUrl]);
      }
      
      toast.success('Imagem gerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar imagem.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!story) return;
    
    setIsGeneratingImage(true);
    try {
      const prompt = await generateWritingAssistance(
        `Crie um prompt detalhado para geração de imagem infantil colorida e mágica para ilustrar uma história sobre: ${topic}. Retorne apenas o prompt em uma linha.`,
        ''
      );
      
      if (prompt) {
        await handleGenerateImage(prompt);
      }
    } catch (error) {
      toast.error('Erro ao gerar prompt para imagens.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadKdpPdf = () => {
    if (!story) return;
    
    const pageWidthMm = 152.4;
    const pageHeightMm = 228.6;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm]
    });

    const title = bookMetadata.title || topic || 'Livro Infantil';
    const author = bookMetadata.author || 'Autor Desconhecido';
    const illustrator = bookMetadata.illustrator || 'IA';
    
    const marginInner = 12.7;
    const marginOuter = 6.35;
    const marginTop = 6.35;
    const marginBottom = 6.35;
    const lineHeight = 6;
    const fontSizeBody = 12;
    const fontSizeChapter = 18;
    const fontSizeSubChapter = 14;
    
    const getMargins = (pageNum: number) => ({
      left: pageNum % 2 === 0 ? marginInner : marginOuter,
      right: pageNum % 2 === 0 ? marginOuter : marginInner
    });

    doc.setFont('times', 'normal');
    
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.text(title.toUpperCase(), pageWidthMm / 2, pageHeightMm / 2 - 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    doc.text(`por ${author}`, pageWidthMm / 2, pageHeightMm / 2 + 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Ilustrado por ${illustrator}`, pageWidthMm / 2, pageHeightMm / 2 + 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text('1', pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });
    doc.addPage();
    
    let pageNum = 1;
    let currentY = marginTop;
    
    const storyText = typeof story === 'string' ? story : JSON.stringify(story, null, 2);
    const contentWidth = pageWidthMm - marginInner - marginOuter;
    const lines = doc.splitTextToSize(storyText, contentWidth);
    
    const addPage = () => {
      doc.addPage();
      pageNum++;
      currentY = marginTop;
      doc.setFontSize(9);
      doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });
      currentY = marginTop;
    };
    
    lines.forEach((line: string) => {
      if (line.trim().match(/^#{1,3}\s/) || line.trim().match(/^(CAP[ií]TULO|Chapter)/i)) {
        doc.setFontSize(fontSizeChapter);
        doc.setFont('times', 'bold');
        currentY += lineHeight * 2;
      } else if (line.trim().match(/^\d+[.\)]\s/) && line.trim().length < 40) {
        doc.setFontSize(fontSizeSubChapter);
        doc.setFont('times', 'bold');
        currentY += lineHeight * 1.5;
      } else {
        doc.setFontSize(fontSizeBody);
        doc.setFont('times', 'normal');
        currentY += lineHeight;
      }
      
      if (currentY + lineHeight > pageHeightMm - marginBottom) {
        addPage();
      }
      
      doc.text(line, marginInner, currentY);
    });
    
    doc.setFontSize(9);
    doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });

    doc.save(`${title.replace(/\s+/g, '_')}_Infantil_KDP.pdf`);
    toast.success('PDF infantil formatado para KDP exportado com sucesso!');
  };

  const handleNewProject = () => {
    setTopic('');
    setStory(null);
    setGeneratedImages([]);
    setImagePrompts([]);
    setCurrentChapter(0);
    setBookMetadata({
      title: '',
      author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
      genre: 'Infantil',
      language: 'Português (Brasil)',
      synopsis: '',
      subtitle: '',
      illustrator: 'Ilustrações geradas por IA'
    });
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Roteiro Gerado</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleNewProject}
                  className="p-3 bg-white/5 text-gray-400 rounded-xl hover:text-red-500 transition-all"
                  title="Novo Projeto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowMetadataModal(true)}
                  className="p-3 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-all"
                  title="Editar Metadados"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownloadKdpPdf}
                  className="p-3 bg-white/5 text-green-400 rounded-xl hover:text-green-300 transition-all"
                  title="Exportar KDP"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowAiMenu(true)}
                  className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-[#B8962E] transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  IA Editor
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#D4AF37]" />
                    Gerador de Ilustrações
                  </h3>
                  <button
                    onClick={handleGenerateAllImages}
                    disabled={isGeneratingImage}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl font-bold text-sm hover:bg-purple-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Gerar Imagem
                  </button>
                </div>
                
                <div className="space-y-4">
                  {generatedImages.length > 0 ? (
                    <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                      <Image 
                        src={generatedImages[selectedImageIndex]}
                        alt="Ilustração gerada"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = generatedImages[selectedImageIndex];
                            link.download = 'ilustracao.png';
                            link.click();
                          }}
                          className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      {generatedImages.length > 1 && (
                        <div className="absolute bottom-4 left-4 flex gap-1">
                          {generatedImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                idx === selectedImageIndex ? "bg-[#D4AF37]" : "bg-white/40"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[3/4] rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Clique em &quot;Gerar Imagem&quot; para criar ilustrações</p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ou digite um prompt personalizado..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 text-sm"
                  />
                  <button
                    onClick={() => customPrompt && handleGenerateImage(customPrompt)}
                    disabled={isGeneratingImage || !customPrompt}
                    className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Gerar com Prompt
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Book className="w-5 h-5 text-[#D4AF37]" />
                  História Gerada
                </h3>
                <div className="prose prose-invert max-w-none max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-gray-300 bg-black/30 p-4 rounded-2xl border border-white/5 text-sm leading-relaxed">
                    {story}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Palavras: {typeof story === 'string' ? story.split(/\s+/).length : 'N/A'}</span>
              <span>Faixa etária: {ageGroup}</span>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showAiMenu && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiMenu(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-xl relative z-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center">
                  <Sparkles className="text-black w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Assistente IA</h2>
                  <p className="text-gray-400 text-sm">Ferramentas para melhorar sua história infantil</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAiAction('improve')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Wand2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Melhorar Texto</h4>
                  <p className="text-gray-500 text-xs">Corrige gramática e estilo</p>
                </button>

                <button 
                  onClick={() => handleAiAction('expand')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Maximize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Expandir História</h4>
                  <p className="text-gray-500 text-xs">Adiciona mais detalhes</p>
                </button>

                <button 
                  onClick={() => handleAiAction('summarize')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Minimize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Resumir</h4>
                  <p className="text-gray-500 text-xs">Versão mais concisa</p>
                </button>

                <button 
                  onClick={() => handleAiAction('ideas')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Lightbulb className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Ideias Criativas</h4>
                  <p className="text-gray-500 text-xs">Sugestões para melhorar</p>
                </button>

                <button 
                  onClick={() => handleAiAction('character')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <User className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Personagens</h4>
                  <p className="text-gray-500 text-xs">Descrições detalhadas</p>
                </button>

                <button 
                  onClick={() => handleAiAction('humanize')}
                  disabled={isAiProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Sparkles className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Humanizar</h4>
                  <p className="text-gray-500 text-xs">Remove padrões de IA</p>
                </button>

                <button 
                  onClick={() => handleAiAction('editorial')}
                  disabled={isAiProcessing}
                  className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group col-span-2 disabled:opacity-50"
                >
                  <BookOpen className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-[#D4AF37] font-bold">Edição Completa</h4>
                  <p className="text-gray-400 text-xs">Revisão editorial profissional</p>
                </button>

                <div className="col-span-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Digite um comando personalizado..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 mb-3"
                  />
                  <button 
                    onClick={() => handleAiAction('custom')}
                    disabled={isAiProcessing || !customPrompt}
                    className="w-full py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-[#B8962E] transition-all disabled:opacity-50"
                  >
                    Executar Prompt Personalizado
                  </button>
                </div>
              </div>

              {isAiProcessing && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[#D4AF37]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-bold">Processando com IA...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMetadataModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMetadataModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-lg relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center">
                    <FileSignature className="text-black w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Metadados do Livro</h2>
                    <p className="text-gray-400 text-xs">Configure as informações do livro</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMetadataModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Título</label>
                  <input
                    type="text"
                    value={bookMetadata.title}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, title: e.target.value })}
                    placeholder="Título do livro..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Autor</label>
                  <input
                    type="text"
                    value={bookMetadata.author}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, author: e.target.value })}
                    placeholder="Nome do autor..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Ilustrador</label>
                  <input
                    type="text"
                    value={bookMetadata.illustrator}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, illustrator: e.target.value })}
                    placeholder="Nome do ilustrador..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Sinopse</label>
                  <textarea
                    value={bookMetadata.synopsis}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, synopsis: e.target.value })}
                    placeholder="Descrição do livro..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="flex-1 py-3 text-gray-400 hover:text-white font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowMetadataModal(false);
                    toast.success('Metadados salvos!');
                  }}
                  className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl font-bold hover:bg-[#B8962E] transition-all"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
