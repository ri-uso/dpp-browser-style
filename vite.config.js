import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: false,
    allowedHosts: [
      '70a8e749ee67.ngrok-free.app'
    ],
    // Proxy API calls to Vercel dev server when running locally
    // In production, /api routes are handled by Vercel serverless functions
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Only proxy when Vercel dev server is running
        // If not running, API calls will fail gracefully
      }
    }
  }
})
