/**
 * Cliente HTTP central do front-end.
 * Encapsula todas as chamadas à API Express: anexa o JWT (Bearer) automaticamente,
 * padroniza o parsing/erros e trata 401 (sessão inválida) de forma centralizada.
 *
 * O front não fala mais diretamente com o Supabase — tudo passa por aqui.
 * @module lib/api
 */

/**
 * Base da API. O padrão `/api` usa o proxy de dev do Vite (mesma origem, sem CORS).
 * Em produção, defina VITE_API_URL com a URL absoluta do servidor.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Chave usada para persistir o token de acesso no localStorage. */
const TOKEN_KEY = 'scoutiq_token';

/**
 * Erro de API com o status HTTP anexado, para que o chamador possa reagir
 * (ex: diferenciar 403 de 404).
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Mensagem de erro legível.
   * @param {number} status - Código HTTP da resposta.
   */
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** @returns {string|null} O token de acesso atual, se houver. */
export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persiste (ou remove) o token de acesso.
 * @param {string|null} token - Token a salvar; `null`/vazio remove.
 */
export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ambiente sem localStorage */
  }
}

/** Remove o token de acesso (logout local). */
export function clearToken() {
  setToken(null);
}

/**
 * Executa uma requisição à API.
 *
 * Anexa `Authorization: Bearer <token>` quando há token, serializa o corpo como
 * JSON e converte respostas de erro em {@link ApiError}. Em 401, limpa o token e
 * dispara o evento `scoutiq:unauthorized` (o AuthContext escuta para derrubar a sessão).
 *
 * @param {string} method - Método HTTP ('GET', 'POST', ...).
 * @param {string} path - Caminho relativo à base (ex: '/athletes').
 * @param {Object} [body] - Corpo da requisição (será serializado em JSON).
 * @returns {Promise<any>} O JSON da resposta.
 * @throws {ApiError} Se a resposta não for 2xx.
 */
async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Erro de conexão com o servidor.', 0);
  }

  if (res.status === 401) {
    clearToken();
    try {
      window.dispatchEvent(new CustomEvent('scoutiq:unauthorized'));
    } catch { /* SSR/teste */ }
  }

  // 204 No Content ou corpo vazio
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Erro ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data;
}

/**
 * Helpers por verbo HTTP.
 * @type {{get:Function, post:Function, put:Function, patch:Function, del:Function}}
 */
export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

export default api;
