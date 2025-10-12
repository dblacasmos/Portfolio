// src/game/utils/physics/initRapier.ts
let done = false;

/**
 * No inicializa Rapier (lo hace @react-three/rapier por su cuenta).
 * Solo fija la ruta base del .wasm y silencia el warning deprecado.
 */
export function prepareRapier() {
    if (done) return;
    done = true;

    // Ruta donde sirves el .wasm:  <BASE_URL>/rapier/rapier_wasm_bg.wasm
    try {
        const BASE = (import.meta as any)?.env?.BASE_URL ?? "/";
        (globalThis as any).RAPIER_BASE_URL = BASE + "rapier/";
    } catch { }

    // Silencia SOLO el warning "using deprecated parameters..."
    try {
        const warn = console.warn.bind(console);
        console.warn = (...args: any[]) => {
            const s = String(args?.[0] ?? "");
            if (s.includes("using deprecated parameters for the initialization function")) return;
            warn(...args);
        };
    } catch { }
}

export default prepareRapier;
