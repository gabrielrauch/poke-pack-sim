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
        // O chunk do three (~600 kB) fica fora do precache: baixa ao entrar em /abrir e vai para o cache de runtime.
        globIgnores: ['**/three-*.js'],
        navigateFallbackDenylist: [/^\/api\//, /^\/manifest/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/three-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'three', expiration: { maxEntries: 2 } },
          },
          {
            // Imagens das cartas: o Worker já manda 7 dias; aqui 30 dias e teto de entradas (§7.2).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/img/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-img',
              expiration: {
                maxEntries: 900,
                maxAgeSeconds: 30 * 24 * 3600,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Álbum e histórico offline: catálogo, coleção, perfil e páginas do histórico (só GET; POST nunca).
            urlPattern: ({ url }) =>
              /^\/api\/(catalog|collection)\//.test(url.pathname) ||
              url.pathname === '/api/me' ||
              url.pathname === '/api/packs',
            method: 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-data',
              expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
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
