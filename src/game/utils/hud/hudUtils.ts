// ====================================
// FILE: src/game/utils/hud/hudUtils.ts
// ====================================
import * as THREE from "three";
import { CFG } from "@/constants/config";

// Capa HUD común
export const HUD_LAYER = CFG.layers.HUD;

// Geometría plano 1x1 compartida (ahorra VRAM)
let _planeUnit: THREE.PlaneGeometry | null = null;
export function getPlaneUnit() {
    if (!_planeUnit) _planeUnit = new THREE.PlaneGeometry(1, 1, 1, 1);
    return _planeUnit;
}

// Aplicar capa HUD en árbol
export function setHudLayer(root: THREE.Object3D | null, layerIdx = HUD_LAYER) {
    if (!root) return;
    root.layers.set(layerIdx);
    root.traverse((o) => o.layers.set(layerIdx));
}
