'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileText,
  Send,
  Sparkles,
  Wand2,
  Maximize2,
  Minimize2,
  Copy,
  RefreshCw,
  MessageCircle,
  X,
  FileDown,
  Loader2,
  ChevronRight,
  Trash2,
  History,
  Settings,
  BookOpen,
  Type,
  FileCheck,
  ArrowLeft,
  Save,
  BookPlus,
  Edit3,
  User,
  FileSignature,
  Bold,
  Italic,
  Underline,
  AlignLeft as AlignLeftIcon,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  ZoomIn,
  ZoomOut,
  Palette,
  TextQuote,
  Highlighter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  generateWritingAssistance,
  completeEditorialReview,
  humanizeText,
  translateText
} from '@/services/gemini';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

let pdfjsLib: any = null;
let pdfjsLoaded = false;

const loadPdfJs = async (): Promise<any> => {
  if (typeof window === 'undefined') return null;
  if (pdfjsLib) return pdfjsLib;
  if (pdfjsLoaded) return null;
  
  pdfjsLoaded = true;
  
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
    script.type = 'module';
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
      pdfjsLib = (window as any).pdfjsLib;
      resolve(pdfjsLib);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function PdfEditorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pdfText, setPdfText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [mode, setMode] = useState<'edit' | 'chat'>('edit');
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [editorFontSize, setEditorFontSize] = useState(16);
  const [editorFontFamily, setEditorFontFamily] = useState('Times New Roman');
  const [editorLineHeight, setEditorLineHeight] = useState(1.8);
  const [editorAlign, setEditorAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true);
  const [selectedTextStyle, setSelectedTextStyle] = useState<string[]>([]);
  
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
    genre: 'Ficção',
    language: 'Português (Brasil)',
    synopsis: '',
    subtitle: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjs = await loadPdfJs();
    if (!pdfjs) throw new Error('PDF.js não disponível');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Por favor, envie um arquivo PDF válido.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const text = await extractTextFromPdf(file);
      setPdfText(text);
      setEditedText(text);
      toast.success('PDF extraído com sucesso!');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Erro ao extrair texto do PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAction = async (action: string) => {
    if (!editedText && action !== 'chat') {
      toast.error('Nenhum texto carregado. Envie um PDF primeiro.');
      return;
    }

    setIsProcessing(true);
    setShowAiMenu(false);

    try {
      let result = '';

      switch (action) {
        case 'improve':
          result = await generateWritingAssistance(
            'Melhore a gramática, clareza e fluidez do seguinte texto:',
            editedText
          );
          setEditedText(result);
          toast.success('Texto melhorado com sucesso!');
          break;

        case 'expand':
          result = await generateWritingAssistance(
            'Expanda este texto adicionando mais detalhes e profundidade, mantendo o tom original:',
            editedText
          );
          setEditedText(result);
          toast.success('Texto expandido com sucesso!');
          break;

        case 'summarize':
          result = await generateWritingAssistance(
            'Resuma o seguinte texto em uma versão concisa mantendo os pontos principais:',
            editedText
          );
          setEditedText(result);
          toast.success('Texto resumido com sucesso!');
          break;

        case 'humanize':
          result = await humanizeText(editedText);
          setEditedText(result);
          toast.success('Texto humanizado com sucesso!');
          break;

        case 'editorial':
          result = await completeEditorialReview(editedText, fileName.replace('.pdf', ''));
          setEditedText(result);
          toast.success('Edição editorial completa aplicada!');
          break;

        case 'translate-en':
          result = await translateText(editedText, 'Inglês');
          setEditedText(result);
          toast.success('Traduzido para Inglês!');
          break;

        case 'translate-es':
          result = await translateText(editedText, 'Espanhol');
          setEditedText(result);
          toast.success('Traduzido para Espanhol!');
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('AI action error:', error);
      toast.error('Erro ao processar com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsAiLoading(true);

    try {
      const context = `Você está helping me with the following document:\n\n${editedText}\n\n---\n\nUser question: ${inputMessage}`;
      const response = await generateWritingAssistance(
        inputMessage,
        editedText
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Erro ao processar mensagem.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const title = fileName.replace('.pdf', '') || 'Documento Editado';
    
    doc.setFontSize(16);
    doc.text(title, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(editedText, 170);
    let y = 40;

    splitText.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 7;
    });

    doc.save(`${title.replace(/\s+/g, '_')}_editado.pdf`);
    toast.success('PDF baixado com sucesso!');
  };

  const handleNewPdf = () => {
    setPdfText('');
    setEditedText('');
    setFileName('');
    setMessages([]);
    setCurrentBookId(null);
    setBookMetadata({
      title: '',
      author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
      genre: 'Ficção',
      language: 'Português (Brasil)',
      synopsis: '',
      subtitle: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveToBooks = async () => {
    if (!editedText.trim()) {
      toast.error('Nenhum texto para salvar.');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const bookData = {
        title: bookMetadata.title || fileName.replace('.pdf', '') || 'Livro Sem Título',
        content: editedText,
        author: bookMetadata.author,
        genre: bookMetadata.genre,
        language: bookMetadata.language === 'Português (Brasil)' ? 'pt-BR' : 
                 bookMetadata.language === 'English' ? 'en' : 'es',
        synopsis: bookMetadata.synopsis,
        subtitle: bookMetadata.subtitle,
        user_id: user.id,
        status: 'editing',
        updated_at: new Date().toISOString()
      };

      if (currentBookId) {
        await supabaseService.updateDocument('books', currentBookId, bookData);
        toast.success('Livro atualizado com sucesso!');
      } else {
        const newId = await supabaseService.addDocument('books', {
          ...bookData,
          created_at: new Date().toISOString()
        });
        setCurrentBookId(newId);
        toast.success('Livro salvo com sucesso!');
      }
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('Erro ao salvar o livro.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewBook = () => {
    setPdfText('');
    setEditedText('');
    setFileName('');
    setMessages([]);
    setCurrentBookId(null);
    setBookMetadata({
      title: '',
      author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
      genre: 'Ficção',
      language: 'Português (Brasil)',
      synopsis: '',
      subtitle: ''
    });
    setShowMetadataModal(true);
  };

  const handleLoadFromBooks = async (bookId: string) => {
    setIsLoading(true);
    try {
      const book: any = await supabaseService.getDocument('books', bookId);
      if (book) {
        setCurrentBookId(book.id);
        setEditedText(book.content || '');
        setPdfText(book.content || '');
        setFileName(book.title || 'Livro Carregado');
        setBookMetadata({
          title: book.title || '',
          author: book.author || '',
          genre: book.genre || 'Ficção',
          language: book.language === 'pt-BR' ? 'Português (Brasil)' : 
                   book.language === 'en' ? 'English' : 'Español',
          synopsis: book.synopsis || '',
          subtitle: book.subtitle || ''
        });
        toast.success(`Livro "${book.title}" carregado!`);
      }
    } catch (error) {
      console.error('Error loading book:', error);
      toast.error('Erro ao carregar o livro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadKdpPdf = () => {
    const pageWidthMm = 152.4;
    const pageHeightMm = 228.6;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm]
    });

    const title = bookMetadata.title || fileName.replace('.pdf', '') || 'Obra Sem Título';
    const author = bookMetadata.author || 'Autor Desconhecido';
    
    const marginInner = 12.7;
    const marginOuter = 6.35;
    const marginTop = 6.35;
    const marginBottom = 6.35;
    const lineHeight = 6;
    const fontSizeBody = 11;
    const fontSizeChapter = 16;
    const fontSizeSubChapter = 14;
    
    const getMargins = (pageNum: number) => ({
      left: pageNum % 2 === 0 ? marginInner : marginOuter,
      right: pageNum % 2 === 0 ? marginOuter : marginInner
    });

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
      const parsed: { type: string; text: string }[] = [];
      
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
    const parsedContent = parseContent(editedText);
    let currentY = marginTop;
    
    const addPage = () => {
      doc.addPage();
      pageNum++;
      currentY = marginTop;
    };

    doc.setFont('times', 'normal');
    
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.text(title.toUpperCase(), pageWidthMm / 2, pageHeightMm / 2 - 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    doc.text(`por ${author}`, pageWidthMm / 2, pageHeightMm / 2 + 10, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });
    addPage();
    
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
          currentY += lineHeight * 1.5;
        } else if (item.type === 'subchapter' && wrappedLines.indexOf(line) === 0) {
          doc.setFont('times', 'bold');
          currentY += lineHeight * 1.3;
        } else {
          doc.setFont('times', 'normal');
          currentY += lineHeight;
        }
        
        doc.text(line, margins.left, currentY);
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

    doc.save(`${title.replace(/\s+/g, '_')}_KDP_6x9.pdf`);
    toast.success('PDF formatado para KDP exportado com sucesso!');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Editor de PDF com IA
              <span className="text-xs font-normal px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-md uppercase tracking-widest">
                {mode === 'edit' ? 'Edição' : 'Conversa'}
              </span>
            </h1>
            <p className="text-gray-500 text-sm">
              Carregue um PDF para editar, reescrever ou conversar com o conteúdo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewBook}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all border border-white/10"
          >
            <BookPlus className="w-4 h-4" />
            Novo Livro
          </button>
          {pdfText && (
            <>
              <button
                onClick={handleSaveToBooks}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:bg-[#B8962E] transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Salvando...' : 'Salvar Livro'}
              </button>
              <button
                onClick={() => setShowMetadataModal(true)}
                className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
                title="Editar Metadados"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={handleNewPdf}
                className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                title="Novo PDF"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownloadPdf}
                className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-[#D4AF37] transition-all"
                title="Baixar PDF"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownloadKdpPdf}
                className="p-3 hover:bg-white/5 rounded-xl text-green-400 hover:text-green-300 transition-all"
                title="Exportar KDP (6x9)"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setMode(mode === 'edit' ? 'chat' : 'edit')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                  showChat 
                    ? "bg-[#D4AF37] text-black" 
                    : "bg-white/5 text-gray-400 hover:text-white"
                )}
              >
                {showChat ? <AlignLeftIcon className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                {showChat ? 'Modo Edição' : 'Modo Chat'}
              </button>
            </>
          )}
        </div>
      </header>

      {!pdfText ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <button
                onClick={handleCreateNewBook}
                className="p-8 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-3xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group"
              >
                <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mb-4">
                  <BookPlus className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[#D4AF37]">Criar Novo Livro</h3>
                <p className="text-gray-400 text-sm">
                  Comece do zero com assistência de IA e formatação KDP
                </p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/20">
                  <Upload className="w-7 h-7 text-gray-400 group-hover:text-[#D4AF37]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-[#D4AF37]">Importar PDF</h3>
                <p className="text-gray-400 text-sm">
                  Carregue um PDF existente para editar e melhorar
                </p>
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <p className="text-gray-500 text-xs">
              ou arraste um arquivo PDF para esta área •Máx. 20MB
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0">
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white font-medium text-sm">{fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {editedText.split(/\s+/).filter(x => x).length} palavras
                  </span>
                  <button 
                    onClick={() => setShowAiMenu(true)}
                    className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#B8962E] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    IA Editor
                  </button>
                </div>
              </div>

              {showFormattingToolbar && (
                <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-white/[0.02] flex-wrap">
                  <div className="flex items-center gap-1 pr-3 border-r border-white/10">
                    <button
                      onClick={() => setEditorFontSize(Math.max(12, editorFontSize - 2))}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white"
                      title="Diminuir fonte"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400 min-w-[40px] text-center">{editorFontSize}px</span>
                    <button
                      onClick={() => setEditorFontSize(Math.min(32, editorFontSize + 2))}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white"
                      title="Aumentar fonte"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 px-3 border-r border-white/10">
                    <select
                      value={editorFontFamily}
                      onChange={(e) => setEditorFontFamily(e.target.value)}
                      className="bg-transparent text-gray-400 text-xs py-1 focus:outline-none"
                    >
                      <option value="Times New Roman" className="bg-[#0A0A0A]">Times New Roman</option>
                      <option value="Arial" className="bg-[#0A0A0A]">Arial</option>
                      <option value="Georgia" className="bg-[#0A0A0A]">Georgia</option>
                      <option value="Verdana" className="bg-[#0A0A0A]">Verdana</option>
                      <option value="Courier New" className="bg-[#0A0A0A]">Courier New</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 px-2">
                    <button
                      onClick={() => setEditorAlign('left')}
                      className={cn("p-1.5 rounded hover:bg-white/5 transition-all", editorAlign === 'left' ? "text-[#D4AF37]" : "text-gray-400")}
                      title="Alinhar à esquerda"
                    >
                      <AlignLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditorAlign('center')}
                      className={cn("p-1.5 rounded hover:bg-white/5 transition-all", editorAlign === 'center' ? "text-[#D4AF37]" : "text-gray-400")}
                      title="Centralizar"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditorAlign('right')}
                      className={cn("p-1.5 rounded hover:bg-white/5 transition-all", editorAlign === 'right' ? "text-[#D4AF37]" : "text-gray-400")}
                      title="Alinhar à direita"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditorAlign('justify')}
                      className={cn("p-1.5 rounded hover:bg-white/5 transition-all", editorAlign === 'justify' ? "text-[#D4AF37]" : "text-gray-400")}
                      title="Justificar"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 px-2 border-l border-white/10">
                    <button
                      onClick={() => setEditorLineHeight(Math.max(1.2, editorLineHeight - 0.2))}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white text-xs"
                      title="Diminuir espaçamento"
                    >
                      -L
                    </button>
                    <span className="text-xs text-gray-400 min-w-[50px] text-center">L: {editorLineHeight.toFixed(1)}</span>
                    <button
                      onClick={() => setEditorLineHeight(Math.min(3, editorLineHeight + 0.2))}
                      className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white text-xs"
                      title="Aumentar espaçamento"
                    >
                      +L
                    </button>
                  </div>

                  <button
                    onClick={() => setShowFormattingToolbar(false)}
                    className="ml-auto p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-white"
                    title="Ocultar toolbar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setEditedText(e.currentTarget.innerText)}
                style={{
                  fontSize: `${editorFontSize}px`,
                  fontFamily: editorFontFamily,
                  lineHeight: editorLineHeight,
                  textAlign: editorAlign
                }}
                className="flex-1 w-full bg-[#080808] text-gray-200 p-8 focus:outline-none resize-none overflow-y-auto"
              >
                {editedText}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span>Modo: {mode === 'edit' ? 'Edição' : 'Conversa'}</span>
                <span>|</span>
                <span>{editedText.length} caracteres</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                  className={cn("p-2 rounded-lg transition-all", showFormattingToolbar ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "hover:bg-white/5 text-gray-400 hover:text-white")}
                >
                  <Palette className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(editedText)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-96 flex flex-col bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-white font-bold">Chat com IA</h3>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Pergunte sobre o documento ou peça para melhorar trechos específicos
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        Comece a conversa sobre o documento
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-2xl text-sm",
                          msg.role === 'user' 
                            ? "bg-[#D4AF37]/10 text-gray-200 ml-8" 
                            : "bg-white/5 text-gray-300 mr-8"
                        )}
                      >
                        {msg.content}
                      </div>
                    ))
                  )}
                  {isAiLoading && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isAiLoading || !inputMessage.trim()}
                      className="p-3 bg-[#D4AF37] text-black rounded-xl hover:bg-[#B8962E] transition-all disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                  <h2 className="text-2xl font-bold text-white">Ferramentas de IA</h2>
                  <p className="text-gray-400 text-sm">Escolha uma ação para aplicar ao texto</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAiAction('improve')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Wand2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Melhorar Texto</h4>
                  <p className="text-gray-500 text-xs">Corrige gramática e clareza</p>
                </button>

                <button 
                  onClick={() => handleAiAction('expand')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Maximize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Expandir</h4>
                  <p className="text-gray-500 text-xs">Adiciona detalhes e profundidade</p>
                </button>

                <button 
                  onClick={() => handleAiAction('summarize')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Minimize2 className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Resumir</h4>
                  <p className="text-gray-500 text-xs">Cria versão concisa</p>
                </button>

                <button 
                  onClick={() => handleAiAction('humanize')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <Type className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Humanizar</h4>
                  <p className="text-gray-500 text-xs">Remove padrões de IA</p>
                </button>

                <button 
                  onClick={() => handleAiAction('editorial')}
                  disabled={isProcessing}
                  className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-left hover:border-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all group disabled:opacity-50"
                >
                  <FileCheck className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-[#D4AF37] font-bold">Edição Completa</h4>
                  <p className="text-gray-400 text-xs">Revisão editorial profissional</p>
                </button>

                <button 
                  onClick={() => {
                    setShowAiMenu(false);
                    setShowChat(true);
                    setMode('chat');
                  }}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <MessageCircle className="w-6 h-6 text-[#D4AF37] mb-2" />
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Conversar</h4>
                  <p className="text-gray-500 text-xs">Chat inteligente sobre o texto</p>
                </button>

                <button 
                  onClick={() => handleAiAction('translate-en')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <span className="text-lg font-bold text-[#D4AF37] mb-2 block">EN</span>
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Traduzir</h4>
                  <p className="text-gray-500 text-xs">Para Inglês</p>
                </button>

                <button 
                  onClick={() => handleAiAction('translate-es')}
                  disabled={isProcessing}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all group disabled:opacity-50"
                >
                  <span className="text-lg font-bold text-[#D4AF37] mb-2 block">ES</span>
                  <h4 className="text-white font-bold group-hover:text-[#D4AF37]">Traduzir</h4>
                  <p className="text-gray-500 text-xs">Para Espanhol</p>
                </button>
              </div>

              {isProcessing && (
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
                    <p className="text-gray-400 text-xs">Configure as informações do seu livro</p>
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
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                    <FileSignature className="w-4 h-4 inline mr-1" /> Título do Livro
                  </label>
                  <input
                    type="text"
                    value={bookMetadata.title}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, title: e.target.value })}
                    placeholder="Digite o título do seu livro..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                    <User className="w-4 h-4 inline mr-1" /> Autor
                  </label>
                  <input
                    type="text"
                    value={bookMetadata.author}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, author: e.target.value })}
                    placeholder="Nome do autor..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                      Gênero
                    </label>
                    <select
                      value={bookMetadata.genre}
                      onChange={(e) => setBookMetadata({ ...bookMetadata, genre: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                    >
                      <option value="Ficção" className="bg-[#0A0A0A]">Ficção</option>
                      <option value="Não Ficção" className="bg-[#0A0A0A]">Não Ficção</option>
                      <option value="Romance" className="bg-[#0A0A0A]">Romance</option>
                      <option value="Aventura" className="bg-[#0A0A0A]">Aventura</option>
                      <option value="Ficção Científica" className="bg-[#0A0A0A]">Ficção Científica</option>
                      <option value="Fantasia" className="bg-[#0A0A0A]">Fantasia</option>
                      <option value="Mistério" className="bg-[#0A0A0A]">Mistério</option>
                      <option value="Suspense" className="bg-[#0A0A0A]">Suspense</option>
                      <option value="Biografia" className="bg-[#0A0A0A]">Biografia</option>
                      <option value="Autoajuda" className="bg-[#0A0A0A]">Autoajuda</option>
                      <option value="Infantil" className="bg-[#0A0A0A]">Infantil</option>
                      <option value="Poesia" className="bg-[#0A0A0A]">Poesia</option>
                      <option value="Outro" className="bg-[#0A0A0A]">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                      Idioma
                    </label>
                    <select
                      value={bookMetadata.language}
                      onChange={(e) => setBookMetadata({ ...bookMetadata, language: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                    >
                      <option value="Português (Brasil)" className="bg-[#0A0A0A]">Português (Brasil)</option>
                      <option value="English" className="bg-[#0A0A0A]">English</option>
                      <option value="Español" className="bg-[#0A0A0A]">Español</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                    Subtítulo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={bookMetadata.subtitle}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, subtitle: e.target.value })}
                    placeholder="Um subtítulo descritivo..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                    Sinopse (Opcional)
                  </label>
                  <textarea
                    value={bookMetadata.synopsis}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, synopsis: e.target.value })}
                    placeholder="Uma breve descrição do livro..."
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
                  Salvar Metadados
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}