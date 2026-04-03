'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  BookOpen, 
  Trash2, 
  Edit3, 
  ExternalLink,
  Languages,
  Headphones,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { generateSynopsis } from '@/services/gemini';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';

import { useSearchParams } from 'next/navigation';

export default function Books() {
  const { user, plan, isUnlimited } = useAuth();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<any>(null);
  const [newBook, setNewBook] = useState({ title: '', genre: '', author: '', synopsis: '', initialIdea: '' });
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false);
  const router = useRouter();

  const getPlanLimit = React.useCallback(() => {
    if (isUnlimited) return Infinity;
    if (plan === 'basic') return 5;
    return 1; // free
  }, [plan, isUnlimited]);

  const handleOpenNewModal = React.useCallback(() => {
    const limit = getPlanLimit();
    if (books.length >= limit) {
      toast.error(`Limite do plano atingido (${limit} livros). Faça upgrade para continuar.`);
      router.push('/plans');
      return;
    }
    setShowNewModal(true);
  }, [books.length, getPlanLimit, router]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleOpenNewModal();
    }
  }, [searchParams, handleOpenNewModal]);

  useEffect(() => {
    if (user) {
      setNewBook(prev => ({ 
        ...prev, 
        author: user.user_metadata?.full_name || user.email?.split('@')[0] || '' 
      }));
      
      const unsubscribe = supabaseService.subscribeToCollection(
        'books', 
        { column: 'user_id', value: user.id },
        (data) => {
          setBooks(data);
          setLoading(false);
        }
      );
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !user) return;

    const limit = getPlanLimit();
    if (books.length >= limit) {
      toast.error('Limite de livros atingido.');
      return;
    }

    try {
      const id = await supabaseService.addDocument('books', {
        title: newBook.title,
        genre: newBook.genre,
        author: newBook.author,
        synopsis: newBook.synopsis,
        user_id: user.id,
        status: 'writing',
        content: newBook.initialIdea || '',
        language: 'pt-BR'
      });
      toast.success('Livro criado com sucesso!');
      setShowNewModal(false);
      setNewBook({ title: '', genre: '', author: '', synopsis: '', initialIdea: '' });
      router.push(`/editor/${id}`);
    } catch (error) {
      toast.error('Erro ao criar livro.');
    }
  };

  const handleGenerateSynopsis = async () => {
    if (!newBook.title) {
      toast.error('Informe ao menos o título para gerar a sinopse.');
      return;
    }
    setIsGeneratingSynopsis(true);
    try {
      const synopsis = await generateSynopsis(newBook.title, newBook.genre, newBook.initialIdea);
      setNewBook(prev => ({ ...prev, synopsis }));
      toast.success('Sinopse gerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar sinopse.');
    } finally {
      setIsGeneratingSynopsis(false);
    }
  };

  const handleDelete = async () => {
    if (!bookToDelete) return;
    try {
      await supabaseService.deleteDocument('books', bookToDelete.id);
      toast.success('Livro excluído com sucesso.');
      setBookToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir o livro.');
    }
  };

  const filteredBooks = books.filter(book => 
    (book.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (book.genre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Meus Livros</h1>
          <p className="text-gray-400">Gerencie sua biblioteca de projetos literários.</p>
        </div>
        <button 
          onClick={handleOpenNewModal}
          className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
        >
          <Plus className="w-5 h-5" />
          Novo Livro
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar por título ou gênero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 text-gray-400 px-6 py-4 rounded-2xl hover:text-white transition-all">
          <Filter className="w-5 h-5" />
          Filtros
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[280px] bg-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] mx-auto mb-6">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sua biblioteca está vazia</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Você ainda não criou nenhum livro. Comece sua jornada literária agora mesmo!
          </p>
          <button 
            onClick={handleOpenNewModal}
            className="bg-[#D4AF37] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#B8962E] transition-all"
          >
            Criar Meu Primeiro Livro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <motion.div
              layout
              key={book.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-3xl group hover:border-[#D4AF37]/30 transition-all relative overflow-hidden flex flex-col"
            >
              {book.cover_url ? (
                <div className="aspect-[3/4] w-full relative overflow-hidden">
                  <Image 
                    src={book.cover_url} 
                    alt={book.title} 
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60" />
                </div>
              ) : (
                <div className="p-6 pb-0">
                  <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                    <BookOpen className="w-8 h-8" />
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#D4AF37] transition-all line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-gray-500 text-sm uppercase tracking-wider font-medium">
                      {book.genre || 'Gênero não definido'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setBookToDelete(book)}
                    className="p-2 text-gray-500 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Languages className="w-4 h-4" />
                    {book.language || 'PT-BR'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Edit3 className="w-4 h-4" />
                    {book.status === 'writing' ? 'Em escrita' : book.status}
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/editor/${book.id}`}
                    className="flex-1 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white py-3 rounded-xl font-bold text-center transition-all"
                  >
                    Editar
                  </Link>
                  <a 
                    href="https://kdp.amazon.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white py-3 rounded-xl font-bold text-center transition-all"
                  >
                    Publicar
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                    <Headphones className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Book Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-lg relative z-10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Criar Novo Livro</h2>
              <form onSubmit={handleCreateBook} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-widest">Título</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newBook.title}
                    onChange={e => setNewBook({...newBook, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                    placeholder="Ex: O Enigma do Tempo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 uppercase tracking-widest">Gênero</label>
                    <input
                      type="text"
                      value={newBook.genre}
                      onChange={e => setNewBook({...newBook, genre: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                      placeholder="Ex: Ficção Científica"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 uppercase tracking-widest">Autor</label>
                    <input
                      type="text"
                      value={newBook.author}
                      onChange={e => setNewBook({...newBook, author: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-widest">Ideia Inicial / Premissa</label>
                  <textarea
                    value={newBook.initialIdea}
                    onChange={e => setNewBook({...newBook, initialIdea: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 h-24 resize-none"
                    placeholder="Descreva brevemente sua ideia..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400 uppercase tracking-widest">Sinopse</label>
                    <button
                      type="button"
                      onClick={handleGenerateSynopsis}
                      disabled={isGeneratingSynopsis}
                      className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-bold"
                    >
                      {isGeneratingSynopsis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Gerar Sinopse com IA
                    </button>
                  </div>
                  <textarea
                    value={newBook.synopsis}
                    onChange={e => setNewBook({...newBook, synopsis: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 h-32 resize-none"
                    placeholder="A sinopse aparecerá aqui..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                  >
                    Criar Livro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {bookToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBookToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-red-500/20 p-8 rounded-3xl w-full max-w-md relative z-10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Excluir Livro?</h2>
              <p className="text-gray-400 mb-8">
                Tem certeza que deseja excluir <span className="text-white font-bold">&quot;{bookToDelete.title}&quot;</span>? 
                Esta ação é irreversível e todos os dados serão perdidos.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setBookToDelete(null)}
                  className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                >
                  Manter Livro
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
                >
                  Excluir Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
