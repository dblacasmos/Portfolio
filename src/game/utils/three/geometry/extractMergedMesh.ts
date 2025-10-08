/* =======================================
   FILE: src/game/utils/three/extractMergedMesh.ts
   ======================================= */
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { prepareForMerge } from "@/game/utils/three/geometry/prepareForMerge";

/**
 * Fusiona todos los meshes que cumplan `predicate` aplicando matrixWorld.
 * Deja la geometría lista para colisión (invisible) y con BVH si está disponible.
 * Nota: aquí sólo mantenemos `position` más tarde para ahorrar memoria.
 */
export function extractMergedMesh(
    root: THREE.Object3D,
    predicate: (n: THREE.Mesh) => boolean
): THREE.Mesh | null {
    const geoms: THREE.BufferGeometry[] = [];
    root.updateMatrixWorld(true);

    root.traverse((obj: any) => {
        if (!obj?.isMesh || !predicate(obj)) return;

        // Normaliza la geo para merge
        const g0 = prepareForMerge(obj.geometry);

        // Si no hay position válido, ignora
        const pos = g0.getAttribute("position");
        if (!pos || !pos.count) return;

        // Para collider: deja sólo position
        for (const key of Object.keys(g0.attributes)) {
            if (key !== "position") (g0 as any).deleteAttribute(key);
        }

        // Lleva a espacio mundo y guarda
        g0.applyMatrix4(obj.matrixWorld);
        g0.computeBoundingBox?.();
        g0.computeBoundingSphere?.();
        geoms.push(g0);
    });

    if (!geoms.length) return null;

    const mergeFn =
        (BufferGeometryUtils as any).mergeGeometries ??
        (BufferGeometryUtils as any).mergeBufferGeometries;

    const merged: THREE.BufferGeometry = mergeFn(geoms, /*useGroups*/ false);
    merged.computeBoundingBox?.();
    merged.computeBoundingSphere?.();

    // Si está parcheado three-mesh-bvh, crea el árbol aquí
    (merged as any).computeBoundsTree?.();

    const mat = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthTest: false,
        depthWrite: false,
    });

    const m = new THREE.Mesh(merged, mat);
    m.visible = false;          // fuera del render
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    return m;
}

export default extractMergedMesh;
