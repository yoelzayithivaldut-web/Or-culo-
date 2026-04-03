'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Mail, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Calendar,
  UserPlus,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { toast } from 'sonner';

import { useAuth } from '@/components/AuthProvider';

export default function CRM() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', notes: '' });

  useEffect(() => {
    if (user) {
      const unsubscribe = supabaseService.subscribeToCollection(
        'clients',
        { column: 'user_id', value: user.id },
        (data) => {
          setClients(data);
          setLoading(false);
        }
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await supabaseService.addDocument('clients', {
        ...newClient,
        user_id: user.id
      });
      toast.success('Cliente cadastrado!');
      setShowModal(false);
      setNewClient({ name: '', email: '', notes: '' });
    } catch (error) {
      toast.error('Erro ao cadastrar.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseService.deleteDocument('clients', id);
      toast.success('Cliente removido.');
    } catch (error) {
      toast.error('Erro ao remover cliente.');
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Gestão de Clientes</h1>
          <p className="text-gray-400">Gerencie seus autores, editoras e parceiros de projeto.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 rounded-2xl font-bold hover:bg-[#B8962E] transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
        >
          <UserPlus className="w-5 h-5" />
          Novo Cliente
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 transition-all"
        />
      </div>

      <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Contato</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-gray-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] font-bold">
                        {client.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{client.name || 'Sem Nome'}</p>
                        <p className="text-gray-500 text-xs line-clamp-1">{client.notes || 'Sem notas'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Mail className="w-3 h-3" />
                        {client.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-3xl w-full max-w-lg relative z-10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Novo Cliente</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-widest">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-widest">E-mail</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient({...newClient, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-widest">Notas / Observações</label>
                  <textarea
                    value={newClient.notes}
                    onChange={e => setNewClient({...newClient, notes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-2xl focus:outline-none focus:border-[#D4AF37]/50 h-32 resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 text-gray-400 hover:text-white font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
