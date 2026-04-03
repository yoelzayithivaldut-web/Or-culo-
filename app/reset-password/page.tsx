'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a session (from the recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Link de recuperação inválido ou expirado.');
        router.push('/login');
      }
    });
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Senhas não coincidem');
    if (password.length < 8) return toast.error('A senha deve ter pelo menos 8 caracteres');

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setIsSuccess(true);
      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      toast.error('Erro ao atualizar senha', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-md w-full bg-[#0A0A0A] border border-[#D4AF37]/20 p-10 rounded-3xl space-y-8"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-green-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Senha Atualizada!</h2>
          <p className="text-gray-400">Sua nova senha foi configurada com sucesso. Redirecionando para o login...</p>
          <div className="pt-4">
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all"
            >
              Ir para Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-md w-full bg-[#0A0A0A] border border-[#D4AF37]/20 p-10 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <Logo size="md" className="mb-6" />
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Nova Senha</h1>
          <p className="text-gray-400 text-sm mt-2">Defina sua nova credencial de acesso.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-black border border-white/10 p-4 pl-12 pr-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                placeholder="Nova Senha" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full bg-black border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                placeholder="Confirmar Nova Senha" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Lock size={20} />} 
            Redefinir Senha
          </button>
        </form>
      </motion.div>
    </div>
  );
}
