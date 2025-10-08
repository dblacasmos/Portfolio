/* =======================================
   FILE: src/game/utils/three/geometry/prepareForMerge.ts
   ======================================= */

import * as THREE from "three";

/**
 * Normaliza una geometría para merge:
 * - Quita el índice (no-indexed) aplicando duplicación de vértices.
 * - Convierte TODOS los atributos a BufferAttribute(Float32Array, normalized=false).
 *   (incluye InterleavedBufferAttribute y atributos cuantizados/normalizados)
 * - Elimina grupos e índice.
 * - Recalcula bounding box/sphere.
 *
 * Ojo: si luego sólo quieres `position`, bórralo fuera (lo hace extractMergedMesh).
 */
export function prepareForMerge(gIn: THREE.BufferGeometry): THREE.BufferGeometry {
    // 1) Trabajamos en una copia y forzamos NO indexada.
    const base = gIn.index ? gIn.toNonIndexed() : gIn.clone();

    // 2) Atributo -> BufferAttribute Float32 “plano”
    const toPlainFloat32 = (
        attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
    ): THREE.BufferAttribute => {
        // Interleaved -> desinterleave manual
        if ((attr as any).isInterleavedBufferAttribute) {
            const ia = attr as THREE.InterleavedBufferAttribute;
            const out = new Float32Array(ia.count * ia.itemSize);
            // getX/getY/getZ/getW están disponibles; para itemSize > 4 rellenamos 0.
            for (let i = 0; i < ia.count; i++) {
                for (let k = 0; k < ia.itemSize; k++) {
                    // Acceso seguro sin usar toArray()
                    let v = 0;
                    if (k === 0) v = ia.getX(i);
                    else if (k === 1) v = ia.getY(i);
                    else if (k === 2) v = ia.getZ(i);
                    else if (k === 3 && typeof (ia as any).getW === "function") v = (ia as any).getW(i);
                    out[i * ia.itemSize + k] = v;
                }
            }
            return new THREE.BufferAttribute(out, ia.itemSize, false);
        }

        // BufferAttribute normal
        const a = attr as THREE.BufferAttribute;
        // Si ya es Float32 y no está normalized, úsalo tal cual.
        if (a.array instanceof Float32Array && a.normalized === false) return a;

        const out = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) {
            for (let k = 0; k < a.itemSize; k++) {
                let v = 0;
                if (k === 0) v = a.getX(i);
                else if (k === 1) v = a.getY(i);
                else if (k === 2) v = a.getZ(i);
                else if (k === 3 && typeof (a as any).getW === "function") v = (a as any).getW(i);
                out[i * a.itemSize + k] = v;
            }
        }
        return new THREE.BufferAttribute(out, a.itemSize, false);
    };

    // 3) Reemplaza todos los atributos por su versión Float32 “plana”
    for (const name of Object.keys(base.attributes)) {
        const src = base.getAttribute(name) as any;
        if (!src) continue;
        base.setAttribute(name, toPlainFloat32(src));
    }

    // 4) Limpieza de grupos/índice (ya no hacen falta tras toNonIndexed)
    base.clearGroups();
    base.setIndex(null);

    // 5) Bounds
    base.computeBoundingBox?.();
    base.computeBoundingSphere?.();

    return base;
}

export default prepareForMerge;
