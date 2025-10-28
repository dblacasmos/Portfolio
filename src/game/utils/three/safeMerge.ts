import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function toFloat32(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
    if ((attr as any).isInterleavedBufferAttribute) {
        // des-interleave si hace falta
        const plain = (attr as THREE.InterleavedBufferAttribute).clone() as any;
        // @ts-ignore
        const arr = new Float32Array(plain.count * plain.itemSize);
        for (let i = 0; i < plain.count; i++) {
            for (let k = 0; k < plain.itemSize; k++) {
                arr[i * plain.itemSize + k] = plain.getX(i + (k || 0)); // acceso genérico
            }
        }
        return new THREE.BufferAttribute(arr, plain.itemSize, false);
    } else {
        const a = attr as THREE.BufferAttribute;
        if (a.array instanceof Float32Array && a.normalized === false) return a;
        const arr = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) {
            for (let k = 0; k < a.itemSize; k++) {
                arr[i * a.itemSize + k] = a.getX(i + (k || 0));
            }
        }
        return new THREE.BufferAttribute(arr, a.itemSize, false);
    }
}

export function normalizeGeometryAttributes(g: THREE.BufferGeometry) {
    const out = g.clone();
    for (const name of Object.keys(out.attributes)) {
        const attr = out.getAttribute(name) as any;
        out.setAttribute(name, toFloat32(attr));
    }
    // Índice en 32 bits si el total de vértices > 65535
    if (out.index && !(out.index.array instanceof Uint32Array)) {
        if (out.getAttribute("position").count > 65535) {
            const idx = out.index.array as ArrayLike<number>;
            out.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx as any), 1));
        }
    }
    return out;
}

export function safeMergeGeometries(geoms: THREE.BufferGeometry[], useGroups = false) {
    const norm = geoms.map(normalizeGeometryAttributes);
    return mergeGeometries(norm, useGroups);
}
