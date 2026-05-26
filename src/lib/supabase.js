/**
 * Configuração e inicialização do cliente Supabase para persistência e autenticação.
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js';

/**
 * URL do projeto Supabase obtida das variáveis de ambiente.
 * @type {string|undefined}
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Chave pública anônima do Supabase obtida das variáveis de ambiente.
 * @type {string|undefined}
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validação auxiliar para detectar se as chaves são placeholders padrão.
 * @type {boolean}
 */
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

/**
 * Instância cliente configurada do Supabase para realizar requisições de banco de dados e Auth.
 * @type {Object}
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

