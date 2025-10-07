import * as THREE from "three";
import { CFG } from "@/constants/config";

// Capa HUD común
export const HUD_LAYER = CFG.layers.HUD;

// Geometría plano 1x1 compartida para todos los overlays (evita VRAM extra)
let _planeUnit: THREE.PlaneGeometry | null = null;
export function getPlaneUnit() {
    if (!_planeUnit) _planeUnit = new THREE.PlaneGeometry(1, 1, 1, 1);
    return _planeUnit;
}

// Aplicar capa HUD en árbol (reutilizable)
export function setHudLayer(root: THREE.Object3D | null, layerIdx = HUD_LAYER) {
    if (!root) return;
    root.layers.set(layerIdx);
    root.traverse((o) => o.layers.set(layerIdx));
}
