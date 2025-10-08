/* FILE: src/game/utils/three/geometry/extractMergedMesh.ts */
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { prepareForMerge } from "@/game/utils/three/geometry/prepareForMerge";

/**
 * Fusiona meshes que cumplan `predicate` aplicando matrixWorld.
 * Deja sólo `position` para colisión, y computa BVH si está disponible.
 */
export function extractMergedMesh(
    root: THREE.Object3D,
    predicate: (n: THREE.Mesh) => boolean
): THREE.Mesh | null {
    const geoms: THREE.BufferGeometry[] = [];
    root.updateMatrixWorld(true);

    root.traverse((obj: any) => {
        if (!obj?.isMesh || !predicate(obj)) return;

        const g0 = prepareForMerge(obj.geometry);
        const pos = g0.getAttribute("position");
        if (!pos || !pos.count) return;

        // deja sólo position
        for (const key of Object.keys(g0.attributes)) {
            if (key !== "position") (g0 as any).deleteAttribute(key);
        }

        g0.applyMatrix4(obj.matrixWorld);
        g0.computeBoundingBox?.();
        g0.computeBoundingSphere?.();
        geoms.push(g0);
    });

    if (!geoms.length) return null;

    // three recientes exportan mergeGeometries; anteriores, mergeBufferGeometries (evita hoisting de Rollup)
    const merge = ((u: any) => u['mergeGeometries'] ?? u['mergeBufferGeometries'])(BufferGeometryUtils as any);

    const merged: THREE.BufferGeometry = merge(geoms, false);
    merged.computeBoundingBox?.();
    merged.computeBoundingSphere?.();

    // si three-mesh-bvh está parcheado
    (merged as any).computeBoundsTree?.();

    const mat = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthTest: false,
        depthWrite: false,
    });

    const m = new THREE.Mesh(merged, mat);
    m.visible = false;
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    return m;
}

export default extractMergedMesh;
