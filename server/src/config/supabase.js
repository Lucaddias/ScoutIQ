/**
 * Configuração e inicialização do cliente Supabase para o servidor Express.
 * Centraliza a instância do cliente para ser reutilizado nos controllers e services.
 * @module config/supabase
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (!env.supabaseUrl || !env.supabaseServiceKey) {
  throw new Error(
    '⚠️  Supabase não configurado! Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo server/.env'
  );
}

if (env.supabaseServiceKey.startsWith('sb_publishable_') || env.supabaseServiceKey.includes('anon')) {
  console.warn(
    '\n⚠️  AVISO DE CONFIGURAÇÃO:\n' +
    '   A variável SUPABASE_SERVICE_ROLE_KEY no arquivo server/.env está preenchida com a chave pública (anon).\n' +
    '   O servidor precisa da chave secreta "service_role" para ignorar o Row-Level Security (RLS).\n' +
    '   Sem ela, você receberá o erro: "new row violates row-level security policy".\n' +
    '   Pegue a chave secreta no painel do Supabase em: Project Settings > API > service_role secret.\n'
  );
}

/**
 * Instância do cliente Supabase para uso no servidor.
 *
 * Usa a chave **service_role**, que IGNORA o Row Level Security (RLS). Toda a regra
 * de acesso passa a ser responsabilidade do Express (middlewares verifyJWT/requireRole).
 *
 * ⚠️  Esta chave NUNCA pode chegar ao navegador — ela dá acesso total ao banco.
 * O front-end fala apenas com a API Express, nunca direto com o Supabase.
 *
 * `persistSession`/`autoRefreshToken` desligados: o servidor é stateless, não há
 * sessão de usuário do Supabase Auth para manter.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase };
