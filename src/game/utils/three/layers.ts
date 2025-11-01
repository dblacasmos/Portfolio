/* ====================================
   FILE: src/game/utils/three/layers.ts
   ==================================== */
import type { Object3D, Camera } from "three";
import { CFG } from "@/constants/config";

export const LAYERS = CFG.layers;

export function setLayerRecursive(o: Object3D, layer: number) {
    const l = Math.max(0, Math.min(31, layer));
    o.layers.set(l);
    for (const c of o.children) setLayerRecursive(c as Object3D, l);
}

export function enableOnlyTheseCameraLayers(cam: Camera, layers: number[]) {
    for (let i = 0; i < 32; i++) cam.layers.disable(i);
    for (const raw of layers) {
        const l = Math.max(0, Math.min(31, raw));
        cam.layers.enable(l);
    }
}