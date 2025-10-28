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
      t.anisotropy = Math.min(maxAniso, (t.anisotropy || maxAniso));
      const w = (t as any)?.image?.width ?? minMipmapSize;
      const h = (t as any)?.image?.height ?? minMipmapSize;
      const maxDim = Math.max(w, h);
      // small texture mipmaps policy: disable mipmaps for small textures to save VRAM
      t.generateMipmaps = maxDim >= minMipmapSize;
      t.magFilter = THREE.LinearFilter;
      if (t.minFilter === THREE.NearestFilter) t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
    };
    if (Array.isArray(mat)) mat.forEach((m) => patchMat(m as any, applyTex));
    else if (mat) patchMat(mat as any, applyTex);
  });
}

function patchMat(mat: any, applyTex: (t?: THREE.Texture)=>void) {
  if (!mat) return;
  // Colores en sRGB
  if ('color' in mat && mat.color && mat.color.isColor && typeof mat.color.convertSRGBToLinear === 'function') {
    // mantener los valores; R3F/Three ya gestionan espacio de color moderno
  }
  // Evitar normalScale exagerado
  if (mat.normalScale && mat.normalScale.isVector2) {
    mat.normalScale.multiplyScalar(0.9);
  }
  // Recorrer posibles texturas
  applyTex(mat.map);
  applyTex(mat.normalMap);
  applyTex(mat.roughnessMap);
  applyTex(mat.metalnessMap);
  applyTex(mat.aoMap);
  applyTex(mat.emissiveMap);
}
export default tuneMaterials;
