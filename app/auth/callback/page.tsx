'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for code in URL (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const next = params.get('next') || '/';

        if (code) {
          console.log('Oráculo: Exchanging code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Now get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          console.log('Oráculo: Session established', session.user.email);
          toast.success('Acesso confirmado!');
          
          // Check onboarding status
          const onboardingCompleted = session.user.user_metadata?.onboarding_completed;
          
          // If next is provided and it's not the callback itself, use it
          const target = next.startsWith('/auth/callback') ? (onboardingCompleted ? '/' : '/onboarding') : next;
          router.push(target);
        } else {
          // If no session and no code, check for errors in hash or search
          const errorMsg = params.get('error_description') || params.get('error');
          if (errorMsg) {
            throw new Error(errorMsg);
          }
          
          // Fallback to login after a short delay to allow background processing
          console.log('Oráculo: No session found, waiting...');
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              const completed = retrySession.user.user_metadata?.onboarding_completed;
              router.push(completed ? '/' : '/onboarding');
            } else {
              router.push('/login');
            }
          }, 2000);
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast.error('Erro na confirmação', { description: error.message });
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#0A0A0A] border border-[#D4AF37]/20 p-10 rounded-3xl text-center space-y-6"
      >
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Confirmando Acesso</h2>
        <p className="text-gray-400 text-sm">
          Estamos verificando suas credenciais no Oráculo. 
          Você será redirecionado em instantes...
        </p>
        
        <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <CheckCircle2 className="w-3 h-3" /> Conexão Segura
        </div>
      </motion.div>
    </div>
  );
}
