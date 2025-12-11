import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: false,
    allowedHosts: [
      'b2c7f0b62c5e.ngrok-free.app'
    ]
  }
})
