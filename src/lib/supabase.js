import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksLikePlaceholderKey =
  !supabaseAnonKey ||
  supabaseAnonKey === 'YOUR_SUPABASE_ANON_PUBLIC_KEY' ||
  supabaseAnonKey.startsWith('YOUR_');

if (supabaseAnonKey?.startsWith('sb_secret_')) {
  throw new Error(
    'Invalid Supabase key for browser: use the public anon key in VITE_SUPABASE_ANON_KEY.'
  );
}

if (looksLikePlaceholderKey) {
  console.error(
    '⚠️ Supabase anon key inválida/placeholder. Atualize VITE_SUPABASE_ANON_KEY no arquivo .env com a "anon public key" do seu projeto no Supabase.'
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Supabase não configurado! Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
