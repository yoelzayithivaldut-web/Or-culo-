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
  AlignLeft,
  Type,
  FileCheck,
  ArrowLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  generateWritingAssistance,
  completeEditorialReview,
  humanizeText,
  translateText
} from '@/services/gemini';
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          {pdfText && (
            <>
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
                onClick={() => setMode(mode === 'edit' ? 'chat' : 'edit')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                  showChat 
                    ? "bg-[#D4AF37] text-black" 
                    : "bg-white/5 text-gray-400 hover:text-white"
                )}
              >
                {showChat ? <AlignLeft className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                {showChat ? 'Modo Edição' : 'Modo Chat'}
              </button>
            </>
          )}
        </div>
      </header>

      {!pdfText ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xl">
            <div className="w-24 h-24 bg-[#D4AF37]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <FileText className="w-12 h-12 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Carregue seu PDF</h2>
            <p className="text-gray-400 mb-8">
              Envie um arquivo PDF para extrair o texto e começar a editar ou conversar com o conteúdo usando inteligência artificial.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-3 bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] mx-auto disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Selecionar PDF
                </>
              )}
            </button>
            
            <p className="text-gray-500 text-xs mt-4">
              Arquivos até 20MB são aceitos
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
              
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="O texto do seu PDF aparecerá aqui..."
                className="flex-1 w-full bg-transparent text-gray-200 p-6 text-base leading-relaxed focus:outline-none resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span>Modo: {mode === 'edit' ? 'Edição' : 'Conversa'}</span>
                <span>|</span>
                <span>{editedText.length} caracteres</span>
              </div>
              <div className="flex items-center gap-2">
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
    </div>
  );
}