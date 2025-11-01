// =======================================
// FILE: src/game/utils/three/safeMerge.ts
// =======================================
import * as THREE from "three";
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Convierte cualquier atributo (incl. interleaved/normalized) a BufferAttribute Float32 plano. */
function toFloat32(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
    // La API de three expone toArray() en ambos tipos y respeta 'normalized'.
    const tmp: number[] = [];
    (attr as any).toArray(tmp);
    const itemSize = (attr as any).itemSize ?? 3;
    return new THREE.BufferAttribute(Float32Array.from(tmp), itemSize, /*normalized*/ false);
}

/** Normaliza todos los atributos y asegura índice en 32 bits si es necesario. */
export function normalizeGeometryAttributes(g: THREE.BufferGeometry) {
    const out = g.clone();

    for (const name of Object.keys(out.attributes)) {
        const attr = out.getAttribute(name) as any;
        out.setAttribute(name, toFloat32(attr));
    }

    // Índice a 32 bits si hay más de 65535 vértices (requisito WebGL/Uint16)
    const pos = out.getAttribute("position");
    if (out.index && !(out.index.array instanceof Uint32Array) && pos && pos.count > 65535) {
        const idx = out.index.array as ArrayLike<number>;
        out.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx as any), 1));
    }

    return out;
}

/** Merge seguro: normaliza primero, luego delega en BufferGeometryUtils.mergeGeometries. */
export function safeMergeGeometries(geoms: THREE.BufferGeometry[], useGroups = false) {
    const norm = geoms.map(normalizeGeometryAttributes);
    return mergeGeometries(norm, useGroups);
}
