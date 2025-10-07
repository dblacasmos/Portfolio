import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: { host: true },
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm", "**/*.ktx2", "**/*.bin"]
});
