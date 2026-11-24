/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // Everything with these prefixes is copied into the browser bundle, so never put a secret
  // (e.g. SPOTIFY_CLIENT_SECRET) in .env. PKCE needs no secret.
  envPrefix: ['VITE_', 'SPOTIFY_'],
  // Spotify does not accept `localhost` redirect URIs, so serve on 127.0.0.1.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
