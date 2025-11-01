// src/game/utils/three/txSanitize.ts
import * as THREE from "three";

export function sanitizeMaterialTextures(mat: any) {
    const LinearCS = (THREE as any).LinearSRGBColorSpace ?? THREE.SRGBColorSpace;
    const setOne = (name: string, tx?: THREE.Texture | null) => {
        if (!tx) return;
        const isCompressed = (tx as any).isCompressedTexture === true;
        const hasMips = Array.isArray((tx as any).mipmaps) && (tx as any).mipmaps.length > 0;

        if (isCompressed) {
            // Nunca generes mipmaps en KTX2 aquí.
            tx.generateMipmaps = false;
            tx.minFilter = hasMips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
        }
        // Magnificación razonable
        tx.magFilter = THREE.LinearFilter;

        // Color space por tipo de mapa:
        // - Color albedo/emissive en sRGB
        // - Mapas de datos (normal, roughness, metalness, etc.) en Linear
        const colorMaps = new Set(["map", "emissiveMap"]);
        (tx as any).colorSpace = colorMaps.has(name)
            ? THREE.SRGBColorSpace
            : LinearCS;

        tx.needsUpdate = true;
    };

    const names = [
        "map", "emissiveMap",
        "normalMap", "metalnessMap", "roughnessMap", "aoMap",
        "clearcoatMap", "clearcoatRoughnessMap", "clearcoatNormalMap",
        "transmissionMap", "bumpMap", "displacementMap", "alphaMap"
    ];
    for (const n of names) setOne(n, (mat as any)[n]);

    // Warnings viejos de three
    if ((mat as any).index0AttributeName !== undefined) {
        delete (mat as any).index0AttributeName;
    }
}
