/* ====================================
   FILE: src/game/utils/three/optimizeGLTF.ts
   ==================================== */
import * as THREE from "three";
export { tuneMaterials } from "../textures/tuneMaterials";

/**
 * Congela transforms y apaga sombras si tu escena no las usa.
 * Si algún mesh se “corta” por culling, desactívalo puntualmente.
 */
export function optimizeStatic(root: THREE.Object3D) {
    root.traverse((o: any) => {
        if (!o) return;
        o.matrixAutoUpdate = false;
        if (o.isMesh) {
            o.castShadow = false;
            o.receiveShadow = false;
            o.frustumCulled = true;
        }
    });
    root.updateMatrixWorld(true);
}
