'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, LogIn, Eye, EyeOff, UserPlus, Loader2, 
  AlertTriangle, CheckCircle2, XCircle, Mail, UserCircle,
  ShieldCheck, Lock, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const { user, isBypass, refreshAuth, setBypass } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Muito Fraca', 'Fraca', 'Média', 'Forte', 'Muito Forte'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    // Redirection is now handled by AuthProvider
  }, [user, router]);

  useEffect(() => {
    console.log('Oráculo: Checking Supabase connection...');
    // Use a simple ping to check connection
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('Oráculo: Supabase connection error:', error);
          setConnectionStatus('error');
          // Don't toast here to avoid annoying the user on initial load
        } else {
          console.log('Oráculo: Supabase connection OK');
          setConnectionStatus('ok');
        }
      })
      .catch(err => {
        console.error('Oráculo: Supabase connection exception:', err);
        setConnectionStatus('error');
      });

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error_description') || params.get('error');
    if (error) toast.error('Erro de Autenticação', { description: error });
  }, []);

  const isAdminEmail = email === 'word.intelligence@gmail.com' || email === 'yoelzayithivaldut@gmail.com';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If connection is error, we still let them try, but warn them
    if (connectionStatus === 'error') {
      toast.warning('Aviso de Conexão', { description: 'Supabase pode estar inacessível. Tentando mesmo assim...' });
    }
    if (isSignUp && password !== confirmPassword) return toast.error('Senhas não coincidem');
    if (isSignUp && !fullName) return toast.error('Informe seu nome completo');
    
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: fullName,
              onboarding_completed: false
            }
          }
        });
        if (data.user && data.session) {
          toast.success('Conta criada com sucesso!');
          // AuthProvider will handle redirection
        } else {
          setEmailNotConfirmed(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          // Special handling for admin emails: if login fails, try auto-signup
          const isAdminEmail = email === 'word.intelligence@gmail.com' || email === 'yoelzayithivaldut@gmail.com';
          if (isAdminEmail && (error.message.includes('Invalid login credentials') || error.status === 400)) {
            console.log('Oráculo: Admin email detected, attempting auto-signup...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: 'Administrador', onboarding_completed: true }
              }
            });
            if (!signUpError && signUpData.session) {
              toast.success('Conta de administrador criada e logada!');
              // AuthProvider will handle redirection
              return;
            }
          }
          throw error;
        }
        
        if (data.session) {
          toast.success('Login realizado com sucesso!');
          // AuthProvider will handle redirection
        }
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (data.session) {
        toast.success('Entrando como convidado...');
        // AuthProvider will handle redirection
      }
    } catch (error: any) {
      toast.error('Login Anônimo desativado no Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao entrar com Google', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) return toast.error('Informe seu e-mail');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      toast.success('Link mágico enviado!');
      setEmailNotConfirmed(true);
      setCooldown(60);
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error('Oráculo: Auth error:', error);
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('email not confirmed')) {
      setEmailNotConfirmed(true);
    } else if (msg.includes('rate limit')) {
      toast.error('Limite atingido. Aguarde 1 minuto.');
      setCooldown(60);
    } else {
      toast.error(`Erro: ${error.message}`, { 
        description: `Código: ${error.code || 'AUTH_ERROR'}` 
      });
    }
  };

  const handleAdminBypass = async () => {
    try {
      setBypass(true);
      toast.success('Modo Admin (Word Intelligence) ativado!');
    } catch (error) {
      console.error('Bypass error:', error);
      toast.error('Erro ao ativar modo bypass');
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return toast.error('Informe seu e-mail para recuperação');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Instruções de recuperação enviadas para seu e-mail e celular cadastrado.');
    } catch (error: any) {
      toast.error('Erro ao solicitar recuperação', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || cooldown > 0) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      toast.success('E-mail de confirmação reenviado!');
      setCooldown(60);
    } catch (error: any) {
      toast.error('Erro ao reenviar', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const [verificationCode, setVerificationCode] = useState('');
  const [showManualVerification, setShowManualVerification] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup'
      });
      if (error) throw error;
      if (data.session) {
        toast.success('E-mail confirmado!');
        // AuthProvider will handle redirection
      }
    } catch (error: any) {
      toast.error('Código inválido ou expirado', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailNotConfirmed) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-[#0A0A0A] border border-[#D4AF37]/20 p-10 rounded-3xl space-y-8">
          <Mail className="text-[#D4AF37] w-16 h-16 mx-auto" />
          <h2 className="text-2xl font-bold text-[#D4AF37] uppercase tracking-widest">Verifique seu E-mail</h2>
          <p className="text-gray-400 text-sm">Enviamos um link para <span className="text-white font-bold">{email}</span>.</p>
          
          {showManualVerification ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input 
                type="text" 
                value={verificationCode} 
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <button type="submit" disabled={isLoading} className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />} Confirmar Código
              </button>
              <button type="button" onClick={() => setShowManualVerification(false)} className="text-gray-500 text-xs uppercase tracking-widest hover:text-white">Usar link do e-mail</button>
            </form>
          ) : (
            <div className="space-y-3">
              <button onClick={() => window.location.reload()} className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><CheckCircle2 size={20} /> Já confirmei via link</button>
              <button 
                onClick={() => setShowManualVerification(true)} 
                className="w-full bg-white/5 text-white py-4 rounded-2xl font-bold border border-white/10 hover:bg-white/10 transition-all"
              >
                Digitar código manualmente
              </button>
              <button 
                onClick={handleResendEmail} 
                disabled={isLoading || cooldown > 0}
                className="w-full bg-white/5 text-white py-4 rounded-2xl font-bold border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-all"
              >
                {cooldown > 0 ? `Aguarde ${cooldown}s` : 'Reenviar E-mail'}
              </button>
              <button onClick={handleAnonymousLogin} className="w-full bg-white/5 text-gray-400 py-3 rounded-xl text-xs font-bold border border-white/10 flex items-center justify-center gap-2"><UserCircle size={16} /> Entrar como Convidado</button>
              <button onClick={() => setEmailNotConfirmed(false)} className="text-gray-500 text-xs uppercase tracking-widest hover:text-white pt-2">← Voltar</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[60%] md:h-[40%] bg-[#D4AF37]/10 blur-[80px] md:blur-[120px] rounded-full" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-[#0A0A0A] border border-[#D4AF37]/20 p-6 md:p-10 rounded-3xl shadow-2xl relative z-10">
        <div className="text-center mb-8 md:mb-10">
          <Logo size="md" className="mb-4 md:mb-6 mx-auto" />
          <p className="text-gray-400 text-xs md:text-sm">CRM inteligente para a nova era literária.</p>
          <div className="mt-3 md:mt-4 flex items-center justify-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus === 'checking' ? "bg-yellow-500 animate-pulse" :
              connectionStatus === 'ok' ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
              {connectionStatus === 'checking' ? 'Verificando Oráculo...' :
               connectionStatus === 'ok' ? 'Conectado ao Supabase' : 'Erro de Conexão'}
            </span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                  type="text" 
                  required 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="w-full bg-black border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                  placeholder="Nome Completo" 
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-black border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                placeholder="seu@email.com" 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-black border border-white/10 p-4 pl-12 pr-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                placeholder="Senha" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            {isSignUp && password.length > 0 && (
              <div className="space-y-2 px-1">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-gray-500">Força da Senha</span>
                  <span className={cn(
                    strength === 0 ? 'text-red-500' :
                    strength === 1 ? 'text-orange-500' :
                    strength === 2 ? 'text-yellow-500' :
                    strength === 3 ? 'text-green-500' : 'text-emerald-500'
                  )}>
                    {strengthLabels[strength]}
                  </span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: i < strength ? 1 : 0 }}
                      className={cn("h-full flex-1 origin-left transition-colors duration-500", i < strength ? strengthColors[strength] : 'bg-transparent')}
                    />
                  ))}
                </div>
              </div>
            )}
            {isSignUp && (
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full bg-black border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50" 
                  placeholder="Confirmar Senha" 
                />
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {!isSignUp && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={handlePasswordReset}
                  className="text-[10px] text-gray-500 hover:text-[#D4AF37] uppercase tracking-widest transition-all"
                >
                  Esqueceu a senha? Recuperar via E-mail/SMS
                </button>
              </div>
            )}
            <button type="submit" disabled={isLoading} className={cn(
              "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all",
              "bg-[#D4AF37] text-black hover:bg-[#B8962E]"
            )}>
              {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />)} 
              {isSignUp ? 'Criar Conta Segura' : 'Entrar na Plataforma'}
            </button>

            {isAdminEmail && !isSignUp && (
              <button
                type="button"
                onClick={handleAdminBypass}
                className="w-full bg-white/5 text-[#D4AF37] py-4 rounded-2xl font-bold border border-[#D4AF37]/30 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                Acesso Direto Admin
              </button>
            )}

            {!isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button" 
                  onClick={handleGoogleLogin} 
                  disabled={isLoading || connectionStatus === 'error'} 
                  className="bg-white/5 text-white py-4 rounded-2xl font-bold border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button 
                  type="button" 
                  onClick={handleMagicLink} 
                  disabled={isLoading || cooldown > 0 || connectionStatus === 'error'} 
                  className="bg-white/5 text-white py-4 rounded-2xl font-bold border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  Link
                </button>
              </div>
            )}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-gray-500 text-xs uppercase tracking-widest hover:text-white">{isSignUp ? 'Já tem conta? Entre' : 'Não tem conta? Cadastre-se'}</button>
            
            {connectionStatus === 'error' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center"
              >
                <p className="text-red-400 text-[10px] uppercase tracking-widest font-bold mb-1">Aviso de Conexão</p>
                <p className="text-gray-400 text-[10px]">O Supabase não está respondendo. Para testar os recursos agora, use o botão de Admin abaixo.</p>
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-6 pt-6 border-t border-white/5 opacity-50 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3" /> SSL Seguro
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Lock className="w-3 h-3" /> Dados Criptografados
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Globe className="w-3 h-3" /> Servidores Globais
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleAdminBypass}
                className="w-full bg-red-500/10 text-red-500 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Entrar como Admin (Bypass de Teste)
              </button>
              <p className="text-[8px] text-gray-600 text-center mt-2 uppercase tracking-tighter">
                Use apenas para testes. O login real será corrigido posteriormente.
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
