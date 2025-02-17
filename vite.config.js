import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const getBackendPort = () => {
  return import.meta.env.VITE_BACKEND_PORT || 5000
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,  // Changed from 8080
    proxy: {
      '/api/**': {
        target: 'http://localhost:8321',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/media/**': {
        target: 'http://localhost:8321',
        changeOrigin: true,
        secure: false
      }
    }
  }
}) 