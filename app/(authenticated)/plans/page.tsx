'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  ShieldCheck, 
  Lock, 
  Globe, 
  ArrowRight,
  QrCode,
  Copy,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseService } from '@/services/supabaseService';

const plans = [
  {
    id: 'free',
    name: 'Teste',
    price: 'Grátis',
    period: '15 dias',
    icon: Zap,
    features: ['1 Livro', 'IA Básica', 'Tradução Limitada', 'Sem Audiobook'],
    color: 'gray-400',
    button: 'Começar Agora'
  },
  {
    id: 'basic',
    name: 'Básico',
    price: 'R$ 24,90',
    period: 'por mês',
    icon: Sparkles,
    features: ['5 Livros', 'IA Avançada', 'Tradução Ilimitada', '5 Audiobooks/mês'],
    color: '[#D4AF37]',
    popular: true,
    button: 'Assinar Básico'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 49,90',
    period: 'por mês',
    icon: Crown,
    features: ['Livros Ilimitados', 'IA Prioritária', 'Tradução Ilimitada', 'Audiobooks Ilimitados', 'Suporte VIP'],
    color: 'purple-500',
    button: 'Assinar Premium'
  }
];

export default function Plans() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'pix'>('selection');

  const handlePlanSelect = (plan: any) => {
    if (plan.id === 'free') {
      router.push('/');
      return;
    }
    setSelectedPlan(plan);
    setPaymentStep('pix');
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136word.intelligence@gmail.com520400005303986540524.905802BR5925Word Intelligence6009Sao Paulo62070503***6304ABCD');
    toast.success('Chave PIX copiada!');
  };

  const simulatePayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      // Save plan to database
      await supabaseService.saveUser({
        plan: selectedPlan.id
      });
      
      toast.success('Pagamento confirmado! Bem-vindo ao Oráculo Pro.');
      router.push('/');
    } catch (error) {
      toast.error('Erro ao processar assinatura.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12 py-10 pb-20 relative">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-5xl font-bold text-white tracking-tight">Escolha seu Destino</h1>
        <p className="text-gray-400 text-lg">Planos flexíveis para escritores independentes e grandes editoras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            whileHover={{ y: -10 }}
            className={cn(
              "bg-[#0A0A0A] border p-8 rounded-[40px] relative flex flex-col",
              plan.popular ? "border-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.1)]" : "border-white/10"
            )}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                Mais Popular
              </div>
            )}

            <div className="mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white/5", `text-${plan.color}`)}>
                <plan.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
            </div>

            <div className="space-y-4 flex-1 mb-10">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handlePlanSelect(plan)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all",
                plan.popular 
                  ? "bg-[#D4AF37] text-black hover:bg-[#B8962E] shadow-[0_10px_20px_rgba(212,175,55,0.2)]" 
                  : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
              )}
            >
              {plan.button}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-white font-bold text-xl">Deseja testar primeiro?</h3>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                <ShieldCheck className="text-[#D4AF37] w-4 h-4" /> Pagamento Seguro
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                <Lock className="text-[#D4AF37] w-4 h-4" /> SSL 256-bit
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/')}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-white/10 group"
          >
            Pular e ir para o Dashboard 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlan(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-[40px] w-full max-w-md relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedPlan(null)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-all"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-3xl flex items-center justify-center text-[#D4AF37] mx-auto">
                  <QrCode size={40} />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white">Pagamento via PIX</h2>
                  <p className="text-gray-400 text-sm mt-1">Plano {selectedPlan.name} • {selectedPlan.price}</p>
                </div>

                <div className="bg-white p-4 rounded-3xl inline-block shadow-xl">
                  {/* Mock QR Code */}
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center border-4 border-white">
                    <QrCode size={160} className="text-black" />
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={copyPixKey}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-[#D4AF37]/50 transition-all"
                  >
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Copia e Cola</p>
                      <p className="text-xs text-white truncate max-w-[200px]">00020126580014BR.GOV.BCB.PIX0136word.intelligence@gmail.com...</p>
                    </div>
                    <Copy className="text-gray-500 group-hover:text-[#D4AF37] transition-all" size={20} />
                  </button>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold justify-center">
                    <CheckCircle2 className="text-green-500" size={12} /> Liberação Instantânea após confirmação
                  </div>
                </div>

                <button 
                  onClick={simulatePayment}
                  disabled={isProcessing}
                  className="w-full bg-[#D4AF37] text-black py-5 rounded-2xl font-bold text-lg hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processando...
                    </>
                  ) : (
                    'Já realizei o pagamento'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
