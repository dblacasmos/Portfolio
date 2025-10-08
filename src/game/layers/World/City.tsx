/* =========================================================
  FILE: src/game/layers/World/City.tsx
============================================================ */
import { useEffect, useMemo, useRef } from "react";
import { useDracoGLTF } from "@/hooks/useDracoKtx2GLTF";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CFG } from "../../../constants/config";
import { ASSETS } from "@/constants/assets";
import { extractMergedMesh } from "../../utils/three/geometry/extractMergedMesh";
import { setLayerRecursive } from "@/game/utils/three/layers";
import { optimizeStatic, tuneMaterials } from "../../utils/three/optimizeGLTF";
import { isKTX2Ready } from "@/game/utils/three/ktx2/ktx2";
import { prepareForMerge } from "@/game/utils/three/geometry/prepareForMerge";

// BVH (idempotente)
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
(THREE.BufferGeometry as any).prototype.computeBoundsTree ??= computeBoundsTree;
(THREE.BufferGeometry as any).prototype.disposeBoundsTree ??= disposeBoundsTree;
(THREE.Mesh as any).prototype.raycast ??= acceleratedRaycast;

const LAYER_WORLD = CFG.layers.WORLD;

// cacheamos el merge una sola vez (algunas builds exponen "mergeGeometries" y otras "mergeBufferGeometries")
const MERGE = (BufferGeometryUtils as any).mergeGeometries ?? (BufferGeometryUtils as any).mergeBufferGeometries;

export type CityReadyInfo = {
  groundMesh: THREE.Mesh | null;
  wallsMesh: THREE.Mesh | null;
  roadsMesh: THREE.Mesh | null;
  center: THREE.Vector2;
  radius: number;
  groundY: number;
  height: number;
  cityRoot: THREE.Object3D | null;
  // NUEVO: máscara de zonas prohibidas (mesa/ObjetoFinal)
  forbidMesh?: THREE.Mesh | null;
};

type CityProps = {
  onReady: (info: CityReadyInfo) => void;
  scale?: number;
};

/* ================= helpers (colliders + hull) ================= */

// Geometría limpia para colisiones: non-indexed + sólo position
function toColliderGeometry(src: THREE.BufferGeometry) {
  const g = prepareForMerge(src);
  Object.keys(g.attributes).forEach((n) => { if (n !== "position") (g as any).deleteAttribute(n); });
  g.computeBoundingBox?.();
  g.computeBoundingSphere?.();
  return g;
}

function mergeSafe(geoms: (THREE.BufferGeometry | null | undefined)[]) {
  const valid = geoms.filter(Boolean) as THREE.BufferGeometry[];
  if (!valid.length) return null;
  const cleaned = valid.map(toColliderGeometry);
  const merged = MERGE(cleaned, false) as THREE.BufferGeometry | null;
  const out = merged ?? cleaned[0].clone();
  out.computeBoundingBox?.();
  out.computeBoundingSphere?.();
  return out;
}

function dominantY(g?: THREE.BufferGeometry | null) {
  if (!g) return null;
  const pos = g.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return null;
  const map = new Map<number, number>(), kf = 1000;
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getY(i) * kf);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  let best: number | null = null, cnt = -1;
  map.forEach((c, k) => { if (c > cnt) { cnt = c; best = k; } });
  return best === null ? null : best / kf;
}

function convexHullXZ(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length <= 3) return points.slice();
  const P = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const p of P) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: THREE.Vector2[] = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

function decimateXZFromPositions(pos: THREE.BufferAttribute, every = 6): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pos.count; i += every) out.push(new THREE.Vector2(pos.getX(i), pos.getZ(i)));
  return out;
}

