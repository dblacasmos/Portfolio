/*  ===========================================
    FILE: src/game/utils/collision/ensureBVH.ts
    =========================================== */
import type { BufferGeometry } from "three";

// El tipo lo añade three-mesh-bvh en runtime, por eso el any opcional
type GeometryWithBVH = BufferGeometry & {
    boundsTree?: unknown;
    computeBoundsTree?: (options?: any) => void;
};

const __DEV__ =
    typeof import.meta !== "undefined" &&
    !!((import.meta as any).env?.DEV);

export function ensureBVH(geo: BufferGeometry, { autoBuildInDev = true } = {}) {
    const g = geo as GeometryWithBVH;

    if (!g.boundsTree) {
        if (__DEV__) {
            console.warn("[BVH] geometry sin boundsTree. Llama a geometry.computeBoundsTree() al cargar el mesh.");
            if (autoBuildInDev && typeof g.computeBoundsTree === "function") {
                try {
                    g.computeBoundsTree();
                    console.info("[BVH] boundsTree construido on-the-fly (solo dev).");
                } catch (e) {
                    console.warn("[BVH] Falló computeBoundsTree():", e);
                }
            }
        }
        return false;
    }
    return true;
}
