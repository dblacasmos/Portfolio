/* ====================================
   FILE: src/game/utils/hud/hudLayout.ts
   ==================================== */
import { CFG } from "@/constants/config";

/** Pura: clamp 2D en coords ortográficas [-aspect..+aspect]x[-1..+1] con márgenes seguros. */
export function clampToSafe(
    x: number,
    y: number,
    w: number,
    h: number,
    aspect: number,
    safeX = CFG.hud.ui.safeX,
    safeY = CFG.hud.ui.safeY
) {
    const minX = -aspect + safeX + w / 2;
    const maxX = +aspect - safeX - w / 2;
    const minY = -1 + safeY + h / 2;
    const maxY = +1 - safeY - h / 2;
    return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
}

/** Pura: cuantiza un valor al “grid” del HUD editor. */
export function snap(v: number, step = CFG.hud.ui.snapStep) {
    if (!step || step <= 0) return v;
    return Math.round(v / step) * step;
}

/** Pura: factor de escala responsive basado en el aspect ratio (reusa config). */
export function responsiveScale(aspect: number) {
    return CFG.hud.ui.scaleForAspect(aspect);
}
