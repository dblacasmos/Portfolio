import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

// Normaliza para windows/unix
const has = (id: string, needle: string) => id.replace(/\\/g, '/').includes(needle)

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: '/',
  server: { host: true },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm', '**/*.ktx2', '**/*.bin'],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // three+gltf se pasa del umbral por defecto
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!has(id, 'node_modules')) return undefined
          if (has(id, 'node_modules/three/')) return 'three'
          if (has(id, '@react-three/fiber') || has(id, '@react-three/drei')) return 'r3f'
          if (has(id, '/howler/')) return 'howler'
          if (
            has(id, 'three-mesh-bvh') ||
            has(id, 'three-stdlib') ||
            has(id, 'examples/jsm/utils/BufferGeometryUtils')
          ) return 'three-utils'
          return 'vendor'
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (/\.(glb|gltf|bin|ktx2|wasm)$/i.test(name)) return 'assets/models/[name]-[hash][extname]'
          if (/\.(mp3|wav|ogg)$/i.test(name)) return 'assets/audio/[name]-[hash][extname]'
          if (/\.(png|jpe?g|webp|avif|ktx2)$/i.test(name)) return 'assets/textures/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    // sourcemap: true, // útil para analizar pesos en prod
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'three-mesh-bvh',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
