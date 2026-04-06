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
  ArrowRight
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

  const handleDownloadKdpPdf = () => {
    const pageWidthMm = 152.4;
    const pageHeightMm = 228.6;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm]
    });

    const title = book?.title || 'Obra Sem Título';
    const author = book?.author || 'Autor Desconhecido';
    
    const marginInner = 22;
    const marginOuter = 18;
    const marginTop = 20;
    const marginBottom = 20;
    const lineHeight = 6;
    const fontSizeBody = 11;
    const fontSizeChapter = 16;
    const fontSizeSubChapter = 14;
    
    const getMargins = (pageNum: number) => {
      return {
        left: pageNum % 2 === 0 ? marginInner : marginOuter,
        right: pageNum % 2 === 0 ? marginOuter : marginInner
      };
    };

    const isChapterTitle = (line: string): 'chapter' | 'subchapter' | 'none' => {
      const trimmed = line.trim();
      if (/^#{1,3}\s/.test(trimmed)) return 'chapter';
      if (/^(CAP[ií]TULO|Chapter)\s*\.?\s*[IVXLC0-9]+/i.test(trimmed)) return 'chapter';
      if (/^[IVXLC]+[.\s]/.test(trimmed) && trimmed.length < 30) return 'chapter';
      if (/^\d+[.\)]\s/.test(trimmed) && trimmed.length < 40) return 'subchapter';
      return 'none';
    };

    const parseContent = (text: string) => {
      const lines = text.split('\n');
      const parsed: { type: string; text: string; }[] = [];
      
      lines.forEach(line => {
        const chapterType = isChapterTitle(line);
        if (chapterType === 'chapter') {
          parsed.push({ type: 'chapter', text: line.replace(/^#+\s*/, '').trim() });
        } else if (chapterType === 'subchapter') {
          parsed.push({ type: 'subchapter', text: line.trim() });
        } else if (line.trim()) {
          parsed.push({ type: 'body', text: line.trim() });
        } else {
          parsed.push({ type: 'blank', text: '' });
        }
      });
      
      return parsed;
    };

    const wrapText = (text: string, contentWidth: number, currentFontSize: number): string[] => {
      doc.setFontSize(currentFontSize);
      return doc.splitTextToSize(text, contentWidth);
    };

    let pageNum = 1;
    const parsedContent = parseContent(content);
    let currentY = marginTop;
    const addPage = () => {
      doc.addPage();
      pageNum++;
      currentY = marginTop;
    };

    doc.setFont('times', 'normal');
    
    parsedContent.forEach((item) => {
      if (item.type === 'blank') {
        currentY += lineHeight * 0.8;
        return;
      }

      const margins = getMargins(pageNum);
      const contentWidth = pageWidthMm - margins.left - margins.right;

      let fontSize = fontSizeBody;
      if (item.type === 'chapter') fontSize = fontSizeChapter;
      if (item.type === 'subchapter') fontSize = fontSizeSubChapter;

      const wrappedLines = wrapText(item.text, contentWidth, fontSize);

      wrappedLines.forEach((line: string) => {
        if (currentY + lineHeight > pageHeightMm - marginBottom) {
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });
          addPage();
        }

        doc.setFontSize(fontSize);
        if (item.type === 'chapter' && wrappedLines.indexOf(line) === 0) {
          doc.setFont('times', 'bold');
          const xPos = pageNum % 2 === 0 ? pageWidthMm - margins.right : margins.left;
          doc.text(line, xPos, currentY, { align: pageNum % 2 === 0 ? 'right' : 'left' });
          currentY += lineHeight * 1.5;
        } else if (item.type === 'subchapter' && wrappedLines.indexOf(line) === 0) {
          doc.setFont('times', 'bold');
          doc.text(line, margins.left, currentY);
          currentY += lineHeight * 1.3;
        } else {
          doc.setFont('times', 'normal');
          doc.text(line, margins.left, currentY);
          currentY += lineHeight;
        }
      });

      if (item.type === 'chapter') {
        currentY += lineHeight * 1.2;
      } else {
        currentY += lineHeight * 0.5;
      }
    });

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });

    doc.addPage();
    pageNum++;
    
    doc.setFontSize(10);
    doc.setFont('times', 'italic');
    doc.text(title, pageWidthMm / 2, pageHeightMm / 2 - 10, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text(author, pageWidthMm / 2, pageHeightMm / 2, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('times', 'italic');
    doc.text('https://kdp.amazon.com', pageWidthMm / 2, pageHeightMm - 15, { align: 'center' });

    doc.save(`${title.replace(/\s+/g, '_')}_KDP_6x9.pdf`);
    toast.success('PDF formatado para KDP (6" x 9") exportado com sucesso!');
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

      {/* AI Menu Modal */}
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
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center">
                  <Sparkles className="text-black w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Editor Inteligente Oráculo</h2>
                  <p className="text-gray-400 text-sm">Como posso ajudar na sua escrita hoje?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => handleAiAction('improve')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <Wand2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Melhorar Escrita</h4>
                  <p className="text-gray-500 text-xs">Ajusta gramática e estilo.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('expand')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <Maximize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Expandir Texto</h4>
                  <p className="text-gray-500 text-xs">Adiciona detalhes e profundidade.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('summarize')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <Minimize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Resumir</h4>
                  <p className="text-gray-500 text-xs">Cria uma versão concisa.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('suggest')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <Sparkles className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Sugerir Próximo Passo</h4>
                  <p className="text-gray-500 text-xs">Ideias para a continuação.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('cover')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <ImageIcon className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Capa e Contracapa</h4>
                  <p className="text-gray-500 text-xs">Gere capas e textos de orelha.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('pagenumbers')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <History className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Números de Página</h4>
                  <p className="text-gray-500 text-xs">IA organiza a paginação do texto.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('backcovertext')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <FileText className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Texto da Contracapa</h4>
                  <p className="text-gray-500 text-xs">Gere o blurb e bio para a orelha.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('humanize')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <UserCircle className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Humanizar Texto</h4>
                  <p className="text-gray-500 text-xs">Torna o texto natural e indetectável.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('mimic')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
                >
                  <PenTool className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Mimetizar Estilo</h4>
                  <p className="text-gray-500 text-xs">Copia o estilo de um autor específico.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('generateillustration')}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                >
                  <ImageIcon className="w-6 h-6 text-purple-400 mb-2" />
                  <h4 className="text-white font-bold group-hover:text-purple-400">Gerar Ilustração</h4>
                  <p className="text-gray-500 text-xs">Cria imagem do texto selecionado.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('editorial')}
                  className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group col-span-2"
                >
                  <BookCheck className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-[#D4AF37] font-bold">Edição Completa (Padrão Amazon)</h4>
                  <p className="text-gray-400 text-xs">Melhoria total: escrita, roteiro, índice, dedicatória e formatação profissional.</p>
                </button>
                <button 
                  onClick={() => handleAiAction('manuscript')}
                  className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group"
                >
                  <FileText className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-[#D4AF37] font-bold">Formatar Manuscrito (IA)</h4>
                  <p className="text-gray-400 text-xs">Reescreve o texto seguindo padrões literários.</p>
                </button>
                <button 
                  onClick={handleDownloadManuscriptPdf}
                  className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group"
                >
                  <FileText className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-[#D4AF37] font-bold">Exportar Manuscrito (PDF)</h4>
                  <p className="text-gray-400 text-xs">Gera PDF formatado para editoras e agentes.</p>
                </button>
                <button 
                  onClick={handleDownloadKdpPdf}
                  className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-left hover:border-green-500 hover:bg-green-500/20 transition-all group"
                >
                  <FileDown className="w-6 h-6 text-green-400 mb-2" />
                  <h4 className="text-green-400 font-bold">Exportar para KDP (PDF)</h4>
                  <p className="text-gray-400 text-xs">Formato 6&quot; x 9&quot; com margens KDP.</p>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-3xl flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold">Pronto para publicar?</h4>
                    <p className="text-gray-500 text-xs">Sua obra está formatada para o Amazon KDP.</p>
                  </div>
                  <a 
                    href="https://kdp.amazon.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#B8962E] transition-all"
                  >
                    Publicar <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Ou digite um comando personalizado..."
                    className="w-full bg-white/5 border border-white/10 text-white pl-4 pr-12 py-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                  <button 
                    onClick={() => handleAiAction('custom')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#D4AF37] text-black rounded-xl hover:bg-[#B8962E] transition-all"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
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
    </div>
  );
}
