/* ======================================
   FILE: src/game/utils/three/patchBVH.ts
   ====================================== */
import * as THREE from "three";
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from "three-mesh-bvh";

// Ampliamos tipos en tiempo de compilación
declare global {
    interface BufferGeometry {
        computeBoundsTree?: typeof computeBoundsTree;
        disposeBoundsTree?: typeof disposeBoundsTree;
        boundsTree?: unknown;
    }
    interface Mesh {
        raycast?: typeof acceleratedRaycast;
    }
}

(function patchOnce() {
    const BG = (THREE as any).BufferGeometry?.prototype;
    const M = (THREE as any).Mesh?.prototype;

    let patched = false;

    if (BG && !BG.computeBoundsTree) { BG.computeBoundsTree = computeBoundsTree; patched = true; }
    if (BG && !BG.disposeBoundsTree) { BG.disposeBoundsTree = disposeBoundsTree; patched = true; }
    if (M && M.raycast !== acceleratedRaycast) { M.raycast = acceleratedRaycast; patched = true; }

    if ((import.meta as any)?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.log("[BVH] patched (side-effect):", patched);
    }
})();

import * as THREE_NS from "three";

/** Libera geometrías, materiales y texturas dentro de un árbol Object3D. */
export function disposeObject3D(root: THREE_NS.Object3D) {
    root.traverse((o: any) => {
        if (o.geometry) { try { o.geometry.dispose?.(); } catch { } }
        if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
                try {
                    ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap", "alphaMap", "envMap"]
                        .forEach((k) => { try { m?.[k]?.dispose?.(); } catch { } });
                    m.dispose?.();
                } catch { }
            }
        }
    });
}

/** Libera un render target si existe (postprocesado, etc.). */
export function disposeRT(rt?: THREE_NS.WebGLRenderTarget | null) {
    if (!rt) return;
    try { rt.dispose?.(); } catch { }
}
