/* =======================================
   FILE: src/game/utils/three/patchBVH.ts
   ======================================= */
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
