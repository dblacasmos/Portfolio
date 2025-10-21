// =============================
// FILE: tests/a11y-and-gestures.spec.ts
// =============================
import { test, expect } from '@playwright/test';

test.describe('mobile hit targets & gestures', () => {
    /**
     * Fire zone visible y con tamaño mínimo en móviles; no debe provocar scroll.
     */
    test('fire zone has min 44x44 and no page scroll', async ({ page, browserName }) => {
        // Ejecuta solo en proyectos móviles y evita Firefox (no soporta isMobile)
        const isMobileProject = /mobile/i.test(test.info().project.name);
        const isFirefox = browserName === 'firefox';
        if (!isMobileProject || isFirefox) test.skip();

        // Fuerza HUD móvil antes de cargar la app
        await page.addInitScript(() => {
            localStorage.setItem('__FORCE_MOBILE', '1');
            document.documentElement.setAttribute('data-force-mobile', '1');
        });
        await page.goto('/game');

        // Asegura estado de juego
        await page.evaluate(() => (window as any)?.setGame?.({ menuOpen: false, playing: true }));

        // Verifica fire-zone
        const fire = page.getByTestId('fire-zone');
        await expect(fire).toBeVisible();
        const box = await fire.boundingBox();
        expect(box?.width! >= 44).toBeTruthy();
        expect(box?.height! >= 44).toBeTruthy();

        // No scroll durante gesto
        const yBefore = await page.evaluate(() => window.scrollY);
        await fire.dispatchEvent('pointerdown', {
            pointerType: 'touch',
            clientX: (box!.x + 5),
            clientY: (box!.y + 5),
        });
        // WebKit móvil no soporta mouse.wheel; en ese caso solo validamos que el gesto no cambie el scroll
        if (browserName !== 'webkit') {
            await page.mouse.wheel(0, 500);
        }
        const yAfter = await page.evaluate(() => window.scrollY);
        expect(yAfter).toBe(yBefore);
    });
});

/**
 * Áreas táctiles de controles móviles
 * - Forzamos modo móvil antes de cargar /game para garantizar HUD touch.
 */
test('mobile controls hit area', async ({ page }) => {
    // Ejecuta solo en proyectos móviles y evita Firefox
    const isMobileProject = /mobile/i.test(test.info().project.name);
    // browserName es más fiable que inspeccionar el nombre del proyecto
    const isFirefox = (test.info().project.use as any).browserName === 'firefox';
    if (!isMobileProject || isFirefox) test.skip();

    // Fuerza modo móvil antes de navegar
    await page.addInitScript(() => localStorage.setItem('__FORCE_MOBILE', '1'));
    await page.goto('/game', { waitUntil: 'domcontentloaded' });

    // Botón de disparo visible y >= 44x44px (da margen por cargas 3D)
    const fire = page.getByRole('button', { name: /disparar|fire/i });
    await expect(fire).toBeVisible({ timeout: 30000 });

    const box = await fire.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
});

/**
 * Focus trap en diálogos/overlays
 * - Abre un overlay (menú in-game) vía puente dev y comprueba foco y bloqueo del canvas.
 */
test('dialog focus trap (si hay diálogo)', async ({ page }) => {
    await page.goto('/game', { waitUntil: 'domcontentloaded' });

    // Abre menú mediante el bridge expuesto por el juego
    await page.evaluate(() => (window as any).__toggleMenu?.(true));

    const dialog = page.locator('[role="dialog"]');
    if ((await dialog.count()) === 0) {
        test.skip(true, 'No hay diálogo con role="dialog" en esta vista.');
    }

    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Avanza el foco con TAB varias veces y comprueba que se mantiene dentro
    for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
    }
    const inDialog = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        return !!dlg && !!document.activeElement && dlg.contains(document.activeElement);
    });
    expect(inDialog).toBeTruthy();

    // El canvas debe quedar bloqueado por overlay (clase global)
    const uiBlocking = await page.evaluate(() =>
        document.body.classList.contains('ui-blocking')
    );
    expect(uiBlocking).toBeTruthy();
});
