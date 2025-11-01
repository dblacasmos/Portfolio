// FILE: vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Normaliza para windows/unix
const has = (id: string, needle: string) => id.replace(/\\/g, "/").includes(needle);

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: "/",
  server: { host: true },

  // Fuerza una única copia de react / react-dom
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      // (Por si algún paquete resuelve directo al runtime)
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
    },
  },

  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm", "**/*.ktx2", "**/*.bin"],

  build: {
    target: "es2022",
    chunkSizeWarningLimit: 3000, // three+gltf se pasa del umbral por defecto
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!has(id, "node_modules")) return undefined;
          if (has(id, "node_modules/three/")) return "three";
          if (has(id, "@react-three/fiber") || has(id, "@react-three/drei")) return "r3f";
          if (has(id, "/howler/")) return "audio";
          // Incluimos también el runtime JSX aquí para evitar un chunk aparte
          if (
            has(id, "node_modules/react/") ||
            has(id, "node_modules/react-dom/") ||
            has(id, "/react/jsx-runtime") ||
            has(id, "react-router-dom")
          ) {
            return "react";
          }
          if (has(id, "framer-motion")) return "motion";
          if (has(id, "zustand")) return "state";
          if (
            has(id, "three-mesh-bvh") ||
            has(id, "three-stdlib") ||
            has(id, "examples/jsm/utils/BufferGeometryUtils")
          )
            return "three-utils";
          return "vendor";
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (/\.(glb|gltf|bin|wasm)$/i.test(name)) return "assets/models/[name]-[hash][extname]";
          if (/\.(mp3|wav|ogg)$/i.test(name)) return "assets/audio/[name]-[hash][extname]";
          if (/\.(png|jpe?g|webp|avif|ktx2)$/i.test(name))
            return "assets/textures/[name]-[hash][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    // sourcemap: true,
  },

  // Asegura que Vite pre-optimiza estas dependencias con la misma copia
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "three-mesh-bvh",
    ],
  },
});
