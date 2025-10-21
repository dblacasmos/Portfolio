//File: vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['tests/**', 'node_modules/**', 'dist/**', 'public/**', 'build-reports/**'],
        environment: 'jsdom',
        reporters: 'default',
        coverage: {
            provider: 'v8',
        },
    },
});
