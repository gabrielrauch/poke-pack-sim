import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'pack-sim',
        short_name: 'pack-sim',
        start_url: '/',
        display: 'standalone',
        background_color: '#15123a',
        theme_color: '#15123a',
        lang: 'pt-BR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/manifest/],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three'
          return undefined
        },
      },
    },
  },
})
