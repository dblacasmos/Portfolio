// =======================================
// FILE: src/game/utils/three/txSanitize.ts
// =======================================
import * as THREE from "three";

/**
 * Ajustes seguros para texturas en materiales (especialmente KTX2).
 * No genera mipmaps en comprimidas; fuerza sRGB y filtros coherentes.
 */
export function sanitizeMaterialTextures(mat: any) {
    const touch = (tx?: THREE.Texture | null) => {
        if (!tx) return;
        const isCompressed = (tx as any).isCompressedTexture === true;
        const hasMips = Array.isArray((tx as any).mipmaps) && (tx as any).mipmaps.length > 0;

        if (isCompressed) {
            tx.generateMipmaps = false; // KTX2 ya trae mipmaps si los tiene
            tx.minFilter = hasMips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
            tx.magFilter = THREE.LinearFilter;
            (tx as any).anisotropy = 1;
        }
        (tx as any).colorSpace = THREE.SRGBColorSpace;
        tx.needsUpdate = true;
    };

    touch(mat.map);
    touch(mat.normalMap);
    touch(mat.metalnessMap);
    touch(mat.roughnessMap);
    touch(mat.aoMap);
    touch(mat.emissiveMap);
    touch(mat.clearcoatMap);
    touch(mat.clearcoatRoughnessMap);
    touch(mat.clearcoatNormalMap);
    touch(mat.transmissionMap);

    // Limpieza de propiedades antiguas de three
    if ((mat as any).index0AttributeName !== undefined) {
        delete (mat as any).index0AttributeName;
    }
}
