import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },

  server: {
    /**
     * Proxy de desenvolvimento: redireciona requisições do front-end que
     * começam com /api para o servidor Express (porta 3000).
     *
     * Benefício: o browser enxerga tudo na mesma origem (localhost:5173),
     * eliminando a necessidade de configurar CORS para o ambiente de dev.
     *
     * Exemplo: fetch('/api/hello') → http://localhost:3000/api/hello
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

