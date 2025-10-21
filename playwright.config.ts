// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// Host/IP a usar por Vite y por Playwright.
// - 127.0.0.1 (default) evita resoluciones raras de "localhost" en Windows/CI.
// - Si quieres probar desde otro dispositivo de la LAN, exporta HOST=0.0.0.0
//   y ajusta BASE_URL abajo a tu IP LAN (o define HOST con tu 192.168.x.x).
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 5173);
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: { timeout: 30_000 },
    fullyParallel: true,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        video: 'retain-on-failure',
    },
    webServer: {
        // En build (PW_BUILD=1) servimos el bundle; en local, dev server.
        // Forzamos --host para que NO elija 169.254.* ni otras interfaces raras.
        command: process.env.PW_BUILD
            ? `vite preview --host ${HOST} --port ${PORT} --strictPort`
            : `vite dev --host ${HOST} --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: true,  // puedes cambiar a !process.env.CI si prefieres
        timeout: 120_000,
    },
    projects: [
        // Desktop
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } }, //sin isMobile
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },

        // Mobile (la emulación toca aquí, no en firefox desktop)
        { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
        { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ],
});
