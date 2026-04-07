'use client';

import React, { useState, useEffect, useRef, use, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  Sparkles, 
  Wand2, 
  Type, 
  History, 
  Settings, 
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  BookCheck,
  Image as ImageIcon,
  RefreshCw,
  Upload,
  X,
  ExternalLink,
  FileDown,
  FileText,
  UserCircle,
  PenTool,
  ArrowRight,
  FileCheck,
  ClipboardCheck,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { 
  generateWritingAssistance, 
  completeEditorialReview, 
  generateBookCover, 
  suggestCoverPrompt, 
  editBookCover,
  generateManuscript,
  generateBackCoverText,
  humanizeText,
  mimicWriterStyle
} from '@/services/gemini';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  validateKdpContent, 
  generateKdpPdf, 
  generateKdpComplianceReport,
  KDP_STANDARDS
} from '@/services/kdpFormat';

export default function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [generatedCover, setGeneratedCover] = useState<string | null>(null);
  const [generatedBackCover, setGeneratedBackCover] = useState<string | null>(null);
  const [backCoverText, setBackCoverText] = useState('');
  const [activeCoverTab, setActiveCoverTab] = useState<'front' | 'back'>('front');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageMimeType, setUploadedImageMimeType] = useState<string>('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [writerStyle, setWriterStyle] = useState('');
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [lastIllustration, setLastIllustration] = useState<string | null>(null);
  const [showIllustrationModal, setShowIllustrationModal] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceReport, setComplianceReport] = useState<string>('');
  const [kdpValidation, setKdpValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedPageSize, setSelectedPageSize] = useState<'6x9' | '5x8' | '5.5x8.5'>('6x9');
  const [dedication, setDedication] = useState('');
  const [includeDedication, setIncludeDedication] = useState(false);
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      if (id) {
        try {
          const data: any = await supabaseService.getDocument('books', id);
          if (data) {
            setBook(data);
            setContent(data.content || '');
            setLastSavedContent(data.content || '');
            setGeneratedCover(data.cover_url || null);
            setGeneratedBackCover(data.back_cover_url || null);
            setBackCoverText(data.back_cover_text || '');
          } else {
            toast.error('Livro não encontrado.');
            router.push('/books');
          }
        } catch (error) {
          console.error('Error loading book:', error);
          router.push('/books');
        }
      }
    };

    fetchBook();
  }, [id, router]);

  const handleSave = useCallback(async (silent = false) => {
    if (!user) {
      if (!silent) toast.error('Você precisa estar logado para salvar.');
      return;
    }
    
    if (silent && content === lastSavedContent) return;
    if (!silent) setIsSaving(true);
    
    try {
      if (id) {
        await supabaseService.updateDocument('books', id, { 
          content: content,
          updated_at: new Date().toISOString()
        });
        setLastSavedContent(content);
        setLastSavedTime(new Date());
        if (!silent) toast.success('Alterações salvas com sucesso!');
      } else {
        const newId = await supabaseService.addDocument('books', {
          title: 'Novo Livro',
          content: content,
          user_id: user.id,
          status: 'writing',
          language: 'pt-BR',
          genre: 'Não Definido',
          author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido'
        });
        setLastSavedContent(content);
        setLastSavedTime(new Date());
        if (!silent) toast.success('Livro criado e salvo!');
        router.push(`/editor/${newId}`);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      if (!silent) toast.error('Erro ao salvar as alterações. Verifique sua conexão.');
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, [user, content, lastSavedContent, id, router]);

  useEffect(() => {
    if (!user) return;
    if (id && !book) return;

    const timer = setTimeout(() => {
      if (content !== lastSavedContent && content.length > 0) {
        handleSave(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [content, id, book, lastSavedContent, user, handleSave]);

  const handleAiAction = async (action: string) => {
    if (action === 'cover') {
      setShowAiMenu(false);
      setShowCoverModal(true);
      return;
    }
    setIsAiLoading(true);
    setShowAiMenu(false);
    try {
      let prompt = '';
      const selectedText = editorRef.current?.value.substring(
        editorRef.current.selectionStart,
        editorRef.current.selectionEnd
      );

      switch (action) {
        case 'expand':
          prompt = `Expanda o seguinte texto mantendo o tom e estilo:\n\n${selectedText || content}`;
          break;
        case 'improve':
          prompt = `Melhore a gramática, estilo e fluidez do seguinte texto:\n\n${selectedText || content}`;
          break;
        case 'summarize':
          prompt = `Resuma o seguinte conteúdo em um parágrafo conciso:\n\n${selectedText || content}`;
          break;
        case 'suggest':
          prompt = `Sugira o que deve acontecer a seguir na narrativa baseada neste contexto:\n\n${content}`;
          break;
        case 'editorial':
          const editorialResult = await completeEditorialReview(content, book?.title || 'Sem Título');
          if (editorialResult) {
            setContent(editorialResult);
            toast.success('Edição Completa concluída!');
          }
          setIsAiLoading(false);
          return;
        case 'manuscript':
          const manuscriptResult = await generateManuscript(content, book?.title || 'Sem Título', book?.author || 'Autor Desconhecido');
          if (manuscriptResult) {
            setContent(manuscriptResult);
            toast.success('Manuscrito Profissional criado!');
          }
          setIsAiLoading(false);
          return;
        case 'pagenumbers':
          const pagenumResult = await generateWritingAssistance("Formate o texto a seguir inserindo marcadores de página simulados (ex: [Página 1], [Página 2]) de forma lógica nos quebras de capítulo ou seções longas.", content);
          if (pagenumResult) {
            setContent(pagenumResult);
            toast.success('Números de página simulados inseridos!');
          }
          setIsAiLoading(false);
          return;
        case 'backcovertext':
          const backText = await generateBackCoverText(book?.title || 'Sem Título', book?.synopsis || content.substring(0, 1000));
          if (backText) {
            setBackCoverText(backText);
            toast.success('Texto da contracapa gerado!');
            setShowCoverModal(true);
            setActiveCoverTab('back');
          }
          setIsAiLoading(false);
          return;
        case 'humanize':
          const humanized = await humanizeText(selectedText || content);
          if (humanized) {
            if (selectedText) {
              setContent(content.replace(selectedText, humanized));
            } else {
              setContent(humanized);
            }
            toast.success('Texto humanizado com sucesso!');
          }
          setIsAiLoading(false);
          return;
        case 'mimic':
          setShowStyleModal(true);
          setIsAiLoading(false);
          return;
        case 'generateillustration':
          if (!selectedText) {
            toast.error('Selecione o prompt da ilustração no texto primeiro.');
            setIsAiLoading(false);
            return;
          }
          const illustration = await generateBookCover(selectedText);
          if (illustration) {
            setLastIllustration(illustration);
            setShowIllustrationModal(true);
            toast.success('Ilustração gerada com sucesso!');
          }
          setIsAiLoading(false);
          return;
        case 'custom':
          prompt = `${aiPrompt}:\n\n${selectedText || content}`;
          break;
      }

      const result = await generateWritingAssistance(prompt, content);
      if (result) {
        if (selectedText) {
          const newContent = content.replace(selectedText, result);
          setContent(newContent);
        } else {
          setContent(prev => prev + '\n\n' + result);
        }
        toast.success('IA processou com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao processar IA.');
    } finally {
      setIsAiLoading(false);
      setAiPrompt('');
    }
  };

  const handleSuggestCoverPrompt = async () => {
    setIsGeneratingCover(true);
    try {
      const suggestion = await suggestCoverPrompt(book?.title || 'Sem Título', content);
      setCoverPrompt(suggestion);
      toast.success('Sugestão de capa gerada!');
    } catch (error) {
      toast.error('Erro ao sugerir capa.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!coverPrompt) return;
    setIsGeneratingCover(true);
    try {
      let imageUrl;
      if (uploadedImage) {
        imageUrl = await editBookCover(coverPrompt, uploadedImage, uploadedImageMimeType);
      } else {
        imageUrl = await generateBookCover(coverPrompt);
      }
      setGeneratedCover(imageUrl);
      toast.success(uploadedImage ? 'Capa editada com sucesso!' : 'Capa gerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar/editar capa.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 4MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedImageMimeType(file.type);
        toast.success('Imagem carregada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMimicStyle = async () => {
    if (!writerStyle) return toast.error('Informe o estilo ou autor');
    setIsAiLoading(true);
    setShowStyleModal(false);
    try {
      const selectedText = editorRef.current?.value.substring(
        editorRef.current.selectionStart,
        editorRef.current.selectionEnd
      );
      const result = await mimicWriterStyle(selectedText || content, writerStyle);
      if (result) {
        if (selectedText) {
          setContent(content.replace(selectedText, result));
        } else {
          setContent(result);
        }
        toast.success(`Estilo de ${writerStyle} aplicado!`);
      }
    } catch (error) {
      toast.error('Erro ao mimetizar estilo.');
    } finally {
      setIsAiLoading(false);
      setWriterStyle('');
    }
  };

  const handleSaveCover = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updates: any = {};
      if (activeCoverTab === 'front' && generatedCover) {
        updates.cover_url = generatedCover;
      } else if (activeCoverTab === 'back') {
        if (generatedBackCover) updates.back_cover_url = generatedBackCover;
        if (backCoverText) updates.back_cover_text = backCoverText;
      }
      
      await supabaseService.updateDocument('books', id, updates);
      setBook({ ...book, ...updates });
      toast.success(activeCoverTab === 'front' ? 'Capa salva!' : 'Contracapa salva!');
      setShowCoverModal(false);
    } catch (error) {
      toast.error('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const title = book?.title || 'Obra Sem Título';
    const author = book?.author || 'Autor Desconhecido';
    
    doc.setFontSize(24);
    doc.text(title, 105, 100, { align: 'center' });
    doc.setFontSize(16);
    doc.text(author, 105, 120, { align: 'center' });
    
    doc.addPage();
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(content, 180);
    let y = 20;
    let pageNum = 1;

    const addPageNumber = (num: number) => {
      doc.setFontSize(10);
      doc.text(`Página ${num}`, 105, 285, { align: 'center' });
      doc.setFontSize(12);
    };

    addPageNumber(pageNum);
    
    splitText.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        pageNum++;
        addPageNumber(pageNum);
        y = 20;
      }
      doc.text(line, 15, y);
      y += 7;
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const handleDownloadManuscriptPdf = () => {
    const doc = new jsPDF();
    const title = book?.title || 'Obra Sem Título';
    const author = book?.author || 'Autor Desconhecido';
    const email = user?.email || 'contato@autor.com';
    const wordCount = content.split(/\s+/).filter(x => x).length;

    const margin = 25.4;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (margin * 2);
    
    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    doc.text(author, margin, margin);
    doc.text(email, margin, margin + 7);
    doc.text(`Aprox. ${wordCount} palavras`, pageWidth - margin, margin, { align: 'right' });
    doc.setFontSize(24);
    doc.text(title.toUpperCase(), pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`por ${author}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
    
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('courier', 'normal');

    const addHeader = (pageNum: number) => {
      doc.setFontSize(10);
      doc.text(`${author} / ${title.toUpperCase()} / ${pageNum}`, pageWidth - margin, 15, { align: 'right' });
      doc.setFontSize(12);
    };

    let pageNum = 1;
    addHeader(pageNum);

    const lines = doc.splitTextToSize(content, contentWidth);
    let y = 30;
    const lineHeight = 10;

    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        pageNum++;
        addHeader(pageNum);
        y = 30;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`${title.replace(/\s+/g, '_')}_Manuscrito_Profissional.pdf`);
    toast.success('Manuscrito profissional exportado com sucesso!');
  };

  const handleValidateKdp = async () => {
    if (!content || content.trim().length === 0) {
      toast.error('Nenhum conteúdo para validar.');
      return;
    }

    setIsValidating(true);
    try {
      const validation = validateKdpContent(content, {
        pageSize: selectedPageSize,
        coverImage: !!generatedCover,
        hasFrontMatter: true
      });
      
      setKdpValidation(validation);
      const report = generateKdpComplianceReport(validation, {
        title: book?.title || 'Obra Sem Título',
        author: book?.author || 'Autor Desconhecido'
      });
      setComplianceReport(report);
      setShowComplianceModal(true);
      
      if (validation.passed) {
        toast.success('Validação passou! Seu livro está pronto para publicação no KDP.');
      } else {
        toast.error('Validação falhou. Corrija os erros abaixo.');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar conteúdo.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadKdpPdf = () => {
    if (!content || content.trim().length === 0) {
      toast.error('Nenhum conteúdo para exportar.');
      return;
    }

    try {
      const doc = generateKdpPdf(content, {
        title: book?.title || 'Obra Sem Título',
        author: book?.author || 'Autor Desconhecido',
        subtitle: book?.subtitle,
        pageSize: selectedPageSize,
        includeDedication: includeDedication ? dedication : undefined,
        includeCopyright,
        includeToc,
        includeBlankPages: true,
        backCoverText: backCoverText || undefined,
        publisher: 'Independente'
      });
      
      doc.save(`${(book?.title || 'Obra').replace(/\s+/g, '_')}_KDP_Completo.pdf`);
      toast.success('PDF padrão KDP exportado com sucesso!');
    } catch (error) {
      console.error('KDP PDF export error:', error);
      toast.error('Erro ao exportar PDF KDP.');
    }
  };

  const handleExportComplianceReport = () => {
    if (!complianceReport) {
      toast.error('Gere o relatório primeiro.');
      return;
    }
    
    const blob = new Blob([complianceReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(book?.title || 'Obra').replace(/\s+/g, '_')}_Relatorio_KDP.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório baixado!');
  };

  if (!book && id) return null;

  return (
    <div className={cn(
      "flex flex-col h-full space-y-6",
      isFullscreen && "fixed inset-0 z-[200] bg-[#050505] p-10"
    )}>
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/books')}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {book?.title || 'Novo Documento'}
              <span className="text-xs font-normal px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-md uppercase tracking-widest">
                {book?.status || 'Rascunho'}
              </span>
            </h1>
            <p className="text-gray-500 text-sm">
              Última edição: {lastSavedTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={handleDownloadPdf}
            className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-[#D4AF37] transition-all"
            title="Baixar PDF"
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all",
              content === lastSavedContent 
                ? "bg-white/5 text-gray-500 cursor-default" 
                : "bg-[#D4AF37] text-black hover:bg-[#B8962E] shadow-lg shadow-[#D4AF37]/20"
            )}
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Salvando...' : (content === lastSavedContent ? 'Salvo' : 'Salvar Agora')}
          </button>
          <button 
            onClick={() => setShowAiMenu(true)}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
          >
            <Sparkles className="w-5 h-5" />
            Editor Inteligente
          </button>
          <a 
            href="https://kdp.amazon.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold transition-all border border-white/10"
          >
            <ExternalLink className="w-5 h-5 text-[#D4AF37]" />
            Publicar na Amazon
          </a>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        <div className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><Type className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 font-bold">B</button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 italic">I</button>
            </div>
            <button 
              onClick={() => handleAiAction('editorial')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-bold transition-all border border-[#D4AF37]/20"
              title="Edição Editorial Completa (Padrão Amazon KDP)"
            >
              <BookCheck className="w-4 h-4" />
              Edição Editorial Completa
            </button>
            <div className="text-xs text-gray-500 font-mono">
              {content.split(/\s+/).filter(x => x).length} palavras • {content.length} caracteres
            </div>
          </div>
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comece a escrever sua obra prima..."
            className="flex-1 w-full bg-transparent text-gray-200 p-10 text-lg leading-relaxed focus:outline-none resize-none font-serif"
          />
        </div>

        {!isFullscreen && (
          <aside className="w-80 space-y-6 hidden xl:block">
            <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-[#D4AF37]" />
                Histórico
              </h3>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 group cursor-pointer">
                    <div className="w-1 h-10 bg-white/5 group-hover:bg-[#D4AF37] rounded-full transition-all" />
                    <div>
                      <p className="text-white text-sm font-medium">Versão {3-i}.0</p>
                      <p className="text-gray-500 text-xs">Há {i * 15} minutos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#D4AF37]" />
                Configurações
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase tracking-widest">Gênero</label>
                  <p className="text-white text-sm">{book?.genre || 'Não definido'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase tracking-widest">Idioma</label>
                  <p className="text-white text-sm">Português (Brasil)</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* AI Menu Modal - Dashboard Horizontal */}
      <AnimatePresence>
        {showAiMenu && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiMenu(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 p-0 rounded-3xl w-full max-w-7xl relative z-10 max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-gradient-to-r from-[#0A0A0A] to-[#0F0F0F]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8962E] rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                    <Sparkles className="text-black w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Painel Inteligente Oráculo</h2>
                    <p className="text-gray-400 text-sm">Assistente editorial profissional</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-gray-400 text-xs">Dashboard</span>
                    <span className="text-white text-sm font-bold ml-2">CRM Editorial</span>
                  </div>
                  <button 
                    onClick={() => setShowAiMenu(false)}
                    className="p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-4 gap-6">
                  {/* Row 1: Ferramentas de Escrita (Dourado) */}
                  <div className="col-span-1 space-y-3">
                    <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-2 flex items-center gap-2 px-1">
                      <Wand2 className="w-3 h-3" /> Ferramentas de Escrita
                    </h3>
                    <button onClick={() => handleAiAction('improve')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:from-[#D4AF37]/10 hover:to-[#D4AF37]/5 transition-all group">
                      <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/20 transition-all"><Wand2 className="w-5 h-5 text-[#D4AF37]" /></div>
                      <h4 className="text-white font-bold">Melhorar Escrita</h4>
                      <p className="text-gray-500 text-xs">Gramática e estilo</p>
                    </button>
                    <button onClick={() => handleAiAction('expand')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:from-[#D4AF37]/10 hover:to-[#D4AF37]/5 transition-all group">
                      <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/20 transition-all"><Maximize2 className="w-5 h-5 text-[#D4AF37]" /></div>
                      <h4 className="text-white font-bold">Expandir Texto</h4>
                      <p className="text-gray-500 text-xs">Mais detalhes</p>
                    </button>
                    <button onClick={() => handleAiAction('summarize')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:from-[#D4AF37]/10 hover:to-[#D4AF37]/5 transition-all group">
                      <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/20 transition-all"><Minimize2 className="w-5 h-5 text-[#D4AF37]" /></div>
                      <h4 className="text-white font-bold">Resumir</h4>
                      <p className="text-gray-500 text-xs">Versão concisa</p>
                    </button>
                  </div>

                  {/* Row 2: Criatividade IA (Roxo) */}
                  <div className="col-span-1 space-y-3">
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2 px-1">
                      <Sparkles className="w-3 h-3" /> Criatividade IA
                    </h3>
                    <button onClick={() => handleAiAction('suggest')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-purple-500/50 hover:from-purple-500/10 hover:to-purple-500/5 transition-all group">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all"><Sparkles className="w-5 h-5 text-purple-400" /></div>
                      <h4 className="text-white font-bold">Sugerir Próximo Passo</h4>
                      <p className="text-gray-500 text-xs">Próximos passos da narrativa</p>
                    </button>
                    <button onClick={() => handleAiAction('humanize')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-purple-500/50 hover:from-purple-500/10 hover:to-purple-500/5 transition-all group">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all"><UserCircle className="w-5 h-5 text-purple-400" /></div>
                      <h4 className="text-white font-bold">Humanizar Texto</h4>
                      <p className="text-gray-500 text-xs">Texto natural</p>
                    </button>
                    <button onClick={() => handleAiAction('mimic')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-purple-500/50 hover:from-purple-500/10 hover:to-purple-500/5 transition-all group">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all"><PenTool className="w-5 h-5 text-purple-400" /></div>
                      <h4 className="text-white font-bold">Mimetizar Estilo</h4>
                      <p className="text-gray-500 text-xs">Estilo de autor</p>
                    </button>
                  </div>

                  {/* Row 3: Publicação (Azul) */}
                  <div className="col-span-1 space-y-3">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2 px-1">
                      <ImageIcon className="w-3 h-3" /> Publicação
                    </h3>
                    <button onClick={() => handleAiAction('cover')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-blue-500/50 hover:from-blue-500/10 hover:to-blue-500/5 transition-all group">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-all"><ImageIcon className="w-5 h-5 text-blue-400" /></div>
                      <h4 className="text-white font-bold">Capa e Contracapa</h4>
                      <p className="text-gray-500 text-xs">Gerar capa</p>
                    </button>
                    <button onClick={() => handleAiAction('backcovertext')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-blue-500/50 hover:from-blue-500/10 hover:to-blue-500/5 transition-all group">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-all"><FileText className="w-5 h-5 text-blue-400" /></div>
                      <h4 className="text-white font-bold">Texto da Contracapa</h4>
                      <p className="text-gray-500 text-xs">Blurb e bio</p>
                    </button>
                    <button onClick={() => handleAiAction('pagenumbers')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-blue-500/50 hover:from-blue-500/10 hover:to-blue-500/5 transition-all group">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-all"><History className="w-5 h-5 text-blue-400" /></div>
                      <h4 className="text-white font-bold">Números de Página</h4>
                      <p className="text-gray-500 text-xs">Organizar páginas</p>
                    </button>
                  </div>

                  {/* Row 4: Profissional (Verde) */}
                  <div className="col-span-1 space-y-3">
                    <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2 px-1">
                      <BookCheck className="w-3 h-3" /> Profissional
                    </h3>
                    <button onClick={() => handleAiAction('editorial')} className="w-full p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-2xl text-left hover:border-green-500 hover:from-green-500/20 hover:to-green-500/10 transition-all group">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-500/30 transition-all"><BookCheck className="w-5 h-5 text-green-400" /></div>
                      <h4 className="text-green-400 font-bold">Edição Completa (Padrão Amazon)</h4>
                      <p className="text-gray-500 text-xs">Revisão total + índice</p>
                    </button>
                    <button onClick={() => handleAiAction('manuscript')} className="w-full p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-2xl text-left hover:border-green-500 hover:from-green-500/20 hover:to-green-500/10 transition-all group">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-500/30 transition-all"><FileText className="w-5 h-5 text-green-400" /></div>
                      <h4 className="text-green-400 font-bold">Formatar Manuscrito (IA)</h4>
                      <p className="text-gray-500 text-xs">Padrões profissionais</p>
                    </button>
                    <button onClick={() => handleAiAction('generateillustration')} className="w-full p-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl text-left hover:border-purple-500/50 hover:from-purple-500/10 hover:to-purple-500/5 transition-all group">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all"><ImageIcon className="w-5 h-5 text-purple-400" /></div>
                      <h4 className="text-white font-bold">Gerar Ilustração</h4>
                      <p className="text-gray-500 text-xs">Imagens para o livro</p>
                    </button>
                  </div>

                  {/* Row 5: Exportação KDP (Verde Escuro) - Full Width */}
                  <div className="col-span-4 mt-2">
                    <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                      <FileDown className="w-3 h-3" /> Exportação & Publicação KDP
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      <button onClick={handleDownloadKdpPdf} className="p-6 bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/30 rounded-2xl text-center hover:border-green-500 hover:from-green-500/25 hover:to-green-500/10 transition-all group">
                        <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-all"><FileDown className="w-7 h-7 text-green-400" /></div>
                        <h4 className="text-green-400 font-bold text-lg">Exportar para KDP (PDF)</h4>
                        <p className="text-gray-500 text-xs mt-1">PDF 6&quot;x9&quot; margens KDP</p>
                      </button>
                      <button onClick={handleValidateKdp} disabled={isValidating || !content} className="p-6 bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/30 rounded-2xl text-center hover:border-blue-500 hover:from-blue-500/25 hover:to-blue-500/10 transition-all group disabled:opacity-50">
                        <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-all">{isValidating ? <Loader2 className="w-7 h-7 text-blue-400 animate-spin" /> : <CheckCircle2 className="w-7 h-7 text-blue-400" />}</div>
                        <h4 className="text-blue-400 font-bold text-lg">Validar Conformidade KDP</h4>
                        <p className="text-gray-500 text-xs mt-1">Verificar conformidade Amazon</p>
                      </button>
                      <button onClick={handleDownloadManuscriptPdf} className="p-6 bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl text-center hover:border-[#D4AF37] hover:from-[#D4AF37]/25 hover:to-[#D4AF37]/10 transition-all group">
                        <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D4AF37]/30 transition-all"><FileText className="w-7 h-7 text-[#D4AF37]" /></div>
                        <h4 className="text-[#D4AF37] font-bold text-lg">Exportar Manuscrito (PDF)</h4>
                        <p className="text-gray-500 text-xs mt-1">PDF formatado profissional</p>
                      </button>
                      <div className="p-6 bg-gradient-to-r from-[#D4AF37]/10 to-green-500/10 border border-[#D4AF37]/20 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mb-4"><Sparkles className="w-7 h-7 text-[#D4AF37]" /></div>
                        <h4 className="text-white font-bold text-lg mb-1">Publicar na Amazon</h4>
                        <p className="text-gray-500 text-xs mb-4">Sua obra está pronta para o KDP</p>
                        <a href="https://kdp.amazon.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#B8962E] transition-all">Ir para KDP <ExternalLink className="w-4 h-4" /></a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              {isAiLoading && (
                <div className="px-8 py-4 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                  <span className="text-gray-400">Processando sua solicitação...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cover Modal */}
      <AnimatePresence>
        {showCoverModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCoverModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-[40px] w-full max-w-4xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center">
                    <ImageIcon className="text-black w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Design de Capa Profissional</h2>
                    <p className="text-gray-400 text-sm">Gere capas e contracapas otimizadas para o mercado.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCoverModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
                <button 
                  onClick={() => setActiveCoverTab('front')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    activeCoverTab === 'front' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  Capa (Frontal)
                </button>
                <button 
                  onClick={() => setActiveCoverTab('back')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                    activeCoverTab === 'back' ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  Contracapa (Traseira)
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-6">
                  {activeCoverTab === 'front' ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-400 uppercase tracking-widest font-bold">Prompt da Capa</label>
                          <button 
                            onClick={handleSuggestCoverPrompt}
                            disabled={isGeneratingCover}
                            className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-bold"
                          >
                            <Sparkles size={12} /> Sugerir Prompt
                          </button>
                        </div>
                        <textarea
                          value={coverPrompt}
                          onChange={e => setCoverPrompt(e.target.value)}
                          placeholder="Descreva o estilo, elementos e cores da capa..."
                          className="w-full h-32 bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 resize-none text-sm"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm text-gray-400 uppercase tracking-widest font-bold">Referência Visual (Opcional)</label>
                        <div className="flex gap-4">
                          <label className="flex-1 cursor-pointer group">
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            <div className="h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-[#D4AF37]/50 transition-all bg-white/5">
                              <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#D4AF37]" />
                              <span className="text-xs text-gray-500 group-hover:text-white">Upload de Imagem</span>
                            </div>
                          </label>
                          {uploadedImage && (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden relative group">
                              <Image 
                                src={uploadedImage} 
                                alt="Referência visual" 
                                fill
                                className="object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                              <button 
                                onClick={() => setUploadedImage(null)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                              >
                                <X className="text-white" size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <label className="text-sm text-gray-400 uppercase tracking-widest font-bold">Texto da Contracapa (Blurb)</label>
                      <textarea
                        value={backCoverText}
                        onChange={e => setBackCoverText(e.target.value)}
                        placeholder="Escreva o texto que convencerá o leitor a comprar seu livro..."
                        className="w-full h-64 bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 resize-none text-sm leading-relaxed"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleGenerateCover}
                    disabled={isGeneratingCover || (activeCoverTab === 'front' && !coverPrompt)}
                    className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingCover ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                    {isGeneratingCover ? 'Gerando Arte...' : (uploadedImage ? 'Editar com IA' : 'Gerar Arte com IA')}
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center bg-black/40 rounded-[32px] border border-white/5 p-8 min-h-[400px]">
                  {activeCoverTab === 'front' ? (
                    generatedCover ? (
                      <div className="space-y-6 w-full">
                        <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
                          <Image 
                            src={generatedCover} 
                            alt="Capa gerada" 
                            fill
                            className="object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all gap-4">
                            <a href={generatedCover} download="capa.png" className="p-3 bg-white text-black rounded-xl hover:scale-110 transition-all">
                              <FileDown size={20} />
                            </a>
                          </div>
                        </div>
                        <button 
                          onClick={handleSaveCover}
                          className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={20} /> Usar esta Capa
                        </button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-gray-600 mx-auto">
                          <ImageIcon size={40} />
                        </div>
                        <p className="text-gray-500 text-sm max-w-[200px]">Sua capa aparecerá aqui após a geração.</p>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 bg-white/5 rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
                        <h3 className="text-white font-serif text-xl mb-4 text-center italic">{book?.title}</h3>
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-white/10 rounded-full" />
                          <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                          <div className="h-2 w-full bg-white/10 rounded-full" />
                        </div>
                        <div className="mt-8 text-gray-400 text-xs leading-relaxed text-center italic">
                          {backCoverText || "O texto da contracapa aparecerá aqui..."}
                        </div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                          <div className="w-16 h-10 bg-white/10 rounded flex items-center justify-center">
                            <div className="w-10 h-6 bg-white/20 rounded-sm" />
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleSaveCover}
                        disabled={!backCoverText}
                        className="w-full mt-6 bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 size={20} /> Salvar Contracapa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Style Mimic Modal */}
      <AnimatePresence>
        {showStyleModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStyleModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-md relative z-10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Mimetizar Estilo</h2>
              <div className="space-y-4">
                <label className="text-sm text-gray-400 uppercase tracking-widest font-bold">Qual autor ou estilo deseja copiar?</label>
                <input
                  autoFocus
                  type="text"
                  value={writerStyle}
                  onChange={e => setWriterStyle(e.target.value)}
                  placeholder="Ex: Machado de Assis, Stephen King, Acadêmico..."
                  className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                />
                <p className="text-xs text-gray-500 italic">
                  A IA analisará o estilo do autor e aplicará ao seu texto selecionado ou ao documento inteiro.
                </p>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowStyleModal(false)}
                    className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleMimicStyle}
                    className="flex-1 bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all"
                  >
                    Aplicar Estilo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Illustration Modal */}
      <AnimatePresence>
        {showIllustrationModal && lastIllustration && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIllustrationModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-purple-500/20 p-8 rounded-3xl w-full max-w-lg relative z-10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Ilustração Gerada</h2>
              <div className="aspect-square w-full rounded-2xl overflow-hidden border border-white/10 mb-6 relative">
                <Image 
                  src={lastIllustration} 
                  alt="Ilustração gerada" 
                  fill
                  className="object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowIllustrationModal(false)}
                  className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                >
                  Fechar
                </button>
                <a
                  href={lastIllustration}
                  download="ilustracao.png"
                  className="flex-1 bg-purple-500 text-white py-4 rounded-2xl font-bold hover:bg-purple-600 transition-all text-center"
                >
                  Baixar Imagem
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComplianceModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComplianceModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-2xl relative z-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {kdpValidation?.passed ? (
                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="text-green-400 w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                      <AlertTriangle className="text-red-400 w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">Relatório de Conformidade KDP</h2>
                    <p className="text-gray-400 text-sm">
                      {kdpValidation?.passed 
                        ? 'Seu livro está pronto para publicação!' 
                        : 'Alguns problemas precisam ser corrigidos.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowComplianceModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {kdpValidation && (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <div className="text-2xl font-bold text-[#D4AF37]">{kdpValidation.metrics.totalPages}</div>
                      <div className="text-xs text-gray-500">Páginas</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <div className="text-2xl font-bold text-[#D4AF37]">{kdpValidation.metrics.wordCount}</div>
                      <div className="text-xs text-gray-500">Palavras</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <div className="text-2xl font-bold text-[#D4AF37]">{kdpValidation.metrics.chapterCount}</div>
                      <div className="text-xs text-gray-500">Capítulos</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl text-center">
                      <div className="text-2xl font-bold text-[#D4AF37]">
                        {kdpValidation.metrics.hasTableOfContents ? '✅' : '❌'}
                      </div>
                      <div className="text-xs text-gray-500">Sumário</div>
                    </div>
                  </div>

                  {kdpValidation.issues.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Problemas ({kdpValidation.issues.length})
                      </h3>
                      <div className="space-y-2">
                        {kdpValidation.issues.map((issue: any, idx: number) => (
                          <div key={idx} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                            <div className="text-red-400 text-sm font-bold">{issue.category}</div>
                            <div className="text-gray-400 text-xs">{issue.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {kdpValidation.warnings.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Recomendações ({kdpValidation.warnings.length})
                      </h3>
                      <div className="space-y-2">
                        {kdpValidation.warnings.map((warning: any, idx: number) => (
                          <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                            <div className="text-yellow-400 text-sm font-bold">{warning.category}</div>
                            <div className="text-gray-400 text-xs">{warning.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowComplianceModal(false)}
                  className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={handleExportComplianceReport}
                  className="flex-1 bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-5 h-5" />
                  Baixar Relatório
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
