import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import type { Book, Client, Profile } from '@/types';

export type SupportedTable = 'books' | 'clients' | 'profiles';

interface UseSubscriptionOptions {
  table: SupportedTable;
  filterColumn: string;
  filterValue: string | number;
  autoSubscribe?: boolean;
}

interface UseSubscriptionReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isEmpty: boolean;
}

export function useSubscription<T extends Book | Client | Profile>(
  options: UseSubscriptionOptions
): UseSubscriptionReturn<T> {
  const { table, filterColumn, filterValue, autoSubscribe = true } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await supabaseService.getCollection(table, [
        { column: filterColumn, operator: '==', value: filterValue }
      ]);
      
      setData(result as T[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar dados'));
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [table, filterColumn, filterValue]);

  useEffect(() => {
    fetchData();
    
    if (!autoSubscribe) {
      return;
    }

    const channelName = `${table}-sub-${Math.random().toString(36).substr(2, 9)}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${filterColumn}=eq.${filterValue}`
        },
        async () => {
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filterColumn, filterValue, autoSubscribe, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isEmpty: data.length === 0
  };
}

export function useBooks(userId: string) {
  return useSubscription<Book>({
    table: 'books',
    filterColumn: 'user_id',
    filterValue: userId,
  });
}

export function useClients(userId: string) {
  return useSubscription<Client>({
    table: 'clients',
    filterColumn: 'user_id',
    filterValue: userId,
  });
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await supabaseService.getProfile(userId);
        setProfile(result as Profile | null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao buscar perfil'));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  return { profile, loading, error };
}