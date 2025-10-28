/* ====================================
   FILE: src/game/utils/three/optimizeGLTF.ts
   ==================================== */
import * as THREE from "three";
export { tuneMaterials } from "./tuneMaterials";

export function optimizeStatic(root: THREE.Object3D) {
    root.traverse((o: any) => {
        if (!o) return;
        o.matrixAutoUpdate = false;
        if (o.isMesh) {
            // Si no usas sombras reales, desactívalas por completo:
            o.castShadow = false;
            o.receiveShadow = false;
            // Si algún mesh se “desaparece” por culling, fuerza a false puntualmente.
            o.frustumCulled = true;
        }
    });
    root.updateMatrixWorld(true);
}
