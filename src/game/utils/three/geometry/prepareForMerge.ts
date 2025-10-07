import * as THREE from "three";

/** Convierte un BufferAttribute (pos/normal/uv/color) a Float32 des-normalizando si hace falta. */
function toFloat32(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
    const itemSize = attr.itemSize;
    const count = attr.count;
    const out = new THREE.Float32BufferAttribute(count * itemSize, itemSize);
    for (let i = 0; i < count; i++) {
        // getX/getY respetan attr.normalized → valores ya des-normalizados
        if (itemSize >= 1) out.setX(i, (attr as any).getX(i));
        if (itemSize >= 2) out.setY(i, (attr as any).getY(i));
        if (itemSize >= 3) out.setZ(i, (attr as any).getZ(i));
        if (itemSize >= 4) out.setW(i, (attr as any).getW(i));
    }
    out.normalized = false;
    return out;
}

/** Clona geo, la pasa a no indexada y convierte los atributos clave a Float32. */
export function prepareForMerge(geoIn: THREE.BufferGeometry): THREE.BufferGeometry {
    let g = geoIn.index ? geoIn.toNonIndexed() : geoIn.clone();
    const keep: Array<keyof THREE.BufferGeometry["attributes"]> = ["position", "normal", "uv", "color"];

    for (const name of keep) {
        const attr = g.getAttribute(name as any);
        if (attr) g.setAttribute(name as any, toFloat32(attr));
    }

    // Quita atributos problemáticos que no estén en todas o tengan tamaños raros
    for (const key of Object.keys(g.attributes)) {
        const a = g.getAttribute(key);
        if (!a || (key !== "position" && key !== "normal" && key !== "uv" && key !== "color")) {
            g.deleteAttribute(key);
        }
    }

    // Asegura bounding info
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
}

/** Calcula el conjunto común de atributos y lo aplica a todas (elimina los que no coinciden). */
export function harmonizeAttributesForMerge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
    const names = ["position", "normal", "uv", "color"];
    const common = new Set<string>(names);
    for (const g of geos) {
        for (const n of names) {
            if (!g.getAttribute(n)) common.delete(n);
        }
    }
    const out: THREE.BufferGeometry[] = [];
    for (const g of geos) {
        const cg = g.clone();
        for (const n of names) {
            if (!common.has(n)) cg.deleteAttribute(n);
        }
        out.push(cg);
    }
    return out;
}
