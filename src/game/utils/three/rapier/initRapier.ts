// src/game/utils/physics/initRapier.ts
let ready: Promise<void> | null = null;

export function ensureRapierInit(): Promise<void> {
    if (ready) return ready;

    ready = (async () => {
        try {
            const RAPIER = await import("@dimforge/rapier3d-compat");

            // Ruta del .wasm (ajusta si lo sirves en otra carpeta)
            const wasmUrl =
                new URL((import.meta.env.BASE_URL ?? "/") + "rapier/rapier_wasm_bg.wasm", window.location.href).href;

            // --- Silenciador puntual del warning de wasm-bindgen -------------------
            const warn = console.warn;
            console.warn = function (...args: any[]) {
                const s = (args?.[0] ?? "").toString();
                // Filtra SOLO el aviso deprecado de init()
                if (s.includes("using deprecated parameters for the initialization function")) return;
                return warn.apply(this, args as any);
            };
            try {
                // ✅ Firma nueva: un ÚNICO objeto
                await (RAPIER as any).init({ module_or_path: wasmUrl });
            } finally {
                console.warn = warn;
            }
            // ----------------------------------------------------------------------

        } catch (e) {
            // No hacemos hard-fail: el juego puede seguir sin físicas momentáneamente
            console.warn("[Rapier] init failed (continuo igualmente):", e);
        }
    })();

    return ready;
}

// Auto-arranque
void ensureRapierInit();
