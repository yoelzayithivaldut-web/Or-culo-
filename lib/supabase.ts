import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// Hardcoded credentials provided for the project.
const FALLBACK_URL = 'https://nmlhktkxdsjomjocyzjh.supabase.co';
const FALLBACK_KEY = 'sb_publishable_XSQj_4slNyjsfeE5e2jxrA_kdJiF_z9';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_XSQj_4slNyjsfeE5e2jxrA_kdJiF_z9';

const getSupabaseConfig = () => {
  // 1. Check Environment Variables (Primary)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
                 process.env.VITE_SUPABASE_ANON_KEY;
  const envPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
                            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  
  // 2. Check Local Storage (Debug/Manual Override)
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_URL') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_ANON_KEY') : null;

  // 3. Resolve Final Values
  const url = envUrl || localUrl || FALLBACK_URL;
  const key = envKey || localKey || FALLBACK_KEY;
  const publishableKey = envPublishableKey || FALLBACK_PUBLISHABLE_KEY;

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
