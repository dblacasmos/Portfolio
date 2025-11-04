/*  ===============================================
    FILE: src/game/utils/three/rapier/initRapier.ts
    =============================================== */
/**
 * Opción A — Deja que @react-three/rapier gestione Rapier internamente.
 * No importamos ni inicializamos `@dimforge/rapier3d-compat` aquí.
 *
 * - warmRapier(): “toca” @react-three/rapier para forzar su chunk y que él cargue Rapier.
 * - prepareRapier(): alias de warmRapier (compatibilidad con el código existente).
 * - useRapierReady(): hook simple que marca "listo" cuando termina warmRapier().
 * - prewarmRapierOnFirstPointer(): precalienta al primer click/tap del usuario.
 */

// NO HAGAS import (ni estático ni dinámico) aquí.
// Deja que @react-three/rapier se cargue sólo donde se usa (Game.tsx).

/** No-op para mantener la API y evitar warnings de Vite. */
export async function warmRapier(): Promise<void> {
    // Intencionadamente vacío: evitar mezclar import dinámico/estático del mismo módulo.
}

/** No-op tras el primer gesto del usuario (mantiene firma sin importar nada). */
export function prewarmRapierOnFirstPointer(): void {
    if (typeof window === "undefined") return;
    const once = () => {
        window.removeEventListener("pointerdown", once);
        // Aquí no importamos nada a propósito.
    };
    window.addEventListener("pointerdown", once, { once: true, passive: true });
}
