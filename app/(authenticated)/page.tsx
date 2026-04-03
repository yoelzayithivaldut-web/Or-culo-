'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Users, 
  Languages, 
  Headphones, 
  TrendingUp, 
  Clock, 
  Plus,
  ChevronRight,
  ArrowUpRight,
  Baby,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { useAuth } from '@/components/AuthProvider';

const data = [
  { name: 'Seg', words: 1200 },
  { name: 'Ter', words: 2100 },
  { name: 'Qua', words: 1800 },
  { name: 'Qui', words: 3400 },
  { name: 'Sex', words: 2800 },
  { name: 'Sáb', words: 4500 },
  { name: 'Dom', words: 3200 },
];

const StatCard = ({ icon: Icon, label, value, trend, colorClass, isLoading }: any) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-[#0A0A0A] border border-white/10 p-5 md:p-6 rounded-3xl relative overflow-hidden group"
  >
    <div className={cn("absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 blur-[40px] md:blur-[60px] rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-all", colorClass.bg)} />
    <div className="flex items-start justify-between mb-3 md:mb-4">
      <div className={cn("p-2.5 md:p-3 rounded-2xl bg-white/5", colorClass.text)}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      {trend && !isLoading && (
        <div className="flex items-center gap-1 text-green-500 text-xs md:text-sm font-medium">
          <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {trend}
        </div>
      )}
    </div>
    <div className="space-y-0.5 md:space-y-1">
      <p className="text-gray-400 text-[10px] md:text-sm font-medium uppercase tracking-wider">{label}</p>
      {isLoading ? (
        <div className="h-8 w-16 bg-white/5 animate-pulse rounded-lg" />
      ) : (
        <h3 className="text-2xl md:text-3xl font-bold text-white">{value}</h3>
      )}
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    books: 0,
    clients: 0,
    words: '18.4k',
    languages: 5
  });

  const [recentBooks, setRecentBooks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribeBooks = supabaseService.subscribeToCollection(
        'books', 
        { column: 'user_id', value: user.id },
        (books) => {
          setStats(prev => ({ ...prev, books: books?.length || 0 }));
          const sorted = [...(books || [])].sort((a, b) => 
            new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
          ).slice(0, 3);
          setRecentBooks(sorted);
          setIsLoading(false);
        }
      );

      const unsubscribeClients = supabaseService.subscribeToCollection(
        'clients',
        { column: 'user_id', value: user.id },
        (clients) => {
          setStats(prev => ({ ...prev, clients: clients?.length || 0 }));
          setIsLoading(false);
        }
      );

      return () => {
        if (unsubscribeBooks) unsubscribeBooks();
        if (unsubscribeClients) unsubscribeClients();
      };
    }
  }, [user]);

  const colors = {
    gold: { text: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10 group-hover:bg-[#D4AF37]/20' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-400/10 group-hover:bg-blue-400/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-400/10 group-hover:bg-purple-400/20' },
    green: { text: 'text-green-400', bg: 'bg-green-400/10 group-hover:bg-green-400/20' },
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 md:mb-2">Olá, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Escritor'}</h1>
          <p className="text-gray-400 text-sm md:text-base">Bem-vindo de volta ao seu centro de comando literário.</p>
        </div>
        <Link 
          href="/books"
          className="flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Novo Projeto
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Livros Criados" value={stats.books} trend="+2 este mês" colorClass={colors.gold} isLoading={isLoading} />
        <StatCard icon={Users} label="Clientes Ativos" value={stats.clients} trend="+12%" colorClass={colors.blue} isLoading={isLoading} />
        <StatCard icon={Clock} label="Palavras Escritas" value={stats.words} trend="+5.2k" colorClass={colors.purple} isLoading={isLoading} />
        <StatCard icon={Languages} label="Idiomas" value={stats.languages} colorClass={colors.green} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          href="/childrens-book-creator"
          className="bg-gradient-to-br from-[#D4AF37]/20 to-[#0A0A0A] border border-[#D4AF37]/30 p-8 rounded-3xl group hover:border-[#D4AF37] transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-[#D4AF37]/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-[#D4AF37] text-black">
              <Baby className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white group-hover:text-[#D4AF37] transition-all">Livros Infantis</h3>
              <p className="text-gray-400">Crie histórias mágicas com ilustrações IA.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#D4AF37] font-bold">
            Começar Agora <ArrowUpRight className="w-5 h-5" />
          </div>
        </Link>

        <Link 
          href="/ebook-creator"
          className="bg-gradient-to-br from-blue-500/10 to-[#0A0A0A] border border-blue-500/30 p-8 rounded-3xl group hover:border-blue-500 transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-blue-500 text-white">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-all">E-books Estratégicos</h3>
              <p className="text-gray-400">Baseado em tendências e temas atuais.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            Explorar Tendências <ArrowUpRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Produtividade Semanal</h3>
            <select className="bg-white/5 border border-white/10 text-sm rounded-xl px-4 py-2 focus:outline-none">
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#D4AF37' }}
                />
                <Area type="monotone" dataKey="words" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorWords)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl">
          <h3 className="text-xl font-bold text-white mb-6">Projetos Recentes</h3>
          <div className="space-y-6">
            {recentBooks.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Nenhum projeto recente.
              </div>
            ) : (
              recentBooks.map((book) => (
                <Link 
                  key={book.id} 
                  href={`/editor/${book.id}`}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-[#D4AF37]/10 transition-all">
                      <BookOpen className="w-6 h-6 text-gray-400 group-hover:text-[#D4AF37]" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium group-hover:text-[#D4AF37] transition-all line-clamp-1">{book.title}</h4>
                      <p className="text-gray-500 text-sm capitalize">{book.status === 'writing' ? 'Em escrita' : book.status}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all" />
                </Link>
              ))
            )}
          </div>
          <Link 
            href="/books"
            className="block w-full mt-8 py-3 text-center text-gray-400 hover:text-white text-sm font-medium border border-white/5 hover:border-white/20 rounded-xl transition-all"
          >
            Ver todos os projetos
          </Link>
        </div>
      </div>
    </div>
  );
}
