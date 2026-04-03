import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const isBypass = () => typeof window !== 'undefined' && localStorage.getItem('ADMIN_BYPASS') === 'true';

// Helper to get/set mock data from localStorage
const getMockData = (table: string) => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`mock_${table}`);
  if (stored) return JSON.parse(stored);
  
  // Default data if none stored
  if (table === 'books') {
    return [
      { id: 'mock-1', title: 'O Enigma do Tempo', genre: 'Ficção Científica', author: 'Admin', user_id: 'admin-bypass-id', status: 'writing', content: 'Era uma vez...', language: 'pt-BR', cover_url: 'https://picsum.photos/seed/enigma/600/800', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'mock-2', title: 'A Jornada do Herói', genre: 'Aventura', author: 'Admin', user_id: 'admin-bypass-id', status: 'writing', content: 'O herói partiu...', language: 'pt-BR', cover_url: 'https://picsum.photos/seed/jornada/600/800', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }
  if (table === 'clients') {
    return [
      { id: 'client-1', name: 'João Silva', email: 'joao@exemplo.com', user_id: 'admin-bypass-id', created_at: new Date().toISOString() },
    ];
  }
  if (table === 'profiles') {
    return [
      { 
        id: 'admin-bypass-id', 
        email: 'admin@test.com', 
        display_name: 'Administrador de Teste', 
        onboarding_completed: true,
        role: 'admin',
        plan: 'premium',
        created_at: new Date().toISOString() 
      },
    ];
  }
  return [];
};

const saveMockData = (table: string, data: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`mock_${table}`, JSON.stringify(data));
  }
};

// Initialize mock data
let mockBooks = getMockData('books');
let mockClients = getMockData('clients');
let mockProfiles = getMockData('profiles');

const listeners: { [key: string]: { callback: (data: any[]) => void; filter: { column: string; value: any } }[] } = {};

const notifyListeners = (table: string) => {
  if (listeners[table]) {
    const allData: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockProfiles);
    listeners[table].forEach(({ callback, filter }) => {
      const filteredData = allData.filter(item => item[filter.column] === filter.value);
      callback([...filteredData]);
    });
  }
};

let profileCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let lastErrorToastTime = 0;
const TOAST_DEBOUNCE = 5000; // 5 seconds

