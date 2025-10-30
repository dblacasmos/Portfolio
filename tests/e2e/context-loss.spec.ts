import { test, expect, type Page } from "@playwright/test";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173/";

async function setupLoseContextHelpers(page: Page): Promise<boolean> {
    return await page.evaluate<boolean>(() => {
        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas) return false;

        const gl =
            (canvas.getContext("webgl2") as any) ||
            (canvas.getContext("webgl") as any) ||
            (canvas.getContext("experimental-webgl") as any);
        if (!gl) return false;

        const ext = gl.getExtension("WEBGL_lose_context");
        if (!ext) return false;

        (window as any).__webglLose = () => ext.loseContext();
        (window as any).__webglRestore = () => ext.restoreContext();
        return true;
    });
}

test.describe("WebGL context loss overlay", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("canvas", { state: "attached", timeout: 15000 });
        const ok = await setupLoseContextHelpers(page);
        test.skip(!ok, "WEBGL_lose_context no está disponible en este entorno.");
    });

    test("muestra overlay al perder contexto y sugiere recargar tras ~1.5s", async ({ page }) => {
        await page.evaluate(() => (window as any).__webglLose());
        const baseMsg = page.getByText("Contexto WebGL perdido.", { exact: false });
        await expect(baseMsg).toBeVisible({ timeout: 2000 });
        await page.screenshot({ path: "artifacts/context-lost-initial.png", fullPage: false });
        const suggestion = page.getByText("recarga la pestaña", { exact: false });
        await expect(suggestion).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: "artifacts/context-lost-suggest-reload.png", fullPage: false });
    });

    test("al restaurar el contexto se oculta el overlay (y puede mostrarse un aviso corto)", async ({ page }) => {
        await page.evaluate(() => (window as any).__webglLose());
        await expect(page.getByText("Contexto WebGL perdido.", { exact: false })).toBeVisible();
        await page.evaluate(() => (window as any).__webglRestore());
        await expect(page.getByText("Contexto WebGL perdido.", { exact: false })).toHaveCount(0, { timeout: 3000 });
        const restoredHint = page.getByText("Contexto WebGL restaurado.", { exact: false });
        await restoredHint.waitFor({ state: "attached", timeout: 2000 }).catch(() => { });
        await page.screenshot({ path: "artifacts/context-restored.png", fullPage: false });
    });
});
