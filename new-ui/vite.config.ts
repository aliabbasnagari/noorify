import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:4533',
      '/api': 'http://localhost:4533',
      '/rest': 'http://localhost:4533',
      '/app': 'http://localhost:4533',
      // Proxy share sub-resources (streams, downloads, images, info JSON, m3u)
      // but NOT /share/{id} itself — that's handled by React Router → SharePlayer
      '^/share/(s|d|img)/': { target: 'http://localhost:4533', changeOrigin: true },
      '^/share/[^/]+/(info|m3u)$': { target: 'http://localhost:4533', changeOrigin: true },
    },
  },
})