export const supabaseService = {
  handleSchemaError(error: any, table: string) {
    const errorCode = error?.code;
    const errorMessage = error?.message || '';
    
    // Check if it's a schema error (42P01 = undefined_table, 42703 = undefined_column)
    const isSchemaError = errorCode === '42P01' || errorCode === '42703' || errorMessage.includes('relation') || errorMessage.includes('column');
    const isAuthError = errorCode === '401' || errorMessage.includes('JWT') || errorMessage.includes('apiKey');

    if (isAuthError) {
      console.error(`Oráculo: Erro de Autenticação com Supabase. Verifique sua chave API.`, error);
      if (Date.now() - lastErrorToastTime > TOAST_DEBOUNCE) {
        toast.error('Erro de conexão com Supabase. Verifique suas chaves API.');
        lastErrorToastTime = Date.now();
      }
      return;
    }

    console.error(`Oráculo: Erro na tabela "${table}":`, {
      code: errorCode,
      message: errorMessage,
      details: error?.details,
      hint: error?.hint
    });
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('SHOW_DB_SETUP', 'true');
      window.dispatchEvent(new CustomEvent('supabase-schema-error', { detail: { table, error } }));
    }
    
    if (Date.now() - lastErrorToastTime > TOAST_DEBOUNCE) {
      toast.error(`Estrutura do banco de dados em "${table}" desatualizada.`, {
        description: 'Por favor, execute o script SQL de migração no painel do Supabase.',
        duration: 10000,
      });
      lastErrorToastTime = Date.now();
    }
    throw new Error(`Estrutura do banco de dados em "${table}" desatualizada: ${errorMessage} (${errorCode})`);
  },

  async getDocument(table: string, id: string) {
    if (isBypass()) {
      const data: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockProfiles);
      return data.find(item => item.id === id) || null;
    }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, table);
      }
      console.error(`Error fetching document from ${table}:`, error);
      throw error;
    }
    return data;
  },

  async getCollection(table: string, filters: { column: string; operator: string; value: any }[] = []) {
    if (isBypass()) {
      let data: any[] = table === 'books' ? [...mockBooks] : (table === 'clients' ? [...mockClients] : [...mockProfiles]);
      filters.forEach(filter => {
        if (filter.operator === '==') {
          data = data.filter(item => item[filter.column] === filter.value);
        }
      });
      return data;
    }
    let query = supabase.from(table).select('*');

    filters.forEach(filter => {
      switch (filter.operator) {
        case '==':
          query = query.eq(filter.column, filter.value);
          break;
        case '!=':
          query = query.neq(filter.column, filter.value);
          break;
        case '>':
          query = query.gt(filter.column, filter.value);
          break;
        case '<':
          query = query.lt(filter.column, filter.value);
          break;
      }
    });

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, table);
      }
      console.error(`Error fetching collection from ${table}:`, error);
      throw error;
    }
    return data;
  },

  async addDocument(table: string, data: any) {
    if (isBypass()) {
      const id = `mock-id-${Math.random().toString(36).substr(2, 9)}`;
      const newItem = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (table === 'books') {
        mockBooks.push(newItem);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients.push(newItem);
        saveMockData('clients', mockClients);
      } else if (table === 'profiles') {
        mockProfiles.push(newItem);
        saveMockData('profiles', mockProfiles);
      }
      notifyListeners(table);
      return id;
    }
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([{ ...data, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, table);
      }
      console.error(`Error adding document to ${table}:`, error);
      toast.error(`Erro ao salvar em ${table}: ${error.message} (${error.code})`);
      throw new Error(`Erro ao adicionar documento em ${table}: ${error.message}`);
    }

    if (!insertedData) {
      throw new Error(`Erro ao adicionar documento em ${table}: Nenhum dado retornado`);
    }

    return insertedData.id;
  },

  async saveBook(bookData: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !isBypass()) throw new Error('Usuário não autenticado');

    const payload = {
      ...bookData,
      user_id: user?.id || 'admin-bypass-id',
      updated_at: new Date().toISOString()
    };

    if (bookData.id) {
      return this.updateDocument('books', bookData.id, payload);
    } else {
      return this.addDocument('books', payload);
    }
  },

  async saveUser(userData: any) {
    if (isBypass()) {
      const id = 'admin-bypass-id';
      const existingIndex = mockProfiles.findIndex(u => u.id === id);
      if (existingIndex >= 0) {
        mockProfiles[existingIndex] = { ...mockProfiles[existingIndex], ...userData, updated_at: new Date().toISOString() };
      } else {
        mockProfiles.push({ id, email: 'admin@test.com', ...userData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      saveMockData('profiles', mockProfiles);
      notifyListeners('profiles');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const id = user.id;
    const email = user.email;
    
    console.log('Oráculo: Saving user data:', { id, email, ...userData });
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id,
        email,
        ...userData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, 'profiles');
      }
      console.error('Error saving user to Supabase:', {
        error,
        userId: id,
        email,
        data: userData
      });
      throw new Error(`Erro ao salvar dados do usuário: ${error.message} (${error.code})`);
    }

    // Clear cache after successful update
    this.clearProfileCache(id);
  },

  async getProfile(userId?: string) {
    if (isBypass()) {
      const id = 'admin-bypass-id';
      return mockProfiles.find(u => u.id === id) || {
        id: 'admin-bypass-id',
        email: 'admin@test.com',
        display_name: 'Administrador de Teste',
        onboarding_completed: true,
        role: 'admin',
        plan: 'premium',
        created_at: new Date().toISOString()
      };
    }

    let id = userId;
    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      id = user.id;
    }

    // Check cache
    const cached = profileCache[id];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, 'profiles');
      }
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        throw error;
      }
    }

    // Update cache
    if (data) {
      profileCache[id] = { data, timestamp: Date.now() };
    }
    
    return data;
  },

  clearProfileCache(userId?: string) {
    if (userId) {
      delete profileCache[userId];
    } else {
      profileCache = {};
    }
  },

  async updateDocument(table: string, id: string, data: any) {
    if (isBypass()) {
      if (table === 'books') {
        mockBooks = mockBooks.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients = mockClients.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('clients', mockClients);
      } else if (table === 'profiles') {
        mockProfiles = mockProfiles.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('profiles', mockProfiles);
      }
      notifyListeners(table);
      return;
    }
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, table);
      }
      console.error(`Error updating document in ${table}:`, error);
      throw error;
    }
  },

  async deleteDocument(table: string, id: string) {
    if (isBypass()) {
      if (table === 'books') {
        mockBooks = mockBooks.filter(item => item.id !== id);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients = mockClients.filter(item => item.id !== id);
        saveMockData('clients', mockClients);
      } else if (table === 'profiles') {
        mockProfiles = mockProfiles.filter(item => item.id !== id);
        saveMockData('profiles', mockProfiles);
      }
      notifyListeners(table);
      return;
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
        this.handleSchemaError(error, table);
      }
      console.error(`Error deleting document from ${table}:`, error);
      throw error;
    }
  },

  subscribeToCollection(table: string, filter: { column: string; value: any }, callback: (data: any[]) => void) {
    if (isBypass()) {
      if (!listeners[table]) listeners[table] = [];
      listeners[table].push({ callback, filter });
      
      const allData: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockProfiles);
      callback(allData.filter(item => item[filter.column] === filter.value));
      
      return () => {
        listeners[table] = listeners[table].filter(l => l.callback !== callback);
      };
    }

    // Initial fetch
    supabase
      .from(table)
      .select('*')
      .eq(filter.column, filter.value)
      .then(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703') {
            this.handleSchemaError(error, table);
          }
          console.error(`Error in initial fetch for ${table}:`, error);
          return;
        }
        if (data) callback(data);
      });

    const channel = supabase
      .channel(`${table}-changes-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${filter.column}=eq.${filter.value}`
        },
        async () => {
          // Re-fetch the collection to get the latest state
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq(filter.column, filter.value);
          if (data) callback(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
