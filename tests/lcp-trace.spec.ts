// =============================
// FILE: tests/lcp-trace.spec.ts
// =============================
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Observa LCP/CLS/FCP en /intro y vuelca un JSON en ./reports/web-vitals-<timestamp>.json
 * - Reutiliza el webServer configurado en playwright.config.ts
 * - Si PW_BUILD=1, se ejecuta contra Vite preview (build de producción)
 */
test('web-vitals (LCP/CLS/FCP) trace & export', async ({ page }, testInfo) => {
    // Inyecta observadores antes de cargar la página
    await page.addInitScript(() => {
        // @ts-ignore
        window.__webVitals = {
            lcp: 0,
            fcp: 0,
            cls: 0,
            entries: { lcp: [], cls: [], fcp: [] },
        };

        // Largest Contentful Paint
        const poLcp = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // @ts-ignore
                window.__webVitals.lcp =
                    // @ts-ignore
                    (entry as any).renderTime || (entry as any).loadTime || entry.startTime;
                // @ts-ignore
                window.__webVitals.entries.lcp.push(entry.toJSON ? entry.toJSON() : { startTime: entry.startTime });
            }
        });
        try { poLcp.observe({ type: 'largest-contentful-paint', buffered: true }); } catch { }

        // Cumulative Layout Shift
        let cls = 0;
        const poCls = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // @ts-ignore
                if (!(entry as any).hadRecentInput) {
                    cls += (entry as any).value || 0;
                    // @ts-ignore
                    window.__webVitals.entries.cls.push(entry.toJSON ? entry.toJSON() : { value: (entry as any).value, startTime: entry.startTime });
                }
            }
            // @ts-ignore
            window.__webVitals.cls = cls;
        });
        try { poCls.observe({ type: 'layout-shift', buffered: true }); } catch { }

        // First Contentful Paint
        const poPaint = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    // @ts-ignore
                    window.__webVitals.fcp = entry.startTime;
                    // @ts-ignore
                    window.__webVitals.entries.fcp.push(entry.toJSON ? entry.toJSON() : { startTime: entry.startTime });
                }
            }
        });
        try { poPaint.observe({ type: 'paint', buffered: true }); } catch { }

        // Limpieza al ocultarse
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                try { poLcp.disconnect(); } catch { }
                try { poCls.disconnect(); } catch { }
                try { poPaint.disconnect(); } catch { }
            }
        });
    });

    // Carga raíz y espera redirección a /intro
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/intro(?:\?|$)/, { timeout: 30000 });

    // Espera a que aparezca algo representativo de la vista (botón iniciar)
    await expect(page.locator('#start-btn')).toBeVisible({ timeout: 30000 });

    // Da margen a LCP tardío (imagenes/video); y luego espera “idle”
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
    // Pequeño settle extra para entradas buffered (especialmente WebKit)
    await page.waitForTimeout(1000);

    // Recopila datos
    const data = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const paints = performance.getEntriesByType('paint') as PerformanceEntry[];
        // @ts-ignore
        const vitals = (window as any).__webVitals || { lcp: 0, fcp: 0, cls: 0, entries: {} };
        return {
            url: location.href,
            timestamp: Date.now(),
            lcp: Math.round(vitals.lcp), // ms
            fcp: Math.round(vitals.fcp), // ms
            cls: Number(vitals.cls.toFixed(3)),
            navigation: nav ? nav.toJSON() : null,
            paints: paints.map(p => ({ name: p.name, startTime: Math.round(p.startTime) })),
            entries: vitals.entries,
            userAgent: navigator.userAgent,
        };
    });

    // Exporta JSON “CI-friendly”
    const outDir = path.join(process.cwd(), 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `web-vitals-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');

    // Adjunta al reporte HTML de Playwright
    await testInfo.attach('web-vitals.json', { path: file, contentType: 'application/json' });

    console.log(`[web-vitals] LCP: ${data.lcp}ms, FCP: ${data.fcp}ms, CLS: ${data.cls}`);
});
