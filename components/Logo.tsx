'use client';

import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("bg-[#D4AF37] p-2 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]", sizes[size])}
      >
        <BookOpen className="w-full h-full text-black" />
      </motion.div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-white uppercase tracking-widest leading-none", textSizes[size])}>
            ORÁCULO
          </span>
          <span className="text-[10px] text-[#D4AF37] font-bold tracking-[0.3em] uppercase leading-none mt-1">
            LITERÁRIO
          </span>
        </div>
      )}
    </div>
  );
}