/* ---------- PBR + sombras del modelo ---------- */
// Ajustes rápidos por nombre para que el look PBR sea más creíble.
function prepareShadowsAndPBR(root: THREE.Object3D) {
  const isGlassName = (n: string) => /glass|vidrio|crystal/i.test(n);
  const isMetalName = (n: string) => /metal|steel|alumin|iron|chrome/i.test(n);
  const isVarnishName = (n: string) => /clearcoat|barniz|car[_-\s]?paint|paint/i.test(n);

  root.traverse((o: any) => {
    if (!o?.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;

    const mats: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const mat = m as any;
      if (!mat || !("metalness" in mat || "roughness" in mat)) continue;

      const name = (mat.name || o.name || "").toString();
      if (isMetalName(name)) {
        if (typeof mat.metalness === "number") mat.metalness = Math.max(mat.metalness, 0.9);
        if (typeof mat.roughness === "number") mat.roughness = Math.min(mat.roughness, 0.35);
        if ("envMapIntensity" in mat) mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1.0, 1.15);
      }
      if (isVarnishName(name)) {
        if ("clearcoat" in mat) mat.clearcoat = Math.max(mat.clearcoat ?? 0.8, 0.95);
        if ("clearcoatRoughness" in mat) mat.clearcoatRoughness = Math.min(mat.clearcoatRoughness ?? 0.15, 0.18);
        if ("envMapIntensity" in mat) mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1.0, 1.1);
      }
      if (isGlassName(name)) {
        if ("transmission" in mat) {
          mat.transmission = Math.max(mat.transmission ?? 0.8, 0.9);
          mat.thickness = Math.max(mat.thickness ?? 0.08, 0.12);
          mat.ior = mat.ior ?? 1.45;
          mat.attenuationColor = mat.attenuationColor ?? new THREE.Color("#a8d7ff");
          mat.attenuationDistance = mat.attenuationDistance ?? 2.5;
          mat.transparent = true;
          mat.depthWrite = false;
        } else {
          mat.transparent = true;
          mat.opacity = Math.min(mat.opacity ?? 0.6, 0.6);
          mat.depthWrite = false;
        }
        if (typeof mat.roughness === "number") mat.roughness = Math.min(mat.roughness, 0.15);
        if ("envMapIntensity" in mat) mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1.0, 1.2);
        (o as any).castShadow = false;
        (o as any).receiveShadow = true;
      }
      if ("toneMapped" in mat) mat.toneMapped = true;
      if ("fog" in mat) mat.fog = true;
      mat.needsUpdate = true;
    }
  });
}

/* ======== Prohibidos (mesa / ObjetoFinal …) ======== */
const isForbidden = (m: THREE.Mesh) => {
  const n = (m.name ?? "").toLowerCase();
  return n.includes("mesa") || n.includes("objetofinal") || n.includes("objectfinal");
};

// Extrae máscara unificada de zonas prohibidas aplicando transformaciones de mundo
function extractForbiddenMesh(scene: THREE.Object3D) {
  const geos: THREE.BufferGeometry[] = [];
  scene.traverse((o: any) => {
    if (!o?.isMesh || !isForbidden(o) || !o.geometry) return;
    o.updateWorldMatrix(true, false);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry).clone();
    g.applyMatrix4(o.matrixWorld);
    Object.keys(g.attributes).forEach((n) => { if (n !== "position") (g as any).deleteAttribute(n); });
    g.computeBoundingBox?.();
    g.computeBoundingSphere?.();
    geos.push(g);
  });
  if (!geos.length) return null;
  const geo = MERGE(geos, false) as THREE.BufferGeometry;
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })
  );
  (mesh.geometry as any).computeBoundsTree?.();
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrixWorld(true);
  mesh.layers.set(LAYER_WORLD);
  return mesh;
}

/* ======== Componente de debug (opcional) ======== */
function ForbidDebug({ mesh }: { mesh: THREE.Mesh | null }) {
  if (!mesh) return null;
  return <primitive object={mesh} />;
}

