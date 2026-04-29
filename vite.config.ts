import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

interface PackageJson {
  version: string;
}
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as PackageJson;

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/192.png', 'icons/512.png', 'icons/maskable-512.png', 'logo.png'],
      manifest: {
        name: 'Calorie',
        short_name: 'Calorie',
        lang: 'uk',
        theme_color: '#4caf50',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $state: resolve(__dirname, 'src/state'),
      $types: resolve(__dirname, 'src/types'),
    },
  },
  server: { port: 5173, host: true },
});
