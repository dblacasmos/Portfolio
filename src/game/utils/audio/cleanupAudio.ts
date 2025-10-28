/*  ====================================
    FILE: src/game/utils/cleanupAudio.ts
    ==================================== */
// Utilidad defensiva para cerrar el AudioContext y fuentes si es posible,
// sin depender de la implementación concreta de audioManager.

import { audioManager } from "./audio";

/** Intenta parar/soltar audio para liberar hilos/memoria */
export function destroyAudio() {
    try {
        // Si el manager ya expone destroy():
        (audioManager as any)?.destroy?.();
    } catch { }

    try {
        // Intenta parar fuentes conocidas:
        (audioManager as any)?.stopAll?.();
    } catch { }

    try {
        // Cierra el AudioContext si es accesible
        const ctx =
            (audioManager as any)?.audioCtx ??
            (audioManager as any)?.ctx ??
            (audioManager as any)?._ctx;
        ctx?.close?.();
    } catch { }
}