/* ========================================= */
export const City: React.FC<CityProps> = ({ onReady, scale = 1 }) => {
  const rootRef = useRef<THREE.Group>(null!);
  const { scene } = useDracoGLTF(ASSETS.models.city, {
    dracoPath: CFG.decoders.dracoPath,
    meshopt: true
  }) as any;

  // ► Detectores básicos de piezas del modelo
  const isGround = (m: THREE.Mesh) => {
    const n = (m.name ?? "").toLowerCase();
    return (
      n.includes("object_32") ||
      n.includes("ground") ||
      n.includes("floor") ||
      n.includes("suelo") ||
      n.includes("road") ||
      n.includes("carretera") ||
      n.includes("asfalt") ||
      n.includes("pavement") ||
      n.includes("calzada")
    );
  };
  const isWallsStrict = (m: THREE.Mesh) => {
    const n = (m.name ?? "").toLowerCase();
    return n === "objectfinal" || n.includes("objectfinal");
  };

  const groundMeshRaw = useMemo(() => extractMergedMesh(scene, isGround), [scene]);
  const wallsMeshRaw = useMemo(
    () => extractMergedMesh(scene, isWallsStrict) ?? extractMergedMesh(scene, (m) => !isGround(m)),
    [scene]
  );

  // Prepara capas, materiales y sombras una vez cargada la glTF
  useEffect(() => {
    if (!scene) return;
    setLayerRecursive(scene, LAYER_WORLD);
    optimizeStatic(scene);
    tuneMaterials(scene);
    prepareShadowsAndPBR(scene);
  }, [scene]);

  // Altura efectiva del suelo (con ajuste fino por config)
  const groundTopY = useMemo(() => {
    groundMeshRaw?.geometry.computeBoundingBox?.();
    const base = dominantY(groundMeshRaw?.geometry) ?? groundMeshRaw?.geometry.boundingBox?.min.y ?? 0;
    return base + (CFG.floorFill?.alignOffset ?? 0);
  }, [groundMeshRaw]);

  // Hull XZ de la ciudad (se usa como apoyo para cálculos de centro/radio)
  const hull = useMemo(() => {
    let pts: THREE.Vector2[] = [];
    if (groundMeshRaw?.geometry) {
      const pos = groundMeshRaw.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (pos) pts = decimateXZFromPositions(pos, 6);
    }
    if (!pts.length) {
      const b = new THREE.Box3().setFromObject(scene);
      pts = [
        new THREE.Vector2(b.min.x, b.min.z),
        new THREE.Vector2(b.max.x, b.min.z),
        new THREE.Vector2(b.max.x, b.max.z),
        new THREE.Vector2(b.min.x, b.max.z),
      ];
    }
    return convexHullXZ(pts);
  }, [groundMeshRaw, scene]);

  // AABB del modelo para centro y radio
  const sceneBox = useMemo(() => new THREE.Box3().setFromObject(scene), [scene]);

  const ringCenter = useMemo(() => {
    const c = sceneBox.getCenter(new THREE.Vector3());
    return new THREE.Vector2(c.x, c.z);
  }, [sceneBox]);

  // Radio = 1/2 diagonal XZ del AABB
  const radiusWall = useMemo(() => {
    const width = sceneBox.max.x - sceneBox.min.x;
    const depth = sceneBox.max.z - sceneBox.min.z;
    return Math.sqrt(width * width + depth * depth) * 0.5;
  }, [sceneBox]);

  const ringRadius = radiusWall;
  const offset = useMemo(() => new THREE.Vector3(-ringCenter.x, 0, -ringCenter.y), [ringCenter]);

  // Alturas de paredes (cap superior opcional)
  const wallHeightRaw = useMemo(() => {
    const extra = CFG.bounds.heightExtra ?? 0;
    const hModel = Math.max(0, sceneBox.max.y - groundTopY);
    const minH = CFG.bounds.height ?? 0;
    return Math.max(hModel + extra, minH);
  }, [sceneBox, groundTopY]);

  // Tope visual para evitar paredes absurdamente altas
  const WALL_MAX_HEIGHT = 1.2;
  const wallHeight = useMemo(() => Math.min(WALL_MAX_HEIGHT, wallHeightRaw), [wallHeightRaw]);

  /* ====== Pared perimetral RECTANGULAR (AABB) ======
     La pared ocupa hacia el INTERIOR del AABB (controlado por wallThicknessIn).
     Se puede empujar la caja hacia fuera con wallOffsetOut. */
  const wallRectGeo = useMemo(() => {
    if (!scene) return null;
    const b = new THREE.Box3().setFromObject(scene);
    let minX = b.min.x, maxX = b.max.x, minZ = b.min.z, maxZ = b.max.z;

    const thickIn = (CFG as any)?.bounds?.wallThicknessIn ?? (CFG as any)?.bounds?.wallThickness ?? 0.8;
    const pushOut = Math.max(0, (CFG as any)?.bounds?.wallOffsetOut ?? 0.0);

    const height = wallHeight;
    const yMid = groundTopY + height * 0.5;

    minX -= pushOut; maxX += pushOut; minZ -= pushOut; maxZ += pushOut;
    const width = (maxX - minX);
    const depth = (maxZ - minZ);

    const geos: THREE.BufferGeometry[] = [];
    // Norte (+Z)
    geos.push(new THREE.BoxGeometry(width, height, thickIn).translate(minX + width * 0.5, yMid, maxZ - thickIn * 0.5));
    // Sur (-Z)
    geos.push(new THREE.BoxGeometry(width, height, thickIn).translate(minX + width * 0.5, yMid, minZ + thickIn * 0.5));
    // Este (+X)
    geos.push(new THREE.BoxGeometry(thickIn, height, depth).translate(maxX - thickIn * 0.5, yMid, minZ + depth * 0.5));
    // Oeste (-X)
    geos.push(new THREE.BoxGeometry(thickIn, height, depth).translate(minX + thickIn * 0.5, yMid, minZ + depth * 0.5));

    // “Techo” fino para evitar escapes por arriba
    const ceilThick = Math.max(0.08, Math.min(0.2, thickIn * 0.25));
    geos.push(
      new THREE.BoxGeometry(width + thickIn * 2, ceilThick, depth + thickIn * 2)
        .translate(minX + width * 0.5, groundTopY + height + ceilThick * 0.5, minZ + depth * 0.5)
    );

    return MERGE(geos, false) as THREE.BufferGeometry;
  }, [scene, groundTopY, wallHeight]);

  // “Safety floor” (visual y bloqueante) que no pisa los muros
  const safetyFloorGeo = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const margin = (CFG as any)?.bounds?.margin ?? 2;
    const thickY = 0.2;
    const thickIn = (CFG as any)?.bounds?.wallThicknessIn ?? (CFG as any)?.bounds?.wallThickness ?? 0.8;

    const fullW = (b.max.x - b.min.x) + margin * 2;
    const fullD = (b.max.z - b.min.z) + margin * 2;

    const innerW = Math.max(0.1, fullW - thickIn * 2);
    const innerD = Math.max(0.1, fullD - thickIn * 2);

    const cx = (b.min.x + b.max.x) * 0.5;
    const cz = (b.min.z + b.max.z) * 0.5;

    return new THREE.BoxGeometry(innerW, thickY, innerD).translate(
      cx,
      groundTopY - thickY * 0.5,
      cz
    );
  }, [scene, groundTopY]);

  const safetyFloorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x2e2e2e, roughness: 0.9, metalness: 0.0 }),
    []
  );

  const safetyFloorVisual = useMemo<THREE.Mesh | null>(() => {
    if (!safetyFloorGeo) return null;
    const m = new THREE.Mesh(safetyFloorGeo, safetyFloorMat);
    m.receiveShadow = true;
    m.castShadow = false;
    m.layers.set(LAYER_WORLD);
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    return m;
  }, [safetyFloorGeo, safetyFloorMat]);

  // Colliders
  const wallsMesh = useMemo(() => {
    const geo = mergeSafe([wallsMeshRaw?.geometry, wallRectGeo]);
    if (!geo) return null;
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
    );
    (m.geometry as any).computeBoundsTree?.();
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    m.layers.set(LAYER_WORLD);
    return m;
  }, [wallsMeshRaw, wallRectGeo]);

  const groundMesh = useMemo(() => {
    const geo = mergeSafe([groundMeshRaw?.geometry, safetyFloorGeo]);
    if (!geo) return null;
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })
    );
    (m.geometry as any).computeBoundsTree?.();
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    m.layers.set(LAYER_WORLD);
    return m;
  }, [groundMeshRaw, safetyFloorGeo]);

  const roadsMesh = useMemo(() => {
    if (!groundMeshRaw?.geometry) return null;
    const geo = toColliderGeometry(groundMeshRaw.geometry);
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })
    );
    (m.geometry as any).computeBoundsTree?.();
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    m.layers.set(LAYER_WORLD);
    return m;
  }, [groundMeshRaw]);

  const forbidMesh = useMemo(() => extractForbiddenMesh(scene), [scene]);

  // Debug opcional de zonas prohibidas
  const forbidDebugMesh = useMemo<THREE.Mesh | null>(() => {
    if (!forbidMesh) return null;
    const mat = new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.12 });
    return new THREE.Mesh(forbidMesh.geometry, mat);
  }, [forbidMesh]);

  // READY: informamos al resto del juego
  useEffect(() => {
    onReady({
      groundMesh: groundMesh ?? null,
      wallsMesh: wallsMesh ?? null,
      roadsMesh: roadsMesh ?? null,
      center: new THREE.Vector2(0, 0), // el grupo se offsetea al montar
      radius: ringRadius,
      groundY: groundTopY,
      height: wallHeight,
      cityRoot: rootRef.current ?? null,
      forbidMesh: forbidMesh ?? null,
    });
  }, [groundMesh, wallsMesh, roadsMesh, ringRadius, groundTopY, wallHeight, forbidMesh, onReady]);

  const SHOW_FORBID_DEBUG = Boolean((CFG as any)?.debug?.showForbidMask);

  return (
    <group ref={rootRef} position={offset} scale={scale}>
      <primitive object={scene} />
      {groundMesh && <primitive object={groundMesh} />}
      {wallsMesh && <primitive object={wallsMesh} />}
      {safetyFloorVisual && <primitive object={safetyFloorVisual} />}
      {SHOW_FORBID_DEBUG ? <ForbidDebug mesh={forbidDebugMesh} /> : null}
    </group>
  );
};

// ► Preload consistente (usamos ASSETS.models.city como arriba)
const __preloadCity = () => (useDracoGLTF as any).preload(ASSETS.models.city, {
  dracoPath: CFG.decoders.dracoPath,
  meshopt: true,
});
if (isKTX2Ready()) {
  __preloadCity();
} else if (typeof window !== "undefined") {
  window.addEventListener("ktx2-ready", __preloadCity, { once: true });
}
export default City;
