/**
 * Módulo de configuração de variáveis de ambiente.
 * Centraliza o acesso às variáveis de ambiente com valores padrão seguros,
 * evitando referências espalhadas a `process.env` pelo projeto.
 * @module config/env
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // Fallback para o .env local caso executado em outro contexto

/**
 * Configurações do servidor carregadas das variáveis de ambiente.
 * @type {Object}
 * @property {number} port - Porta onde o servidor irá escutar as requisições.
 * @property {string} nodeEnv - Ambiente de execução ('development' | 'production').
 * @property {string} clientUrl - URL do front-end permitida pelo CORS.
 * @property {string} supabaseUrl - URL do projeto Supabase (usado apenas como banco).
 * @property {string} supabaseServiceKey - Chave service_role (ignora RLS; só no servidor).
 * @property {string} jwtSecret - Segredo usado para assinar/verificar os JWTs (HS256).
 * @property {string} jwtExpiresIn - Tempo de expiração do token de acesso (ex: '7d').
 */
const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// ── Validação de segurança: JWT_SECRET ──────────────────────────────
// Sem um segredo forte, qualquer pessoa pode forjar tokens JWT válidos
// e se autenticar como qualquer usuário (incluindo admin).
if (!env.jwtSecret || env.jwtSecret.length < 12) {
  throw new Error(
    '⚠️  JWT_SECRET não definido ou muito curto (mínimo 12 caracteres)!\n' +
    '   Defina a variável JWT_SECRET no arquivo server/.env com um valor seguro.\n' +
    '   Exemplo: JWT_SECRET=uma-chave-secreta-longa-e-aleatoria-aqui'
  );
}

module.exports = env;
