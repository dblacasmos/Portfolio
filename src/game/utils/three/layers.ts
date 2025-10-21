/* ====================================
   FILE: src/game/utils/three/layers.ts
   ==================================== */
import * as THREE from "three";
import { CFG } from "@/constants/config";

/** Alias directo para que puedas importar HUD_LAYER */
export const HUD_LAYER = CFG.layers.HUD;
export const LAYERS = CFG.layers;

export function setLayerRecursive(o: THREE.Object3D, layer: number) {
    o.layers.set(layer);
    for (const c of o.children) setLayerRecursive(c, layer);
}

export function enableOnlyTheseCameraLayers(cam: THREE.Camera, layers: number[]) {
    for (let i = 0; i < 32; i++) cam.layers.disable(i);
    for (const l of layers) cam.layers.enable(l);
}
