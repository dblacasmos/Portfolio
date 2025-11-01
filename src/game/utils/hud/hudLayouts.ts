/* ====================================
   FILE: src/game/utils/hud/hudLayout.ts
   ==================================== */

import { CFG } from "@/constants/config";
import { setLayerRecursive } from "@/game/utils/three/layers";
import type { PlaneGeometry, Object3D } from "three";
import { PlaneGeometry as TPlaneGeometry } from "three";

/** Pura: calcula clamp 2D en coords ortográficas [-aspect..+aspect] x [-1..+1] con márgenes seguros. */
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
    return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
    };
}

/** Pura: cuantiza un valor al “grid” del HUD editor. */
export function snap(v: number, step = CFG.hud.ui.snapStep) {
    if (!step || step <= 0) return v;
    return Math.round(v / step) * step;
}

/** Pura: factor de escala responsive basado en el aspect ratio (reusa la función de config). */
export function responsiveScale(aspect: number) {
    return CFG.hud.ui.scaleForAspect(aspect);
}

// -----------------------------------------------------------------------------
// Utilidades de capa y geometría HUD
// -----------------------------------------------------------------------------

import { CFG as _CFG } from "@/constants/config"; // alias local para claridad si se tree-shakea
export const HUD_LAYER = _CFG.layers.HUD;

/** Geometría plano 1x1 compartida para overlays HUD (evita VRAM extra). */
let _planeUnit: PlaneGeometry | null = null;
export function getPlaneUnit() {
    if (!_planeUnit) _planeUnit = new TPlaneGeometry(1, 1, 1, 1);
    return _planeUnit;
}

/** Aplica la capa HUD a todo un árbol (reutiliza la función genérica de layers). */
export function setHudLayer(root: Object3D | null, layerIdx = HUD_LAYER) {
    if (!root) return;
    setLayerRecursive(root, layerIdx);
}
