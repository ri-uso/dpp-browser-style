import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'webmanifest-mime',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json')
          }
          next()
        })
      }
    }
  ],
  server: {
    host: false,
    allowedHosts: [
      '*.ngrok-free.app',
      '3992-95-230-250-178.ngrok-free.app'
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
