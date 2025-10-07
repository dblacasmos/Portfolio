// src/hooks/useRouteCleanup.ts
import { useCallback, useEffect } from "react";
import {
    hardCleanupBeforeMain,
    softCleanupMedia,
    type KeepOpts,
} from "@/game/utils/cleanupMain";

export type RouteCleanupMode = "hard" | "soft";
export type RouteCleanupOptions = KeepOpts & {
    /** Ejecutar solo si se cumple (default true) */
    when?: boolean;
    /** Cuándo disparar automáticamente (default 'mount') */
    runOn?: "mount" | "unmount" | "both" | "none";
    /** Si runOn incluye 'mount', ejecuta en el primer efecto (default true) */
    immediate?: boolean;
};

/**
 * Hook para limpiar media/VRAM al cambiar de pantalla.
 * - 'soft': pausa/descarga <video>/<audio>, cancela TTS y sonidos.
 * - 'hard': además suelta WebGL y canvases huérfanos.
 *
 * Devuelve `run()` por si quieres invocarlo de forma imperativa antes de navegar.
 */
export function useRouteCleanup(
    mode: RouteCleanupMode = "soft",
    options: RouteCleanupOptions = {},
) {
    const { when = true, runOn = "mount", immediate = true, ...keep } = options;

    const run = useCallback(() => {
        if (!when) return;
        if (mode === "hard") hardCleanupBeforeMain(keep);
        else softCleanupMedia(keep);
    }, [when, mode, keep.keepIds, keep.keepClasses, keep.keepSelectors, keep.keepPredicate]);

    // Auto en mount
    useEffect(() => {
        if (!when) return;
        if (runOn === "mount" || runOn === "both") {
            if (immediate) run();
            else Promise.resolve().then(run);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [when, runOn, immediate, run]);

    // Auto en unmount
    useEffect(() => {
        if (!when) return;
        if (runOn === "unmount" || runOn === "both") return () => run();
        return;
    }, [when, runOn, run]);

    return run;
}
