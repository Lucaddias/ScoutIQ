/**
 * Controller de autenticação própria (JWT + bcrypt).
 * Substitui o Supabase Auth: as credenciais ficam na tabela `profiles`
 * (`password_hash`) e o servidor emite/verifica os tokens.
 * @module controllers/authController
 */

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { HttpError } = require('../utils/httpError');

/** Custo do bcrypt — 10 é o equilíbrio padrão entre segurança e performance. */
const SALT_ROUNDS = 10;

/** O bcrypt ignora bytes além de 72; rejeitamos antes para não dar falsa segurança. */
const MAX_PASSWORD = 72;

/** Regex simples para validação de formato de e-mail. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gera o JWT de acesso para um perfil.
 * O `sub` carrega o id; `email` e `role` evitam consultas extras nas rotas protegidas.
 *
 * @param {{id: string, email: string, role: string}} profile - Perfil autenticado.
 * @returns {string} Token JWT assinado (HS256).
 */
function signToken(profile) {
  return jwt.sign(
    { sub: profile.id, email: profile.email, role: profile.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

/**
 * Remove o `password_hash` antes de devolver o perfil ao cliente.
 *
 * @param {Object} profile - Registro bruto da tabela profiles.
 * @returns {{id: string, email: string, name: string, role: string}} Perfil público.
 */
function toPublic(profile) {
  return { id: profile.id, email: profile.email, name: profile.name, role: profile.role };
}

/**
 * Cadastra um novo usuário.
 *
 * **Endpoint:** `POST /api/auth/register`
 * **Body:** `{ email, password, name? }`
 *
 * A unicidade do e-mail é garantida pela constraint do banco (sem checagem prévia,
 * evitando race condition): o código 23505 vira um 409 limpo. A role é sempre 'user'
 * (nunca vem do cliente), evitando escalonamento de privilégio.
 */
async function register(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const rawName = String(req.body.name || '').trim();

  if (!EMAIL_REGEX.test(email)) throw new HttpError(400, 'E-mail inválido.');
  if (password.length < 6) throw new HttpError(400, 'A senha deve ter ao menos 6 caracteres.');
  if (password.length > MAX_PASSWORD) throw new HttpError(400, `A senha deve ter no máximo ${MAX_PASSWORD} caracteres.`);

  const name = rawName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({ email, name, role: 'user', password_hash: passwordHash })
    .select('id, email, name, role')
    .single();

  if (error?.code === '23505') throw new HttpError(409, 'Este e-mail já está cadastrado.');
  if (error) throw new Error(`Erro ao criar perfil: ${error.message}`);

  const token = signToken(profile);
  res.status(201).json({ status: 'success', token, user: toPublic(profile) });
}

/**
 * Autentica um usuário e emite um JWT.
 *
 * **Endpoint:** `POST /api/auth/login`
 * **Body:** `{ email, password }`
 *
 * Mensagem de erro genérica (401) para e-mail inexistente e senha errada,
 * evitando revelar quais e-mails estão cadastrados.
 */
async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) throw new HttpError(400, 'Informe e-mail e senha.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, password_hash')
    .eq('email', email)
    .maybeSingle();

  if (!profile || !profile.password_hash) throw new HttpError(401, 'E-mail ou senha incorretos.');

  const ok = await bcrypt.compare(password, profile.password_hash);
  if (!ok) throw new HttpError(401, 'E-mail ou senha incorretos.');

  const token = signToken(profile);
  res.status(200).json({ status: 'success', token, user: toPublic(profile) });
}

/**
 * Retorna os dados do usuário autenticado.
 *
 * **Endpoint:** `GET /api/auth/me` (protegido por verifyJWT)
 *
 * Relê o perfil no banco para refletir mudanças de role/nome feitas após a emissão
 * do token (o JWT carrega um snapshot que pode estar defasado).
 */
async function getMe(req, res) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', req.user.id)
    .maybeSingle();

  if (!profile) throw new HttpError(404, 'Usuário não encontrado.');
  res.status(200).json({ status: 'success', user: toPublic(profile) });
}

module.exports = {
  register: asyncHandler(register),
  login: asyncHandler(login),
  getMe: asyncHandler(getMe),
};
