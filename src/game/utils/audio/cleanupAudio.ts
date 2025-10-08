/*  ====================================
    FILE: src/game/utils/cleanupAudio.ts
    ==================================== */
// Utilidad defensiva para cerrar el AudioContext y fuentes si es posible,
// sin depender de la implementación concreta de audioManager.

import { audioManager } from "./audio";

/** Intenta parar/soltar audio para liberar hilos/memoria */
export function destroyAudio() {
    try { (audioManager as any)?.destroy?.(); } catch { }
    try { (audioManager as any)?.stopAll?.(); } catch { }
    try {
        // Cierra el AudioContext si es accesible (compat varios nombres)
        const ctx =
            (audioManager as any)?.audioCtx ??
            (audioManager as any)?.ctx ??
            (audioManager as any)?._ctx;
        ctx?.close?.();
    } catch { }
}
