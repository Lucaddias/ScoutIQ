/**
 * Ponto de entrada do servidor Express do ScoutIQ.
 * Responsável por carregar as variáveis de ambiente, importar a aplicação
 * configurada e iniciar o servidor na porta definida.
 *
 * Separar `index.js` (inicialização) de `app.js` (configuração) permite
 * que os testes importem `app` sem iniciar o servidor de verdade.
 *
 * @module index
 */

'use strict';

// Carrega as variáveis de ambiente ANTES de qualquer outro import
// para garantir que `process.env` já está populado quando os módulos carregam.
require('dotenv').config();

const app = require('./app');
const { port, nodeEnv } = require('./config/env');

/**
 * Inicia o servidor HTTP e exibe as informações de acesso no console.
 */
app.listen(port, () => {
  const divider = '─'.repeat(50);

  console.log('');
  console.log(divider);
  console.log('  🚀  ScoutIQ Express Server');
  console.log(divider);
  console.log(`  Ambiente  : ${nodeEnv}`);
  console.log(`  URL       : http://localhost:${port}`);
  console.log(`  API       : http://localhost:${port}/api`);
  console.log(`  Hello     : http://localhost:${port}/api/hello`);
  console.log(`  Status    : http://localhost:${port}/api/hello/status`);
  console.log(divider);
  console.log('');
});
