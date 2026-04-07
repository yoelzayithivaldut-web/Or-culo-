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
  Edit3,
  User,
  BookOpen,
  X,
  FileSignature,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  VolumeX,
  Music
} from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAudioService, AVAILABLE_VOICES } from '@/services/useAudioService';
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

export default function Audiobook() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isLoading, setIsLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAudioList, setShowAudioList] = useState(true);
  
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: user?.display_name || user?.email?.split('@')[0] || 'Autor Desconhecido',
    genre: 'Ficção',
    language: 'Português (Brasil)',
    synopsis: '',
    subtitle: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isGenerating,
    isPlaying,
    currentAudioUrl,
    currentAudioTitle,
    generatedAudios,
    error,
    audioProvider,
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
  } = useAudioService();

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
    if (!text.trim()) {
      toast.error('Por favor, insira um texto para converter em áudio.');
      return;
    }

    setIsLoading(true);
    try {
      const { url, provider, isDownloadable } = await generateAudio(text, selectedVoice);
      
      const audioTitle = bookMetadata.title || fileName.replace('.pdf', '') || 'Áudio Sem Título';
      addToPlaylist(audioTitle, url, selectedVoice, provider, isDownloadable);
      
      if (url !== 'browser-speech') {
        toast.success(`Áudio gerado com sucesso via ${provider}!`);
      } else {
        toast.success('Áudio pronto! Use o botão Ouvir para reproduzir.');
      }
    } catch (err) {
      console.error('Erro ao gerar áudio:', err);
      toast.error('Erro ao gerar áudio. Tente novamente.');
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
    setCurrentAudioUrl(null);
    clearPlaylist();
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

  const handleNewProject = () => {
    setText('');
    setFileName('');
    setCurrentBookId(null);
    setCurrentAudioUrl(null);
    clearPlaylist();
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
    if (!currentAudioUrl) return;

    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio(currentAudioUrl);
    }
  };

  const handleAudioSelect = (audio: any) => {
    setCurrentAudioUrl(audio.url);
    setCurrentAudioTitle(audio.title);
    setIsPlaying(false);
    toast.success(`Reproduzindo: ${audio.title}`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Gerador de Audiobook</h1>
          <p className="text-gray-400">Transforme seus manuscritos em áudio de alta fidelidade.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{text.length} / 5000 caracteres</span>
                {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
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
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#D4AF37]" />
              Configurações de Voz
            </h3>
            <div className="space-y-2">
              {AVAILABLE_VOICES.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={cn(
                    "w-full p-3 rounded-xl border transition-all text-left group",
                    selectedVoice === voice.id 
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-white" 
                      : "bg-white/5 border-white/5 text-gray-400 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("font-bold text-sm", selectedVoice === voice.id ? "text-[#D4AF37]" : "text-white")}>
                      {voice.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">
                      {voice.type}
                    </span>
                  </div>
                  <p className="text-xs opacity-60 mt-1">{voice.description}</p>
                </button>
              ))}
            </div>
          </div>

          {currentAudioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#D4AF37] to-[#B8962E] p-6 rounded-3xl text-black shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center">
                  <Waves className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{currentAudioTitle || 'Áudio Gerado'}</h4>
                  <p className="text-black/60 text-xs font-medium uppercase tracking-wider">
                    {audioProvider} • Pronto para ouvir
                  </p>
                </div>
                {isPlaying && (
                  <div className="flex gap-1">
                    {[1,2,3].map(i => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        className="w-1 h-4 bg-black/60 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={togglePlay}
                  className="w-12 h-12 bg-black text-[#D4AF37] rounded-full flex items-center justify-center hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: isPlaying ? '100%' : '30%' }}
                    transition={{ duration: isPlaying ? 2 : 0.5, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                    className="h-full bg-black"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => currentAudioUrl !== 'browser-speech' && downloadAudio(currentAudioUrl, currentAudioTitle)}
                  disabled={currentAudioUrl === 'browser-speech'}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                    currentAudioUrl === 'browser-speech' 
                      ? "bg-black/10 text-black/40 cursor-not-allowed"
                      : "bg-black/20 hover:bg-black/30 text-black"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </button>
                <button 
                  onClick={togglePlay}
                  className="flex items-center justify-center gap-2 bg-black text-[#D4AF37] px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-black/80 transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pausar' : 'Ouvir'}
                </button>
              </div>
              
              <audio 
                ref={audioRef} 
                src={currentAudioUrl !== 'browser-speech' ? currentAudioUrl : undefined}
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
              />
            </motion.div>
          )}

          {generatedAudios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0A0A0A] border border-white/10 p-5 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#D4AF37]" />
                  Playlist ({generatedAudios.length})
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={clearPlaylist}
                    className="text-xs text-gray-500 hover:text-red-400"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={() => setShowAudioList(!showAudioList)}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    {showAudioList ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              
              {showAudioList && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {generatedAudios.map((audio) => (
                    <div 
                      key={audio.id}
                      onClick={() => handleAudioSelect(audio)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group",
                        currentAudioUrl === audio.url 
                          ? "bg-[#D4AF37]/10 border border-[#D4AF37]/30" 
                          : "bg-white/5 hover:bg-white/10 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          currentAudioUrl === audio.url ? "bg-[#D4AF37] text-black" : "bg-[#D4AF37]/20 text-[#D4AF37]"
                        )}>
                          {currentAudioUrl === audio.url && isPlaying ? (
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                              <Volume2 className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{audio.title}</p>
                          <p className="text-gray-500 text-xs">{audio.voice} • {audio.provider}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {audio.url !== 'browser-speech' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAudio(audio.url, audio.title);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromPlaylist(audio.id);
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
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Título do Livro</label>
                  <input
                    type="text"
                    value={bookMetadata.title}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, title: e.target.value })}
                    placeholder="Digite o título do seu livro..."
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Gênero</label>
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
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Idioma</label>
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
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Subtítulo (Opcional)</label>
                  <input
                    type="text"
                    value={bookMetadata.subtitle}
                    onChange={(e) => setBookMetadata({ ...bookMetadata, subtitle: e.target.value })}
                    placeholder="Um subtítulo descritivo..."
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Sinopse (Opcional)</label>
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