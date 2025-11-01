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

// BVH (idempotente)
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
(THREE.BufferGeometry as any).prototype.computeBoundsTree ??= computeBoundsTree;
(THREE.BufferGeometry as any).prototype.disposeBoundsTree ??= disposeBoundsTree;
(THREE.Mesh as any).prototype.raycast ??= acceleratedRaycast;

const CITY_URL = ASSETS.models.city;
const LAYER_WORLD = CFG.layers.WORLD;

export type CityReadyInfo = {
  groundMesh: THREE.Mesh | null;
  wallsMesh: THREE.Mesh | null;
  roadsMesh: THREE.Mesh | null;
  center: THREE.Vector2;
  radius: number;
  groundY: number;
  height: number;
  cityRoot: THREE.Object3D | null;
  // NUEVO:
  forbidMesh?: THREE.Mesh | null;
};

type CityProps = {
  onReady: (info: CityReadyInfo) => void;
  scale?: number;
};

/* ================= helpers (colliders + hull) ================= */
function toColliderGeometry(src: THREE.BufferGeometry) {
  const base = src.clone();
  const g = base.index ? base.toNonIndexed() : base;
  Object.keys(g.attributes).forEach((n) => {
    if (n !== "position") (g as any).deleteAttribute(n);
  });
  g.computeBoundingBox?.();
  g.computeBoundingSphere?.();
  return g;
}
function mergeSafe(geoms: (THREE.BufferGeometry | null | undefined)[]) {
  const valid = geoms.filter(Boolean) as THREE.BufferGeometry[];
  if (!valid.length) return null;
  const cleaned = valid.map(toColliderGeometry);
  const mergeFn =
    (BufferGeometryUtils as any).mergeGeometries ??
    (BufferGeometryUtils as any).mergeBufferGeometries;
  const merged = mergeFn(cleaned, false) as THREE.BufferGeometry | null;
  const out = merged ?? cleaned[0].clone();
  out.computeBoundingBox?.();
  out.computeBoundingSphere?.();
  return out;
}
function dominantY(g?: THREE.BufferGeometry | null) {
  if (!g) return null;
  const pos = g.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) return null;
  const map = new Map<number, number>(),
    kf = 1000;
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getY(i) * kf);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  let best: number | null = null,
    cnt = -1;
  map.forEach((c, k) => {
    if (c > cnt) {
      cnt = c;
      best = k;
    }
  });
  return best === null ? null : best / kf;
}
function convexHullXZ(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length <= 3) return points.slice();
  const P = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const p of P) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: THREE.Vector2[] = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
function decimateXZFromPositions(pos: THREE.BufferAttribute, every = 6): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pos.count; i += every)
    out.push(new THREE.Vector2(pos.getX(i), pos.getZ(i)));
  return out;
}
function pointInPoly(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i],
      pj = poly[j];
    const intersect =
      (pi.y > p.y) !== (pj.y > p.y) &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/* ---------- PBR + sombras del modelo ---------- */
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

function extractForbiddenMesh(scene: THREE.Object3D) {
  const geos: THREE.BufferGeometry[] = [];
  scene.traverse((o: any) => {
    if (!o?.isMesh) return;
    if (!isForbidden(o)) return;
    if (!o.geometry) return;
    o.updateWorldMatrix(true, false);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry).clone();
    // aplicar transformaciones de mundo para una máscara precisa
    g.applyMatrix4(o.matrixWorld);
    // dejar solo position
    Object.keys(g.attributes).forEach((n) => {
      if (n !== "position") (g as any).deleteAttribute(n);
    });
    g.computeBoundingBox?.();
    g.computeBoundingSphere?.();
    geos.push(g);
  });
  if (!geos.length) return null;
  const mergeFn =
    (BufferGeometryUtils as any).mergeGeometries ??
    (BufferGeometryUtils as any).mergeBufferGeometries;
  const geo = mergeFn(geos, false) as THREE.BufferGeometry;
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })
  );
  (mesh.geometry as any).computeBoundsTree?.(); // BVH
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrixWorld(true);
  mesh.layers.set(LAYER_WORLD);
  return mesh;
}

