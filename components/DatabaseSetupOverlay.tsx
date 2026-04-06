'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Copy, Check, Database, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export const DatabaseSetupOverlay = () => {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sql, setSql] = useState('');

  useEffect(() => {
    const handleError = (e: any) => {
      setShow(true);
    };

    window.addEventListener('supabase-schema-error', handleError);
    
    // Also check if we should show it based on a flag in session storage
    if (sessionStorage.getItem('SHOW_DB_SETUP') === 'true') {
      setShow(true);
    }

    // Fetch the SQL content
    fetch('/supabase_migration.sql')
      .then(res => res.text())
      .then(text => setSql(text))
      .catch(() => setSql('-- Erro ao carregar SQL. Por favor, verifique o arquivo supabase_migration.sql no repositório.'));

    return () => window.removeEventListener('supabase-schema-error', handleError);
  }, []);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectId = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1] || '';
  const dashboardUrl = projectId ? `https://supabase.com/dashboard/project/${projectId}/sql/new` : 'https://supabase.com/dashboard';

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success('SQL copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const [isChecking, setIsChecking] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const checkDatabase = async () => {
    setIsChecking(true);
    try {
      console.log('Oráculo: Iniciando verificação de estrutura...');
      
      // 1. Check connection
      const { data: connectionCheck, error: connectionError } = await supabase.from('profiles').select('id').limit(1);
      if (connectionError && connectionError.code !== 'PGRST116' && connectionError.code !== '42P01') {
        console.error('Erro de conexão:', connectionError);
        throw new Error(`Erro de conexão: ${connectionError.message} (${connectionError.code})`);
      }
      console.log('Oráculo: Conexão OK');

      // 2. Check profiles
      const { error: profileError } = await supabase.from('profiles').select('id').limit(1);
      if (profileError && profileError.code === '42P01') {
        throw new Error('Tabela "profiles" não encontrada. Execute o script SQL.');
      }
      console.log('Oráculo: Tabela "profiles" OK');

      // 3. Check books and user_id
      const { error: booksError } = await supabase.from('books').select('user_id').limit(1);
      if (booksError) {
        if (booksError.code === '42P01') throw new Error('Tabela "books" não encontrada. Execute o script SQL.');
        if (booksError.code === '42703') throw new Error('Coluna "user_id" não encontrada em "books". Execute o script SQL.');
        if (booksError.code !== 'PGRST116') throw booksError;
      }
      console.log('Oráculo: Tabela "books" e coluna "user_id" OK');

      // 4. Check clients and user_id
      const { error: clientsError } = await supabase.from('clients').select('user_id').limit(1);
      if (clientsError) {
        if (clientsError.code === '42P01') throw new Error('Tabela "clients" não encontrada. Execute o script SQL.');
        if (clientsError.code === '42703') throw new Error('Coluna "user_id" não encontrada em "clients". Execute o script SQL.');
        if (clientsError.code !== 'PGRST116') throw clientsError;
      }
      console.log('Oráculo: Tabela "clients" e coluna "user_id" OK');
      
      toast.success('Conexão e estrutura validadas com sucesso!');
      sessionStorage.removeItem('SHOW_DB_SETUP');
      setShow(false);
      window.location.reload();
    } catch (err: any) {
      console.error('Check failed:', err);
      toast.error(`Ainda há problemas na estrutura: ${err.message || 'Erro desconhecido'}`);
      setShowTroubleshooting(true);
    } finally {
      setIsChecking(false);
    }
  };

  const { isBypass, setBypass } = useAuth();

  const handleBypass = () => {
    setBypass(true);
    setShow(false);
    sessionStorage.removeItem('SHOW_DB_SETUP');
    toast.info('Modo de Teste (Bypass) ativado. Usando dados locais.');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
      >
        <div className="max-w-5xl w-full bg-[#0A0A0A] border border-[#D4AF37]/30 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_100px_rgba(212,175,55,0.1)] relative overflow-hidden flex flex-col max-h-[90vh]">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#D4AF37]/20">
                <Database className="w-8 h-8 text-[#D4AF37]" />
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Configuração do Banco de Dados Necessária
              </h2>
              
              <p className="text-gray-400 text-base mb-0 max-w-2xl">
                Detectamos que a estrutura das tabelas do Oráculo está desatualizada. 
                Recentemente renomeamos campos internos (como <code className="text-[#D4AF37]">owner_id</code> para <code className="text-[#D4AF37]">user_id</code>) para maior compatibilidade.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { step: '01', title: 'Acesse o Supabase', desc: 'Vá para o painel do seu projeto no Supabase.', link: dashboardUrl },
                  { step: '02', title: 'SQL Editor', desc: 'Clique em "SQL Editor" no menu lateral esquerdo.' },
                  { step: '03', title: 'Execute o Script', desc: 'Cole o código abaixo e clique em "Run".' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left flex flex-col h-full">
                    <span className="text-[#D4AF37] font-mono text-sm mb-2 block">{item.step}</span>
                    <h4 className="text-white font-bold mb-1">{item.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">{item.desc}</p>
                    {item.link && (
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-white text-xs font-bold transition-colors mt-auto"
                      >
                        ABRIR SUPABASE <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="w-full bg-black border border-white/10 rounded-3xl overflow-hidden group">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-2 text-xs font-mono text-gray-500 uppercase tracking-widest">supabase_migration.sql</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-bold text-[#D4AF37] hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'COPIADO' : 'COPIAR SQL'}
                  </button>
                </div>
                <div className="p-6 max-h-64 overflow-y-auto text-left font-mono text-xs text-gray-400 custom-scrollbar bg-[#050505]">
                  <pre>{sql}</pre>
                </div>
              </div>

              {showTroubleshooting && (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                  <h4 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Solução de Problemas
                  </h4>
                  <ul className="space-y-3 text-sm text-gray-400 list-disc pl-5">
                    <li>Verifique se você clicou em <strong>Run</strong> após colar o código no Supabase.</li>
                    <li>Certifique-se de que não houve erros no console do Supabase (abaixo do editor SQL).</li>
                    <li>Se o erro persistir, tente atualizar a página do Supabase e executar o script novamente.</li>
                    <li>
                      <strong>Importante:</strong> Verifique se o seu projeto no Supabase é o mesmo que está configurado no app: 
                      <br/> 
                      <code className="text-[#D4AF37] break-all bg-white/5 px-2 py-1 rounded mt-1 inline-block">{supabaseUrl}</code>
                    </li>
                    {supabaseUrl.includes('nmlhktkxdsjomjocyzjh') && (
                      <li className="text-yellow-500 font-bold">
                        Atenção: Você está usando a URL de FALLBACK. Se você criou seu próprio projeto, certifique-se de configurar as variáveis de ambiente no painel de configurações.
                      </li>
                    )}
                  </ul>

                  <div className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest">
                      <ShieldAlert size={14} />
                      <span>Comando de Emergência (Forçar Colunas)</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Se o script principal falhar por qualquer motivo, execute este comando simplificado para forçar a criação das colunas necessárias:
                    </p>
                    <div className="relative group">
                      <pre className="bg-black p-3 rounded-xl text-[10px] font-mono text-yellow-500/70 overflow-x-auto border border-white/5">
                        {`-- FORÇAR CRIAÇÃO DE COLUNAS
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
COMMIT;`}
                      </pre>
                      <button 
                        onClick={() => {
                          const emergencySql = `-- FORÇAR CRIAÇÃO DE COLUNAS
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
COMMIT;`;
                          navigator.clipboard.writeText(emergencySql);
                          toast.success('Comando de emergência copiado!');
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={checkDatabase}
                    disabled={isChecking}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 border border-white/10"
                  >
                    {isChecking ? <Check className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    Verificar Estrutura
                  </button>
                  <button
                    onClick={() => {
                      setShow(false);
                      sessionStorage.removeItem('SHOW_DB_SETUP');
                      window.location.reload();
                    }}
                    className="flex-1 sm:flex-none bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                  >
                    Já executei o script
                  </button>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleBypass}
                    className="text-red-500/60 hover:text-red-500 text-xs font-bold transition-all uppercase tracking-widest"
                  >
                    Ignorar e usar Modo de Teste
                  </button>
                  <div className="flex items-center gap-2 text-yellow-500/60 text-[10px] uppercase tracking-widest font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    O Oráculo não funcionará sem as tabelas.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
