import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/server/**', '**/node_modules/**']
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    // Allow access from your ngrok public URL
    allowedHosts: ['senary-helen-subjunior.ngrok-free.dev', '.ngrok-free.dev', '.ngrok.app'],
    // Proxy API to backend so one ngrok tunnel works for both frontend and export
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})

