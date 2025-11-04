/*  ===============================================
    FILE: src/game/utils/three/rapier/initRapier.ts
    =============================================== */
import { useEffect, useState } from "react";

/**
 * Inicializa @dimforge/rapier3d-compat una sola vez y expone estado "ready".
 * Evita el crash "raweventqueue_new" cuando <Physics> se monta antes del init().
 */

type RapierNS = typeof import("@dimforge/rapier3d-compat");

let _promise: Promise<RapierNS> | null = null;
let _ready = false;
let _err: unknown = null;

export function prepareRapier(): Promise<RapierNS> {
    if (_promise) return _promise;
    _promise = import("@dimforge/rapier3d-compat")
        .then(async (RAPIER) => {
            try {
                // Llama siempre a init(); Vite/Preview resuelven el .wasm automáticamente.
                await RAPIER.init();
                (globalThis as any).RAPIER = RAPIER; // útil para depurar
                _ready = true;
                return RAPIER;
            } catch (e) {
                _err = e;
                console.warn("[Rapier] init() failed:", e);
                throw e;
            }
        })
        .catch((e) => {
            _err = e;
            console.warn("[Rapier] dynamic import failed:", e);
            throw e;
        });
    return _promise;
}

export function isRapierReady() {
    return _ready;
}

export function getRapierError() {
    return _err;
}

/** Hook de conveniencia para compuertas de render. */
export function useRapierReady(): boolean {
    const [ok, setOk] = useState<boolean>(_ready);
    useEffect(() => {
        if (_ready) return;
        let alive = true;
        prepareRapier()
            .then(() => alive && setOk(true))
            .catch(() => alive && setOk(false));
        return () => {
            alive = false;
        };
    }, []);
    return ok;
}

/** Precalienta Rapier tras una primera interacción del usuario (evita jank del primer frame). */
export function prewarmRapierOnFirstPointer(): void {
    if (typeof window === "undefined") return;
    const once = (ev: Event) => {
        window.removeEventListener("pointerdown", once);
        // Ignora si ya está listo/en curso
        if (_ready || _promise) return;
        prepareRapier().catch(() => { /* noop: ya se loguea arriba */ });
    };
    window.addEventListener("pointerdown", once, { once: true, passive: true });
}