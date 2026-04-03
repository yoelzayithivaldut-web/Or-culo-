'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Menu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { Logo } from '@/components/Logo';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isBypass, signOut, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleExitBypass = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {isBypass && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between z-[60]">
          <div className="flex items-center gap-3 text-red-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Modo de Teste Ativo (Bypass) - Dados Locais</span>
          </div>
          <button 
            onClick={handleExitBypass}
            className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-md font-bold hover:bg-red-600 transition-all shrink-0"
          >
            Sair
          </button>
        </div>
      )}

      {/* Mobile Header */}
      <header className="lg:hidden h-16 border-b border-white/10 bg-[#0A0A0A] px-6 flex items-center justify-between sticky top-0 z-40">
        <Logo size="sm" />
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-400"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className={cn(
          "flex-1 transition-all duration-300 min-h-screen w-full overflow-y-auto",
          isSidebarOpen ? "lg:pl-[280px]" : "lg:pl-[80px]"
        )}>
          <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
