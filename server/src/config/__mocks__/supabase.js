/**
 * Mock manual do cliente Supabase para os testes (Jest).
 * Reproduz a API fluente usada pelos controllers
 * (`from().select().eq().maybeSingle()`, `insert().select().single()`, `rpc()`)
 * sem tocar a rede. Os testes empilham os resultados esperados via `_push`.
 * @module config/__mocks__/supabase
 */

'use strict';

/** Fila FIFO de resultados que as operações terminais vão consumir. */
const _queue = [];

/** Empilha um resultado `{ data, error }` que a próxima operação retornará. */
function _push(result) {
  _queue.push(result);
}

/** Limpa a fila entre testes. */
function _reset() {
  _queue.length = 0;
}

/** Consome o próximo resultado (padrão: vazio sem erro). */
function _next() {
  return _queue.length ? _queue.shift() : { data: null, error: null };
}

/**
 * Constrói um query builder encadeável. Métodos intermediários retornam o próprio
 * builder; os terminais (`single`/`maybeSingle`) e o `await` direto consomem a fila.
 */
function makeBuilder() {
  const b = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'in', 'limit', 'range']) {
    b[m] = () => b;
  }
  b.single = () => Promise.resolve(_next());
  b.maybeSingle = () => Promise.resolve(_next());
  // Torna o builder "awaitável" (ex.: `await supabase.from().delete().eq()`).
  b.then = (resolve, reject) => Promise.resolve(_next()).then(resolve, reject);
  return b;
}

const supabase = {
  from: () => makeBuilder(),
  rpc: () => Promise.resolve(_next()),
};

module.exports = { supabase, _push, _reset, _next };
