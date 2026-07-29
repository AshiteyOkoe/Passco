import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.png',
        'images/icons/icon-192x192.png',
        'images/icons/icon-512x512.png',
      ],
      manifest: {
        name: 'Passco - Self-Examination Platform',
        short_name: 'Passco',
        description: 'Take quizzes, mock tests, and examinations across 8 subjects — Mathematics, Science, English, and more.',
        theme_color: '#1e3a5f',
        background_color: '#1e3a5f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'examination'],
        icons: [
          { src: '/images/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
          { src: '/images/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/images/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/images/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/images/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/images/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/images/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: '/images/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/images/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globIgnores: ['**/my.png'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
