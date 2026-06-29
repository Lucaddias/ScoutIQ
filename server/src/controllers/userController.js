/**
 * Controller de Usuários (perfis).
 * Listagem e alteração de papéis (roles), substituindo o que antes era feito
 * direto pelo front via Supabase (`setUserRole`/`upgradeRole`).
 * @module controllers/userController
 */

'use strict';

const { supabase } = require('../config/supabase');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { HttpError } = require('../utils/httpError');

/** Papéis válidos (espelha o CHECK constraint da coluna profiles.role). */
const VALID_ROLES = ['user', 'scout', 'admin'];

/**
 * Lista todos os perfis (sem expor password_hash).
 * **Endpoint:** `GET /api/users` (protegido — admin)
 */
async function getAll(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', count: data.length, users: data });
}

/**
 * Altera o papel de um usuário qualquer.
 * **Endpoint:** `PATCH /api/users/:id/role` (protegido — admin)
 * **Body:** `{ role: 'user' | 'scout' | 'admin' }`
 */
async function setRole(req, res) {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) throw new HttpError(400, 'Papel inválido.');

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', req.params.id)
    .select('id, email, name, role')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Usuário não encontrado.');
  res.status(200).json({ status: 'success', user: data });
}

/**
 * Auto-upgrade do próprio usuário de `user` para `scout`.
 * **Endpoint:** `PATCH /api/users/me/upgrade` (protegido — qualquer autenticado)
 *
 * Só promove quem está como `user` (não escala a admin nem rebaixa). Atua
 * exclusivamente sobre o próprio id vindo do JWT.
 */
async function upgradeMe(req, res) {
  const { data: current, error: readErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', req.user.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!current) throw new HttpError(404, 'Usuário não encontrado.');
  if (current.role !== 'user') throw new HttpError(403, 'Apenas usuários comuns podem se tornar scout.');

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'scout' })
    .eq('id', req.user.id)
    .select('id, email, name, role')
    .single();
  if (error) throw new Error(error.message);
  res.status(200).json({ status: 'success', user: data });
}

module.exports = {
  getAll: asyncHandler(getAll),
  setRole: asyncHandler(setRole),
  upgradeMe: asyncHandler(upgradeMe),
};
