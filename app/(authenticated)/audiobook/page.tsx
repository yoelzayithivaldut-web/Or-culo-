'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Waves,
  Upload,
  FileText,
  Save,
  Trash2,
  BookPlus,
  FileDown,
  Edit3,
  User,
  BookOpen,
  X,
  FileSignature
} from 'lucide-react';
import { generateAudiobook } from '@/services/gemini';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const voices = [
  { id: 'Kore', name: 'Kore', type: 'Feminina', desc: 'Calma e profissional' },
  { id: 'Fenrir', name: 'Fenrir', type: 'Masculina', desc: 'Profunda e narrativa' },
  { id: 'Puck', name: 'Puck', type: 'Feminina', desc: 'Energética e jovem' },
  { id: 'Charon', name: 'Charon', type: 'Masculina', desc: 'Séria e autoritária' },
  { id: 'Zephyr', name: 'Zephyr', type: 'Neutra', desc: 'Suave e etérea' },
];

import { useAuth } from '@/components/AuthProvider';
import { jsPDF } from 'jspdf';

export default function Audiobook() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [generatedAudios, setGeneratedAudios] = useState<{id: string; title: string; url: string; voice: string; date: string}[]>([]);
  const [currentAudioTitle, setCurrentAudioTitle] = useState('');
  const [showAudioList, setShowAudioList] = useState(false);
  
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
    genre: 'Ficção',
    language: 'Português (Brasil)',
    synopsis: '',
    subtitle: ''
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      const audioId = Date.now().toString();
      const audioTitle = bookMetadata.title || fileName.replace('.pdf', '') || 'Áudio Sem Título';
      setGeneratedAudios(prev => [...prev, {
        id: audioId,
        title: audioTitle,
        url: url,
        voice: selectedVoice,
        date: new Date().toLocaleDateString()
      }]);
      setCurrentAudioTitle(audioTitle);
      setShowAudioList(true);
      
      toast.success('Audiobook gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar áudio.');
    } finally {
      setIsLoading(false);
    }
  };

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

    setIsExtracting(true);
    setFileName(file.name);

    try {
      const extractedText = await extractTextFromPdf(file);
      setText(extractedText);
      setBookMetadata({ ...bookMetadata, title: file.name.replace('.pdf', '') });
      toast.success('PDF importado com sucesso!');
    } catch (error) {
      console.error('Error extracting PDF:', error);
      toast.error('Erro ao extrair texto do PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveToBooks = async () => {
    if (!text.trim()) {
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
        content: text,
        author: bookMetadata.author,
        genre: bookMetadata.genre,
        language: bookMetadata.language === 'Português (Brasil)' ? 'pt-BR' : 
                 bookMetadata.language === 'English' ? 'en' : 'es',
        synopsis: bookMetadata.synopsis,
        subtitle: bookMetadata.subtitle,
        user_id: user.id,
        status: 'audiobook',
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
    setText('');
    setFileName('');
    setCurrentBookId(null);
    setAudioUrl(null);
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
    const parsedContent = parseContent(text);
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

  const handleNewProject = () => {
    setText('');
    setFileName('');
    setCurrentBookId(null);
    setAudioUrl(null);
    setBookMetadata({
      title: '',
      author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
      genre: 'Ficção',
      language: 'Português (Brasil)',
      synopsis: '',
      subtitle: ''
    });
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
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewBook}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all border border-white/10"
          >
            <BookPlus className="w-4 h-4" />
            Novo Projeto
          </button>
          
          {text && (
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
                onClick={handleNewProject}
                className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                title="Novo Projeto"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadKdpPdf}
                className="p-3 hover:bg-white/5 rounded-xl text-green-400 hover:text-green-300 transition-all"
                title="Exportar KDP (6x9)"
              >
                <BookOpen className="w-5 h-5" />
              </button>
            </>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {text.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:bg-[#B8962E] transition-all disabled:opacity-50"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isExtracting ? 'Extraindo...' : 'Importar PDF'}
            </button>
          )}
          
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
        </div>
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

          {generatedAudios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Waves className="w-5 h-5 text-[#D4AF37]" />
                  Playlist de Áudios
                </h3>
                <button 
                  onClick={() => setShowAudioList(!showAudioList)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  {showAudioList ? 'Ocultar' : 'Mostrar'} ({generatedAudios.length})
                </button>
              </div>
              
              {showAudioList && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {generatedAudios.map((audio) => (
                    <div 
                      key={audio.id}
                      onClick={() => {
                        setAudioUrl(audio.url);
                        setCurrentAudioTitle(audio.title);
                        setIsPlaying(false);
                        toast.success(`Reproduzindo: ${audio.title}`);
                      }}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                          <Play className="w-4 h-4 text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{audio.title}</p>
                          <p className="text-gray-500 text-xs">{audio.voice} • {audio.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={audio.url}
                          download={`${audio.title}.mp3`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setGeneratedAudios(prev => prev.filter(a => a.id !== audio.id));
                            toast.success('Áudio removido');
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

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
