import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: { host: true },
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm", "**/*.ktx2", "**/*.bin"],
  build: {
    // sube el umbral de aviso; three + gltf suele pasarse de 500 KB
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split basado en ruta: más robusto con dependencias transitivas
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // three núcleo
          if (id.includes('/three/')) return 'three';
          // react-three
          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) return 'r3f';
          // audio
          if (id.includes('/howler/')) return 'howler';
          // utilidades 3D (BufferGeometryUtils, BVH, stdlib)
          if (
            id.includes('three-mesh-bvh') ||
            id.includes('three-stdlib') ||
            id.includes('examples/jsm/utils/BufferGeometryUtils')
          ) return 'three-utils';
          // resto de vendor
          return 'vendor';
        },
        // nombres legibles de assets/chunks en dist
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (/\.(glb|gltf|bin|ktx2|wasm)$/i.test(name)) return 'assets/models/[name]-[hash][extname]';
          if (/\.(mp3|wav|ogg)$/i.test(name)) return 'assets/audio/[name]-[hash][extname]';
          if (/\.(png|jpe?g|webp|avif)$/i.test(name)) return 'assets/textures/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // útil si quieres investigar pesos en prod
    // sourcemap: true,
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      'three-mesh-bvh'
    ],
  }
});
