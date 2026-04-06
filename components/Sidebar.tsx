'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  PenTool, 
  Languages, 
  Headphones, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Plus,
  User,
  Book as BookIcon,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Crown,
  AlertTriangle,
  Baby,
  Smartphone,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

export const Sidebar = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: BookIcon, label: 'Meus Livros', path: '/books' },
    { icon: PenTool, label: 'Editor Inteligente', path: '/editor' },
    { icon: FileText, label: 'Editor de PDF', path: '/pdf-editor' },
    { icon: Baby, label: 'Livros Infantis', path: '/childrens-book-creator' },
    { icon: Smartphone, label: 'E-books Estratégicos', path: '/ebook-creator' },
    { icon: Languages, label: 'Tradução', path: '/translation' },
    { icon: Headphones, label: 'Audiobook', path: '/audiobook' },
    { icon: Users, label: 'Clientes / Projetos', path: '/crm' },
    { icon: User, label: 'Meu Perfil', path: '/profile' },
    { icon: Crown, label: 'Planos', path: '/plans' },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      toggle();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -280,
          width: 280
        }}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[280px] bg-[#0A0A0A] border-r border-[#D4AF37]/20 z-50 flex flex-col transition-all duration-300 lg:translate-x-0",
          !isOpen && "lg:w-[80px]"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <Logo size="sm" showText={isOpen} className={cn(!isOpen && "mx-auto")} />
          <button 
            onClick={toggle} 
            className="text-gray-400 hover:text-white transition-all p-2 hover:bg-white/5 rounded-lg"
            title={isOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            {isOpen ? <X className="lg:hidden" /> : <Menu />}
            {isOpen && <Menu className="hidden lg:block" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleLinkClick}
                className={cn(
                  "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-black" : "group-hover:text-[#D4AF37]")} />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#D4AF37]/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
