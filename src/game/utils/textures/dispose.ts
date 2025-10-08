// =======================================
// FILE: src/game/utils/three/dispose.ts
// =======================================
import * as THREE from "three";

/** Libera geometrías, materiales y texturas dentro de un árbol Object3D. */
export function disposeObject3D(root: THREE.Object3D) {
    root.traverse((o: any) => {
        // Geometrías
        if (o.geometry) {
            try { o.geometry.dispose?.(); } catch { }
        }
        // Material(es) + texturas habituales
        if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
                try {
                    ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap", "alphaMap", "envMap"]
                        .forEach((k) => { try { m?.[k]?.dispose?.(); } catch { } });
                    m.dispose?.();
                } catch { }
            }
        }
    });
}

/** Libera un render target si existe (postprocesado, etc.). */
export function disposeRT(rt?: THREE.WebGLRenderTarget | null) {
    if (!rt) return;
    try { rt.dispose?.(); } catch { }
}
