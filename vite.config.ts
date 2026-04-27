import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $state: resolve(__dirname, 'src/state'),
      $types: resolve(__dirname, 'src/types'),
    },
  },
  server: { port: 5173, host: true },
});
