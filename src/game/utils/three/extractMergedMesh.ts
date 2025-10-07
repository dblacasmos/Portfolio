/* =======================================
    FILE: src/game/utils/three/extractMergedMesh.ts
    ======================================= */
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { prepareForMerge } from "@/game/utils/three/geometry/prepareForMerge";

/**
 * Fusiona todos los meshes que cumplan `predicate` aplicando matrixWorld.
 * Mantiene SOLO el atributo `position` para evitar incompatibilidades al merge.
 * Devuelve un Mesh invisible (collider-ready).
 */
export function extractMergedMesh(
    root: THREE.Object3D,
    predicate: (n: THREE.Mesh) => boolean
): THREE.Mesh | null {
    const geoms: THREE.BufferGeometry[] = [];
    root.updateMatrixWorld(true);

    root.traverse((obj: any) => {
        if (!obj?.isMesh || !predicate(obj)) return;
        // Asegura no indexada + atributos en Float32 (descuantiza si venía con KHR_mesh_quantization)
        let g = prepareForMerge(obj.geometry);
        // Para el collider solo necesitamos position
        Object.keys(g.attributes).forEach((name) => { if (name !== "position") (g as any).deleteAttribute(name); });

        g.applyMatrix4(obj.matrixWorld);
        g.computeBoundingBox?.();
        g.computeBoundingSphere?.();
        geoms.push(g);
    });

    if (!geoms.length) return null;

    const mergeFn =
        (BufferGeometryUtils as any).mergeGeometries ??
        (BufferGeometryUtils as any).mergeBufferGeometries;

    const merged: THREE.BufferGeometry = mergeFn(geoms, /*useGroups*/ false);
    merged.computeBoundingBox?.();
    merged.computeBoundingSphere?.();

    // Si el parche BVH está activo, construimos el árbol aquí mismo.
    (merged as any).computeBoundsTree?.();

    const mat = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthTest: false,
        depthWrite: false,
    });

    const m = new THREE.Mesh(merged, mat);
    m.visible = false;           // explícitamente invisible (no entra al render)
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    return m;
}
