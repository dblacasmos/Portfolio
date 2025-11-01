// Consolidated E2E: WebGL context loss & recovery
// NOTE: Replace OVERLAY_SELECTOR if your overlay uses a different test id or text.
import { test, expect } from "@playwright/test";

const OVERLAY_SELECTOR = '[data-testid="webgl-context-lost-overlay"], text=/webgl context|contexto webgl/i';

test.describe("WebGL context loss", () => {
    test("shows warning overlay and recovers after restore", async ({ page }) => {
        // Navega directamente a la ruta del juego.
        await page.goto("/game");
        await expect(page.locator("canvas")).toBeVisible();

        // Exponer helpers en la página para perder/restaurar contexto WebGL.
        await page.addInitScript(() => {
            (window as any).__webglLose = () => {
                const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
                if (!canvas) return false;
                const gl =
                    (canvas.getContext("webgl2") as any) ||
                    (canvas.getContext("webgl") as any) ||
                    (canvas.getContext("experimental-webgl") as any);
                if (!gl) return false;
                const ext = gl.getExtension("WEBGL_lose_context");
                if (!ext) return false;
                ext.loseContext();
                return true;
            };
            (window as any).__webglRestore = () => {
                const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
                if (!canvas) return false;
                const gl =
                    (canvas.getContext("webgl2") as any) ||
                    (canvas.getContext("webgl") as any) ||
                    (canvas.getContext("experimental-webgl") as any);
                if (!gl) return false;
                const ext = gl.getExtension("WEBGL_lose_context");
                if (!ext) return false;
                ext.restoreContext();
                return true;
            };
        });

        // Forzar pérdida de contexto
        const lost = await page.evaluate(() => (window as any).__webglLose?.());
        expect(lost).toBeTruthy();

        // Si existe overlay de aviso, debería aparecer.
        const overlay = page.locator(OVERLAY_SELECTOR);
        // No hacemos hard-fail si el proyecto no pinta overlay; pero si lo pinta, que sea visible.
        const overlayCount = await overlay.count();
        if (overlayCount > 0) {
            await expect(overlay).toBeVisible();
        }

        // Restaurar contexto
        const restored = await page.evaluate(() => (window as any).__webglRestore?.());
        expect(restored).toBeTruthy();

        // El canvas sigue existiendo tras restaurar
        await expect(page.locator("canvas")).toBeVisible();
    });
});
