/**
 * Erro HTTP tipado.
 * Permite que os controllers lancem erros com um código de status, deixando a
 * formatação da resposta centralizada no middleware `errorHandler`.
 * @module utils/httpError
 */

'use strict';

/**
 * Erro com código HTTP associado.
 *
 * @example
 * throw new HttpError(404, 'Atleta não encontrado.');
 */
class HttpError extends Error {
  /**
   * @param {number} statusCode - Código HTTP (ex: 400, 403, 404).
   * @param {string} message - Mensagem legível para o cliente.
   */
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

module.exports = { HttpError };
