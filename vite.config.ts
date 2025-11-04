// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: '/',
  server: { host: true },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm', '**/*.ktx2', '**/*.bin'],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 5000, // solo silencia el aviso, no tocamos el particionado
    // sourcemap: true, // si necesitas depurar, actívalo luego
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
