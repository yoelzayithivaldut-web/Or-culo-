import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// Hardcoded credentials - will work even without env variables
const FALLBACK_URL = 'https://nmlhktkxdsjomjocyzjh.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhrdGt4ZHNqb21qb2N5empoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDUyMzAsImV4cCI6MjA5MDQ4MTIzMH0.c1T619iv1uWuqQ6Eh3S8TdDUKpFg_lRQ5sr7Pk55GwQ';
const FALLBACK_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhrdGt4ZHNqb21qb2N5empoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDUyMzAsImV4cCI6MjA5MDQ4MTIzMH0.c1T619iv1uWuqQ6Eh3S8TdDUKpFg_lRQ5sr7Pk55GwQ';

const getSupabaseConfig = () => {
  // Get environment variables with fallbacks
  let envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let envPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  // Use hardcoded fallbacks if env vars are missing or empty
  const url = (envUrl && envUrl.trim() !== '') ? envUrl : FALLBACK_URL;
  const key = (envKey && envKey.trim() !== '') ? envKey : FALLBACK_KEY;
  const publishableKey = (envPublishableKey && envPublishableKey.trim() !== '') ? envPublishableKey : FALLBACK_PUBLISHABLE_KEY;

  return { url, key, publishableKey };
};

const { url: supabaseUrl, key: supabaseAnonKey, publishableKey: supabasePublishableKey } = getSupabaseConfig();

// Validation: Check if the URL is a valid Supabase URL format
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co') || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  isValidUrl(supabaseUrl) &&
  !supabaseUrl.includes('placeholder')
);

// -----------------------------------------------------------------------------
// CLIENT INITIALIZATION
// -----------------------------------------------------------------------------

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Debug Logging
if (process.env.NODE_ENV === 'development') {
  const isKeySuspicious = supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ');
  
  if (isKeySuspicious) {
    console.warn('Oráculo: A chave Supabase Anon Key parece estar em um formato incorreto. Chaves padrão começam com "eyJ".');
  }

  console.log('Oráculo: Supabase initialized', {
    source: supabaseUrl === FALLBACK_URL ? 'FALLBACK' : 'ENV/LOCAL',
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl,
    keyFormat: isKeySuspicious ? 'SUSPICIOUS' : 'OK'
  });
}
