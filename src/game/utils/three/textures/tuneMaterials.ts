/* ====================================
   FILE: src/game/utils/three/tuneMaterials.ts
   ==================================== */
import * as THREE from 'three'
import { CFG } from '@/constants/config'

/**
 * Ajusta materiales y texturas de un subárbol:
 * - Limita anisotropía según CFG.render.maxAnisotropy
 * - Desactiva mipmaps en texturas pequeñas (CFG.render.minMipmapSize)
 * - Evita normalScale excesivo
 * - No vuelve a retocar materiales ya procesados
 */
export function tuneMaterials(root: THREE.Object3D) {
  const maxAniso = Math.max(1, CFG.render?.maxAnisotropy ?? 4)
  const minMipmapSize = Math.max(0, (CFG as any)?.render?.minMipmapSize ?? 512)

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const mat = mesh?.material as THREE.Material | THREE.Material[] | undefined
    if (!mat) return

    const applyTex = (t?: THREE.Texture) => {
      if (!t) return

      // Si ya tiene anisotropía mayor, respetamos la existente
      t.anisotropy = Math.min(maxAniso, t.anisotropy || maxAniso)

      // Política de mipmaps/filtros coherente con el tamaño real.
      const isCompressed = (t as any).isCompressedTexture === true
      let wantMips = false
      if (!isCompressed) {
        const w = (t as any)?.image?.width ?? 0
        const h = (t as any)?.image?.height ?? 0
        const maxDim = Math.max(w, h)
        wantMips = maxDim >= minMipmapSize
        t.generateMipmaps = wantMips
      } else {
        // En texturas comprimidas (KTX2) no generamos mipmaps aquí.
        t.generateMipmaps = false
      }

      // minFilter coherente:
      // - con mipmaps: usar filtro con mipmaps
      // - sin mipmaps: evitar filtros *Mipmap*
      if (wantMips) {
        if (
          t.minFilter === THREE.NearestFilter ||
          t.minFilter === THREE.LinearFilter
        ) {
          t.minFilter = THREE.LinearMipmapLinearFilter
        }
      } else {
        if (
          t.minFilter === THREE.LinearMipmapLinearFilter ||
          t.minFilter === THREE.NearestMipmapNearestFilter ||
          t.minFilter === THREE.NearestMipmapLinearFilter ||
          t.minFilter === THREE.LinearMipmapNearestFilter
        ) {
          t.minFilter = THREE.LinearFilter
        }
      }

      // Suavizado razonable para magnificación
      t.magFilter = THREE.LinearFilter

      t.needsUpdate = true
    }

    const patchOne = (m: THREE.Material) => {
      // Evita reprocesar materiales compartidos múltiples veces
      if ((m.userData && m.userData.__tuned) || !('type' in m)) return
      if (!m.userData) (m.userData = {})
      m.userData.__tuned = true

      // Normal scale algo más comedida
      // @ts-expect-error acceso opcional por tipo de material
      if (m.normalScale && (m.normalScale as THREE.Vector2).isVector2) {
        // @ts-expect-error normalScale es Vector2 en materiales estándar
        m.normalScale.multiplyScalar(0.9)
      }

      // Recorrer mapas comunes (PBR estándar + variantes frecuentes)
      // @ts-expect-error propiedades específicas según material
      applyTex(m.map)
      // @ts-expect-error
      applyTex(m.normalMap)
      // @ts-expect-error
      applyTex(m.roughnessMap)
      // @ts-expect-error
      applyTex(m.metalnessMap)
      // @ts-expect-error
      applyTex(m.aoMap)
      // @ts-expect-error
      applyTex(m.emissiveMap)
      // Extras habituales:
      // @ts-expect-error
      applyTex(m.bumpMap)
      // @ts-expect-error
      applyTex(m.displacementMap)
      // @ts-expect-error
      applyTex(m.alphaMap)
      // @ts-expect-error
      applyTex(m.clearcoatMap)
      // @ts-expect-error
      applyTex(m.clearcoatNormalMap)
      // @ts-expect-error
      applyTex(m.clearcoatRoughnessMap)
      // @ts-expect-error
      applyTex(m.sheenColorMap)
      // @ts-expect-error
      applyTex(m.sheenRoughnessMap)

      m.needsUpdate = true
    }

    if (Array.isArray(mat)) {
      for (const m of mat) patchOne(m)
    } else {
      patchOne(mat)
    }
  })
}

export default tuneMaterials
