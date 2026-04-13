import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy per il backend locale durante lo sviluppo
    // Quando avvierete il backend Node.js sulla porta 3001,
    // tutte le chiamate a /api/* verranno inoltrate automaticamente
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
