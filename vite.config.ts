// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

const has = (id: string, needle: string) => id.replace(/\\/g, '/').includes(needle)

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: '/',
  server: { host: true },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm', '**/*.ktx2', '**/*.bin'],
  build: {
    target: 'es2022',
    // Activa temporalmente para depurar si hiciera falta
    // sourcemap: true,
    chunkSizeWarningLimit: 4000, // subimos el umbral del aviso
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!has(id, 'node_modules')) return undefined
          // Mantén sólo los “bloques gordos” y deja el resto en vendor
          if (has(id, 'node_modules/three/')) return 'three'
          if (has(id, '@react-three/fiber') || has(id, '@react-three/drei')) return 'r3f'
          if (has(id, 'node_modules/react/') || has(id, 'node_modules/react-dom/') || has(id, 'react-router-dom')) return 'react'
          if (has(id, 'framer-motion')) return 'motion'
          if (
            has(id, 'three-mesh-bvh') ||
            has(id, 'three-stdlib') ||
            has(id, 'examples/jsm/utils/BufferGeometryUtils')
          ) return 'three-utils'
          // ❌ Quitamos el split específico de 'zustand' (causante del chunk "state")
          return undefined // dejar que Rollup decida el resto (caen en vendor)
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
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'three-mesh-bvh',
      // ❌ no metas 'zustand' ni otras libs pequeñas aquí a mano
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
