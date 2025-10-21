/* ====================================
   FILE: src/game/utils/three/tuneMaterials.ts
   ==================================== */
import * as THREE from 'three';
import { CFG } from '@/constants/config';

export function tuneMaterials(root: THREE.Object3D) {
  const maxAniso = Math.max(1, CFG.render?.maxAnisotropy ?? 4);
  const minMipmapSize = Math.max(0, (CFG as any)?.render?.minMipmapSize ?? 512);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const mat = (mesh as any).material;
    const applyTex = (t?: THREE.Texture) => {
      if (!t) return;
      // SRGB por defecto (aportado desde txSanitize.ts)
      (t as any).colorSpace = THREE.SRGBColorSpace;

      // Anisotropía segura
      t.anisotropy = Math.min(maxAniso, (t.anisotropy || maxAniso));

      // Inspección general
      const any: any = t;
      const isCompressed = any.isCompressedTexture === true;
      const w = any?.image?.width ?? 0;
      const h = any?.image?.height ?? 0;
      const isPOT = w > 0 && h > 0 && (w & (w - 1)) === 0 && (h & (h - 1)) === 0;

      // Reglas:
      // - Compressed (KTX2/Basis): no generes mipmaps; usa los del asset si existen
      // - NPOT: sin mipmaps + clamp
      // - Textura pequeña: sin mips para ahorrar VRAM (según minMipmapSize)
      t.magFilter = THREE.LinearFilter;

      if (isCompressed) {
        t.generateMipmaps = false;
        const hasMips = Array.isArray(any.mipmaps) && any.mipmaps.length > 1;
        t.minFilter = hasMips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
        // anisotropy bajo en comprimidas suele ser más estable
        t.anisotropy = Math.min(t.anisotropy, 4);
      } else if (!isPOT) {
        t.generateMipmaps = false;
        t.minFilter = THREE.LinearFilter;
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
      } else {
        const maxDim = Math.max(w, h);
        const allowMips = maxDim >= minMipmapSize;
        t.generateMipmaps = allowMips;
        t.minFilter = allowMips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      }

      t.needsUpdate = true;
    };
    if (Array.isArray(mat)) mat.forEach((m) => patchMat(m as any, applyTex));
    else if (mat) patchMat(mat as any, applyTex);
  });
}

function patchMat(mat: any, applyTex: (t?: THREE.Texture) => void) {
  if (!mat) return;
  // Evitar normalScale exagerado
  if (mat.normalScale && mat.normalScale.isVector2) {
    mat.normalScale.multiplyScalar(0.9);
  }
  // Posibles texturas
  applyTex(mat.map);
  applyTex(mat.normalMap);
  applyTex(mat.roughnessMap);
  applyTex(mat.metalnessMap);
  applyTex(mat.aoMap);
  applyTex(mat.emissiveMap);
  // campos “clearcoat*” usados por algunos modelos
  applyTex((mat as any).clearcoatMap);
  applyTex((mat as any).clearcoatRoughnessMap);
  applyTex((mat as any).clearcoatNormalMap);
  applyTex((mat as any).transmissionMap);
}
export default tuneMaterials;
