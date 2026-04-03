'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  User, 
  Book, 
  Target,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';

export default function Onboarding() {
  const router = useRouter();
  const { user: authUser, refreshAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form data
  const [authorName, setAuthorName] = useState('');
  const [mainGenre, setMainGenre] = useState('');
  const [writingGoal, setWritingGoal] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [educationLevel, setEducationLevel] = useState('');

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setAuthorName(authUser?.user_metadata?.full_name || '');
    }
  }, [authUser]);

  useEffect(() => {
    const checkTable = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') {
            console.error('Oráculo: Tabela ou coluna em "profiles" não encontrada.');
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('SHOW_DB_SETUP', 'true');
              window.dispatchEvent(new CustomEvent('supabase-schema-error', { detail: { table: 'profiles' } }));
            }
          }
        }
      } catch (e) {
        console.error('Error checking profiles table:', e);
      }
    };
    checkTable();
  }, []);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      console.log('Oráculo: Completing onboarding...', { authorName, mainGenre, writingGoal });
      
      await supabaseService.saveUser({
        display_name: authorName,
        main_genre: mainGenre,
        writing_goal: writingGoal,
        address,
        phone: phoneNumber,
        education_level: educationLevel,
        onboarding_completed: true
      });

      // Update auth metadata too if not in bypass mode
      if (localStorage.getItem('ADMIN_BYPASS') !== 'true') {
        try {
          console.log('Oráculo: Updating auth metadata...');
          const { error: authError } = await supabase.auth.updateUser({
            data: { onboarding_completed: true }
          });
          if (authError) {
            console.error('Error updating auth metadata:', authError);
            // We don't throw here to allow the process to continue if DB save worked
          }
        } catch (e) {
          console.error('Auth metadata update failed:', e);
        }
      }

      toast.success('Perfil configurado com sucesso!');
      
      // Refresh auth state to update onboardingCompleted
      console.log('Oráculo: Refreshing auth state...');
      try {
        await refreshAuth();
        // AuthProvider will handle the final redirection to /plans
      } catch (e) {
        console.error('Auth refresh failed after onboarding:', e);
        // Fallback if refresh fails
        router.push('/plans');
      }
    } catch (error: any) {
      console.error('Onboarding save error:', error);
      toast.error(`Erro ao salvar perfil: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Como devemos te chamar?',
      description: 'Seu nome de autor ou pseudônimo.',
      icon: User,
      content: (
        <div className="space-y-4">
          <input 
            type="text" 
            value={authorName} 
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-xl"
            placeholder="Ex: Machado de Assis"
          />
        </div>
      )
    },
    {
      id: 2,
      title: 'Informações de Contato',
      description: 'Precisamos desses dados para sua identificação oficial.',
      icon: Phone,
      content: (
        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="tel" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50"
              placeholder="Telefone (com DDD)"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50"
              placeholder="Endereço Completo"
            />
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Sua Formação',
      description: 'Qual seu nível de escolaridade?',
      icon: GraduationCap,
      content: (
        <div className="grid grid-cols-1 gap-3">
          {[
            'Ensino Médio',
            'Graduação Incompleta',
            'Graduação Completa',
            'Pós-Graduação / Mestrado',
            'Doutorado',
            'Outro'
          ].map((level) => (
            <button
              key={level}
              onClick={() => setEducationLevel(level)}
              className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between ${
                educationLevel === level 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="font-medium">{level}</span>
              {educationLevel === level && <CheckCircle2 className="text-[#D4AF37] w-5 h-5" />}
            </button>
          ))}
        </div>
      )
    },
    {
      id: 4,
      title: 'Qual seu gênero principal?',
      description: 'Isso nos ajuda a personalizar as sugestões da IA.',
      icon: Book,
      content: (
        <div className="grid grid-cols-2 gap-4">
          {['Ficção', 'Não-Ficção', 'Infantil', 'Poesia', 'Acadêmico', 'Outro'].map((genre) => (
            <button
              key={genre}
              onClick={() => setMainGenre(genre)}
              className={`p-4 rounded-2xl border transition-all text-left ${
                mainGenre === genre 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="font-bold">{genre}</span>
            </button>
          ))}
        </div>
      )
    },
    {
      id: 5,
      title: 'Qual seu objetivo atual?',
      description: 'O que você espera alcançar com o Oráculo?',
      icon: Target,
      content: (
        <div className="space-y-4">
          {[
            'Escrever meu primeiro livro',
            'Publicar na Amazon KDP',
            'Melhorar minha produtividade',
            'Gerenciar meus clientes literários'
          ].map((goal) => (
            <button
              key={goal}
              onClick={() => setWritingGoal(goal)}
              className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between ${
                writingGoal === goal 
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="font-medium">{goal}</span>
              {writingGoal === goal && <CheckCircle2 className="text-[#D4AF37] w-5 h-5" />}
            </button>
          ))}
        </div>
      )
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[60%] md:w-[40%] h-[60%] md:h-[40%] bg-[#D4AF37]/10 blur-[80px] md:blur-[120px] rounded-full" />
      
      <div className="max-w-xl w-full space-y-8 md:space-y-12 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 md:gap-2">
            {steps.map((s, i) => (
              <div 
                key={s.id} 
                className={`h-1 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? 'w-6 md:w-10 bg-[#D4AF37]' : 'w-4 md:w-6 bg-white/10'
                }`} 
              />
            ))}
          </div>
          <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold">Passo {step} de {steps.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 md:space-y-8"
          >
            <div className="space-y-3 md:space-y-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#D4AF37]/10 rounded-2xl md:rounded-3xl flex items-center justify-center">
                <currentStep.icon className="text-[#D4AF37] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{currentStep.title}</h1>
              <p className="text-gray-400 text-base md:text-lg">{currentStep.description}</p>
            </div>

            <div className="py-2 md:py-4">
              {currentStep.content}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-white/5">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="text-gray-500 hover:text-white transition-all disabled:opacity-0 text-sm md:text-base"
          >
            Voltar
          </button>
          
          {step < steps.length ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 1 ? !authorName : 
                step === 2 ? (!phoneNumber || !address) : 
                step === 3 ? !educationLevel :
                step === 4 ? !mainGenre :
                false
              }
              className="bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 text-sm md:text-base"
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading || !writingGoal}
              className="bg-[#D4AF37] text-black px-8 md:px-10 py-3 md:py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] disabled:opacity-50 text-sm md:text-base"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Finalizar
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-600 text-[8px] md:text-[10px] uppercase tracking-widest text-center">
          <ShieldCheck size={10} /> Dados protegidos por criptografia
        </div>
      </div>
    </div>
  );
}
