/*  ================================================
    FILE: src/game/utils/three/geometry/safeMerge.ts
    ================================================ */
import * as THREE from "three";
// Import por espacio de nombres para ser compatible con diferentes versiones de three
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Convierte cualquier atributo (normalizado/interleaved) a Float32 limpio. */
function toFloat32(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
    const tmp: number[] = [];
    // toArray() ya resuelve interleaved + normalized correctamente
    (attr as any).toArray(tmp);
    const itemSize = (attr as any).itemSize ?? 3;
    return new THREE.BufferAttribute(Float32Array.from(tmp), itemSize, false);
}

/** Normaliza todos los atributos y asegura índice en 32 bits cuando toca. */
export function normalizeGeometryAttributes(g: THREE.BufferGeometry) {
    const out = g.clone();

    for (const name of Object.keys(out.attributes)) {
        const attr = out.getAttribute(name) as any;
        out.setAttribute(name, toFloat32(attr));
    }

    // Índice a 32 bits si hay más de 65535 vértices
    const pos = out.getAttribute("position");
    if (out.index && !(out.index.array instanceof Uint32Array) && pos && pos.count > 65535) {
        const idx = out.index.array as ArrayLike<number>;
        out.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx as any), 1));
    }

    return out;
}

type MergeFn = (geoms: THREE.BufferGeometry[], useGroups?: boolean) => THREE.BufferGeometry;

/** Elige la función disponible según versión de three (mergeGeometries o mergeBufferGeometries). */
const mergeGeometriesCompat: MergeFn = (
    (BufferGeometryUtils as any).mergeGeometries ??
    (BufferGeometryUtils as any).mergeBufferGeometries
) as MergeFn;

/** Merge seguro: normaliza primero, luego delega en BufferGeometryUtils (compat). */
export function safeMergeGeometries(geoms: THREE.BufferGeometry[], useGroups = false) {
    const norm = geoms.map(normalizeGeometryAttributes);
    return mergeGeometriesCompat(norm, useGroups);
}
