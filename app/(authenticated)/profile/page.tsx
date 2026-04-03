'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Book, 
  Target, 
  Save, 
  Loader2,
  ShieldCheck,
  Crown,
  Zap
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, role, plan, isUnlimited, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [mainGenre, setMainGenre] = useState('');
  const [writingGoal, setWritingGoal] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await supabaseService.getProfile();
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setEducationLevel(data.education_level || '');
          setMainGenre(data.main_genre || '');
          setWritingGoal(data.writing_goal || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabaseService.saveUser({
        display_name: displayName,
        phone,
        address,
        education_level: educationLevel,
        main_genre: mainGenre,
        writing_goal: writingGoal
      });
      toast.success('Perfil atualizado com sucesso!');
      await refreshAuth();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Seu Perfil</h1>
          <p className="text-gray-400">Gerencie suas informações e preferências literárias.</p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isUnlimited ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-gray-500/20 text-gray-500'}`}>
            {isUnlimited ? <Crown size={24} /> : <Zap size={24} />}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Plano Atual</p>
            <p className="text-white font-bold capitalize">{plan}</p>
          </div>
          {role === 'admin' && (
            <div className="ml-4 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
              Admin
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Basic Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-[32px] p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="text-[#D4AF37]" size={20} />
              <h2 className="text-xl font-bold text-white">Dados Pessoais</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Nome de Exibição</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <input 
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-white/5 border border-white/5 p-4 pl-12 rounded-2xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Escolaridade</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                  <select 
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                    <option value="Graduação Incompleta">Graduação Incompleta</option>
                    <option value="Graduação Completa">Graduação Completa</option>
                    <option value="Pós-Graduação / Mestrado">Pós-Graduação / Mestrado</option>
                    <option value="Doutorado">Doutorado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white"
                  placeholder="Seu endereço completo"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 rounded-[32px] p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Book className="text-[#D4AF37]" size={20} />
              <h2 className="text-xl font-bold text-white">Preferências Literárias</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Gênero Principal</label>
                <select 
                  value={mainGenre}
                  onChange={(e) => setMainGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Ficção">Ficção</option>
                  <option value="Não-Ficção">Não-Ficção</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Poesia">Poesia</option>
                  <option value="Acadêmico">Acadêmico</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Objetivo Atual</label>
                <select 
                  value={writingGoal}
                  onChange={(e) => setWritingGoal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#D4AF37]/50 text-white appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Escrever meu primeiro livro">Escrever meu primeiro livro</option>
                  <option value="Publicar na Amazon KDP">Publicar na Amazon KDP</option>
                  <option value="Melhorar minha produtividade">Melhorar minha produtividade</option>
                  <option value="Gerenciar meus clientes literários">Gerenciar meus clientes literários</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Status */}
        <div className="space-y-6">
          <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-[32px] p-8 space-y-6 sticky top-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto text-[#D4AF37]">
                <User size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{displayName || 'Escritor'}</h3>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#B8962E] transition-all disabled:opacity-50 shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Alterações
              </button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <ShieldCheck size={12} className="text-[#D4AF37]" /> Dados sincronizados com Supabase
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
