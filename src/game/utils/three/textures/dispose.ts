import type {
    Texture,
    BufferGeometry,
    Material,
    WebGLRenderTarget,
} from "three";

// Evita doble liberación de recursos compartidos
const seenGeometries = new WeakSet<BufferGeometry>();
const seenMaterials = new WeakSet<Material>();
const seenTextures = new WeakSet<Texture>();

const MAP_KEYS: (keyof Material | string)[] = [
    // Color
    "map", "emissiveMap",
    // PBR típicos
    "normalMap", "roughnessMap", "metalnessMap", "aoMap",
    // Extras frecuentes
    "alphaMap", "envMap", "bumpMap", "displacementMap",
    "clearcoatMap", "clearcoatRoughnessMap", "clearcoatNormalMap",
    "transmissionMap", "specularMap", "sheenColorMap", "sheenRoughnessMap",
];

function disposeTexture(tx?: Texture | null): void {
    if (!tx || seenTextures.has(tx)) return;
    try { tx.dispose?.(); } catch { }
    seenTextures.add(tx);
}

function disposeMaterial(mat?: Material | null): void {
    if (!mat || seenMaterials.has(mat)) return;
    try {
        for (const key of MAP_KEYS) {
            // @ts-expect-error acceso laxo por tipo de material
            const maybeTx = mat[key] as Texture | undefined;
            disposeTexture(maybeTx);
        }
        mat.dispose?.();
    } catch { }
    seenMaterials.add(mat);
}

function disposeGeometry(geo?: BufferGeometry | null): void {
    if (!geo || seenGeometries.has(geo)) return;
    try { geo.dispose?.(); } catch { }
    seenGeometries.add(geo);
}

/** Libera geometrías, materiales y texturas dentro de un árbol Object3D. */
export function disposeObject3D(root: any): void {
    root.traverse((o: any) => {
        // Geometría (incluye InstancedMesh.geometry)
        if (o.geometry) disposeGeometry(o.geometry);

        // Material o array de materiales
        if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) disposeMaterial(m);
        }
    });
}

/** Libera un render target si existe (postprocesado, etc.). */
export function disposeRT(
    rt?:
        | WebGLRenderTarget
        | { texture?: Texture | Texture[]; dispose?: () => void }
        | null
): void {
    if (!rt) return;
    try {
        const tex = (rt as any).texture as Texture | Texture[] | undefined;
        if (Array.isArray(tex)) {
            for (const t of tex) disposeTexture(t);
        } else {
            disposeTexture(tex);
        }
    } catch { }
    try { (rt as any).dispose?.(); } catch { }
}

export default { disposeObject3D, disposeRT };