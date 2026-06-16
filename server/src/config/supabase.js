/**
 * Configuração e inicialização do cliente Supabase para o servidor Express.
 * Centraliza a instância do cliente para ser reutilizado nos controllers e services.
 * @module config/supabase
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error(
    '⚠️  Supabase não configurado! Preencha SUPABASE_URL e SUPABASE_ANON_KEY no arquivo server/.env'
  );
}

/**
 * Instância do cliente Supabase para uso no servidor.
 * Utiliza a chave anônima para operações normais.
 * Para operações administrativas (sem restrição de RLS), use SUPABASE_SERVICE_ROLE_KEY.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

module.exports = { supabase };
