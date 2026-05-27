/**
 * Middleware de log de requisições HTTP.
 * Registra no console o método, a URL, o código de status e o tempo
 * de resposta de cada requisição recebida pelo servidor.
 * @module middlewares/logger
 */

'use strict';

/**
 * Middleware Express que intercepta toda requisição e imprime um log formatado
 * após o envio da resposta (usando o evento 'finish' do objeto `res`).
 *
 * Formato do log:
 * ```
 * [2026-05-26T22:15:00.000Z] GET /api/hello → 200 (12ms)
 * ```
 *
 * @param {import('express').Request}  req  - Objeto de requisição do Express.
 * @param {import('express').Response} res  - Objeto de resposta do Express.
 * @param {import('express').NextFunction} next - Função para passar ao próximo middleware.
 * @returns {void}
 */
function logger(req, res, next) {
  const startTime = Date.now();

  // O evento 'finish' é emitido quando a resposta foi enviada ao cliente
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const method = req.method.padEnd(6);
    const url = req.originalUrl;
    const status = res.statusCode;

    // Colorização no terminal de acordo com o status HTTP
    const statusColor =
      status >= 500 ? '\x1b[31m' : // Vermelho para erros do servidor
      status >= 400 ? '\x1b[33m' : // Amarelo para erros do cliente
      status >= 300 ? '\x1b[36m' : // Ciano para redirecionamentos
                      '\x1b[32m';  // Verde para sucesso
    const reset = '\x1b[0m';

    console.log(
      `[${timestamp}] ${method} ${url} ${statusColor}→ ${status}${reset} (${duration}ms)`
    );
  });

  next();
}

module.exports = logger;
