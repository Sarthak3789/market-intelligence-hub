import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/signup': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/portfolio': 'http://127.0.0.1:8000',
      '/live_prices': 'http://127.0.0.1:8000',
      '/verify': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
