'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  Globe, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  ChevronRight,
  PenTool,
  Library,
  Feather
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo size="sm" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Recursos</a>
            <a href="#about" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sobre</a>
            <Link href="/login" className="text-sm font-bold text-[#D4AF37] hover:text-white transition-colors">Entrar</Link>
            <Link 
              href="/login" 
              className="bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-60 md:pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#D4AF37]/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">A Nova Era da Escrita Literária</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
          >
            Seu <span className="text-[#D4AF37]">Oráculo</span> para a <br /> Inteligência Literária.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            O CRM definitivo para autores e editoras. Organize seus projetos, 
            potencialize sua escrita com IA e gerencie sua carreira literária em um só lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link 
              href="/login" 
              className="w-full sm:w-auto bg-[#D4AF37] text-black px-10 py-5 rounded-2xl font-bold text-lg hover:bg-[#B8962E] transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2 group"
            >
              Começar minha Jornada
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-lg text-white border border-white/10 hover:bg-white/5 transition-all"
            >
              Ver Recursos
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-40 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Tudo o que um autor precisa.</h2>
            <p className="text-gray-500 text-lg">Ferramentas profissionais integradas com o poder da Inteligência Artificial.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: PenTool,
                title: 'Editor Inteligente',
                desc: 'Escrita assistida por IA que entende seu estilo e sugere melhorias em tempo real.'
              },
              {
                icon: Users,
                title: 'CRM Literário',
                desc: 'Gerencie autores, editoras e parceiros com um sistema de gestão especializado.'
              },
              {
                icon: Globe,
                title: 'Tradução Global',
                desc: 'Traduza suas obras para mais de 50 idiomas mantendo a essência e o tom original.'
              },
              {
                icon: Library,
                title: 'Gestão de Projetos',
                desc: 'Organize múltiplos livros, contos e e-books com controle de progresso e metas.'
              },
              {
                icon: Zap,
                title: 'E-books Estratégicos',
                desc: 'Crie e-books baseados em tendências de mercado para maximizar seu alcance.'
              },
              {
                icon: ShieldCheck,
                title: 'Segurança Total',
                desc: 'Sua propriedade intelectual protegida com criptografia de ponta a ponta.'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[32px] bg-[#0A0A0A] border border-white/5 hover:border-[#D4AF37]/30 transition-all group"
              >
                <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8962E] rounded-[48px] p-10 md:p-20 text-center text-black relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full -mr-32 -mt-32" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Pronto para escrever seu <br /> próximo best-seller?</h2>
              <Link 
                href="/login" 
                className="inline-flex items-center gap-3 bg-black text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-900 transition-all shadow-2xl group"
              >
                Começar Gratuitamente
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-8 text-black/60 font-medium uppercase tracking-widest text-xs">Sem cartão de crédito necessário</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo size="xs" />
          <p className="text-gray-600 text-sm">© 2026 Oráculo CRM. Todos os direitos reservados.</p>
          <div className="flex gap-8">
            <a href="#" className="text-gray-600 hover:text-white transition-colors text-sm">Termos</a>
            <a href="#" className="text-gray-600 hover:text-white transition-colors text-sm">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
