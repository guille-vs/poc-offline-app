import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'MineTrace Drill — PoC Offline',
        short_name: 'MineTrace PoC',
        description:
          'Prueba de concepto: PWA offline-first para el técnico de campo (MineTrace Drill).',
        lang: 'es',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache del app shell: todo lo que la app necesita para arrancar offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico}'],
        // Navegación SPA offline: cualquier ruta cae al index.html.
        navigateFallback: '/index.html',
        // Las llamadas de sync NUNCA deben caer en el fallback HTML.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // El SW en dev NO precachea el grafo dinámico de Vite (node_modules/.vite,
        // /@id/, /@fs/, HMR) — el testing real de offline se hace con build + preview.
        // Mantenerlo desactivado evita que un SW viejo rompa el HMR.
        enabled: false,
      },
    }),
  ],
})