/* ======== Componente auxiliar para debug ======== */
function ForbidDebug({ mesh }: { mesh: THREE.Mesh | null }) {
  if (!mesh) return null;
  return <primitive object={mesh} />;
}

/* ========================================= */
export const City: React.FC<CityProps> = ({ onReady, scale = 1 }) => {
  const rootRef = useRef<THREE.Group>(null!);
  // evita no-used-locals si el proyecto lo tiene activado
  const { gl: _gl } = useThree();
  const { scene } = useDracoGLTF(CITY_URL);

  // Suelo/carretera
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

  // Paredes del modelo (si las hay)
  const isWallsStrict = (m: THREE.Mesh) => {
    const n = (m.name ?? "").toLowerCase();
    return n === "objectfinal" || n.includes("objectfinal");
  };

  const groundMeshRaw = useMemo(() => extractMergedMesh(scene, isGround), [scene]);
  const wallsMeshRaw = useMemo(
    () => extractMergedMesh(scene, isWallsStrict) ?? extractMergedMesh(scene, (m) => !isGround(m)),
    [scene]
  );

  useEffect(() => {
    if (!scene) return;
    setLayerRecursive(scene, LAYER_WORLD);
    optimizeStatic(scene);
    tuneMaterials(scene);
    prepareShadowsAndPBR(scene);
  }, [scene]);

  const groundTopY = useMemo(() => {
    groundMeshRaw?.geometry.computeBoundingBox?.();
    const base =
      dominantY(groundMeshRaw?.geometry) ?? groundMeshRaw?.geometry.boundingBox?.min.y ?? 0;
    return base + (CFG.floorFill?.alignOffset ?? 0);
  }, [groundMeshRaw]);

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

  const ringCenter = useMemo(
    () =>
      new THREE.Vector2(
        hull.reduce((a, p) => a + p.x, 0) / hull.length,
        hull.reduce((a, p) => a + p.y, 0) / hull.length
      ),
    [hull]
  );

  // Radio real hasta el borde (sin márgenes añadidos)
  const radiusWall = useMemo(
    () => hull.reduce((r, p) => Math.max(r, p.distanceTo(ringCenter)), 0),
    [hull, ringCenter]
  );

  const ringRadius = radiusWall;
  const offset = useMemo(() => new THREE.Vector3(-ringCenter.x, 0, -ringCenter.y), [ringCenter]);

  const sceneBox = useMemo(() => new THREE.Box3().setFromObject(scene), [scene]);

  // ===== Altura de paredes =====
  const wallHeightRaw = useMemo(() => {
    const extra = CFG.bounds.heightExtra ?? 0;
    const hModel = Math.max(0, sceneBox.max.y - groundTopY);
    const minH = CFG.bounds.height ?? 0;
    return Math.max(hModel + extra, minH);
  }, [sceneBox, groundTopY]);

  const wallHeight = useMemo(() => {
    const desiredTopY = ((CFG as any)?.bounds?.minTopY ?? 5.0);
    const minHeightToReach = Math.max(0, desiredTopY - groundTopY);
    return Math.max(wallHeightRaw, minHeightToReach);
  }, [wallHeightRaw, groundTopY]);

  /* ====== Pared perimetral RECTANGULAR (AABB) pegada al borde del modelo ====== */
  const wallRectGeo = useMemo(() => {
    if (!hull.length) return null;
    // AABB del perímetro XZ del modelo
    let minX = +Infinity, maxX = -Infinity, minZ = +Infinity, maxZ = -Infinity;
    for (const p of hull) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minZ) minZ = p.y;
      if (p.y > maxZ) maxZ = p.y;
    }

    // Paredes más anchas y desplazadas ligeramente hacia fuera
    const thick = (CFG as any)?.bounds?.wallThickness ?? 0.8;
    const pushOut = Math.max(0, (CFG as any)?.bounds?.wallOffsetOut ?? 0.6);

    // Usamos la altura garantizada
    const height = wallHeight;
    const yMid = groundTopY + height * 0.5;

    // Empujar ligeramente hacia fuera para “pegar” al borde exterior
    minX -= pushOut; maxX += pushOut; minZ -= pushOut; maxZ += pushOut;
    const width = (maxX - minX);
    const depth = (maxZ - minZ);

    const geos: THREE.BufferGeometry[] = [];
    // Norte (+Z)
    geos.push(new THREE.BoxGeometry(width, height, thick).translate(minX + width * 0.5, yMid, maxZ + thick * 0.5));
    // Sur (-Z)
    geos.push(new THREE.BoxGeometry(width, height, thick).translate(minX + width * 0.5, yMid, minZ - thick * 0.5));
    // Este (+X)
    geos.push(new THREE.BoxGeometry(thick, height, depth).translate(maxX + thick * 0.5, yMid, minZ + depth * 0.5));
    // Oeste (-X)
    geos.push(new THREE.BoxGeometry(thick, height, depth).translate(minX - thick * 0.5, yMid, minZ + depth * 0.5));

    // Techo invisible fino para evitar cualquier escape por arriba
    const ceilThick = Math.max(0.08, Math.min(0.2, thick * 0.25));
    geos.push(new THREE.BoxGeometry(width + thick * 2, ceilThick, depth + thick * 2)
      .translate(minX + width * 0.5, groundTopY + height + ceilThick * 0.5, minZ + depth * 0.5));

    const mergeFn =
      (BufferGeometryUtils as any).mergeGeometries ??
      (BufferGeometryUtils as any).mergeBufferGeometries;
    return mergeFn(geos, false) as THREE.BufferGeometry;
  }, [hull, groundTopY, wallHeight]);

  // “Safety floor” fino por si quedaran agujeros del modelo fuera de la calzada
  const safetyFloorGeo = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene);
    const margin = CFG.bounds.margin ?? 2,
      thick = 0.2;
    const w = b.max.x - b.min.x + margin * 2;
    const d = b.max.z - b.min.z + margin * 2;
    return new THREE.BoxGeometry(w, thick, d).translate(
      (b.min.x + b.max.x) * 0.5,
      groundTopY - thick * 0.5,
      (b.min.z + b.max.z) * 0.5
    );
  }, [scene, groundTopY]);

  //  Collider de paredes (modelo + rectángulo AABB)
  const wallsMesh = useMemo(() => {
    const geo = mergeSafe([wallsMeshRaw?.geometry, wallRectGeo]);
    if (!geo) return null;
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      })
    );
    (m.geometry as any).computeBoundsTree?.();
    m.matrixAutoUpdate = false;
    m.updateMatrixWorld(true);
    m.layers.set(LAYER_WORLD);
    return m;
  }, [wallsMeshRaw, wallRectGeo]);

  //  Collider de suelo (con safety floor, para player/caídas)
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

  //  Máscara de “suelo real” (sin safety floor) para proyecciones
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

  // Máscara de “prohibidos” (mesa/ObjetoFinal)
  const forbidMesh = useMemo(() => extractForbiddenMesh(scene), [scene]);

  // Debug mesh preconstruido (narrowing correcto)
  const forbidDebugMesh = useMemo<THREE.Mesh | null>(() => {
    if (!forbidMesh) return null;
    const mat = new THREE.MeshBasicMaterial({
      color: 0x880000,
      transparent: true,
      opacity: 0.12,
    });
    return new THREE.Mesh(forbidMesh.geometry, mat);
  }, [forbidMesh]);

  // READY
  useEffect(() => {
    onReady({
      groundMesh: groundMesh ?? null,
      wallsMesh: wallsMesh ?? null,
      roadsMesh: roadsMesh ?? null,
      center: new THREE.Vector2(0, 0), // por el offset
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

      {/* Debug visual opcional de “prohibidos” */}
      {SHOW_FORBID_DEBUG ? <ForbidDebug mesh={forbidDebugMesh} /> : null}
    </group>
  );
};

// ✔ preload con el hook tipado (sin argumentos extra)
useDracoGLTF.preload(CITY_URL);

export default City;
