import '@testing-library/jest-dom';

// Polyfill localStorage para ambientes jsdom que não o fornecem (Node 22+).
// Sem isso, os testes de AuthContext falham com:
//   TypeError: Cannot read properties of undefined (reading 'clear')
//
// O AuthContext.logout() usa Object.keys(window.localStorage) para iterar
// chaves armazenadas, então o polyfill precisa expor as chaves do store como
// propriedades enumeráveis do objeto. Usamos um Proxy para isso.
if (typeof globalThis.localStorage === 'undefined' || typeof window.localStorage === 'undefined') {
  const store = new Map();
  const handler = {
    get(_, prop) {
      switch (prop) {
        case 'getItem':    return (key) => store.has(key) ? store.get(key) : null;
        case 'setItem':    return (key, val) => { store.set(key, String(val)); };
        case 'removeItem': return (key) => { store.delete(key); };
        case 'clear':      return () => { store.clear(); };
        case 'key':        return (i) => [...store.keys()][i] ?? null;
        case 'length':     return store.size;
        default:           return store.has(prop) ? store.get(prop) : undefined;
      }
    },
    ownKeys() { return [...store.keys()]; },
    has(_, prop) { return store.has(prop); },
    getOwnPropertyDescriptor(_, prop) {
      if (store.has(prop)) return { configurable: true, enumerable: true, value: store.get(prop) };
      return undefined;
    },
  };
  const impl = new Proxy({}, handler);
  globalThis.localStorage = impl;
  if (typeof window !== 'undefined') window.localStorage = impl;
}
