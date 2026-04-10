import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        transcribe: resolve(__dirname, 'transcribe.html'),
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/server/**', '**/node_modules/**']
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    // Allow access from your ngrok public URL
    allowedHosts: true,
    // Proxy API to backend so one ngrok tunnel works for both frontend and export
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        timeout: 600000,  // 10 min for video export
        proxyTimeout: 600000
      },
      '/assets': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})

