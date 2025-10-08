// =======================================
// FILE: src/game/utils/three/colliderEnvBVH.ts
// =======================================
import * as THREE from "three";
import { ensureBVH } from "./ensureBVH"; // ← ruta corregida
import { CFG } from "@/constants/config";

/* ---------- utilidades geométricas ---------- */
function closestPointsSegSeg(
    p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3,
    outP1: THREE.Vector3, outP2: THREE.Vector3
): number {
    TMP.v1.subVectors(q1, p1);
    TMP.v2.subVectors(q2, p2);
    TMP.v3.subVectors(p1, p2);
    const d1 = TMP.v1, d2 = TMP.v2, r = TMP.v3;
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);
    let s: number, t: number;

    if (a <= 1e-12 && e <= 1e-12) { outP1.copy(p1); outP2.copy(p2); return outP1.distanceTo(outP2); }
    if (a <= 1e-12) { s = 0; t = THREE.MathUtils.clamp(f / e, 0, 1); }
    else {
        const c = d1.dot(r);
        if (e <= 1e-12) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
        else {
            const b = d1.dot(d2);
            const denom = a * e - b * b;
            s = denom !== 0 ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
            const tNom = b * s + f;
            if (tNom <= 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
            else if (tNom >= e) { t = 1; s = THREE.MathUtils.clamp((b - c) / a, 0, 1); }
            else { t = tNom / e; }
        }
    }
    outP1.copy(d1).multiplyScalar(s).add(p1);
    outP2.copy(d2).multiplyScalar(t).add(p2);
    return outP1.distanceTo(outP2);
}

function distanceTriangleSegment(
    tri: THREE.Triangle, s0: THREE.Vector3, s1: THREE.Vector3,
    outTri: THREE.Vector3, outSeg: THREE.Vector3
): number {
    const dir = TMP.v1.subVectors(s1, s0);
    const len = dir.length();
    if (len > 1e-12) {
        dir.multiplyScalar(1 / len);
        const ray = TMP.ray.set(s0, dir);
        const ip = ray.intersectTriangle(tri.a, tri.b, tri.c, false, TMP.v2.set(0, 0, 0));
        if (ip) {
            const t = TMP.v3.subVectors(ip, s0).dot(dir);
            if (t >= 0 && t <= len) { outTri.copy(ip); outSeg.copy(ip); return 0; }
        }
    }
    const cp0 = tri.closestPointToPoint(s0, TMP.v4);
    let minD = cp0.distanceTo(s0), minTri = cp0.clone(), minSeg = s0.clone();

    const cp1 = tri.closestPointToPoint(s1, TMP.v5);
    const d1 = cp1.distanceTo(s1);
    if (d1 < minD) { minD = d1; minTri = cp1.clone(); minSeg = s1.clone(); }

    const a = TMP.v6, b = TMP.v7;
    closestPointsSegSeg(s0, s1, tri.a, tri.b, a, b);
    const dE0 = a.distanceTo(b); if (dE0 < minD) { minD = dE0; minTri = b.clone(); minSeg = a.clone(); }

    closestPointsSegSeg(s0, s1, tri.b, tri.c, a, b);
    const dE1 = a.distanceTo(b); if (dE1 < minD) { minD = dE1; minTri = b.clone(); minSeg = a.clone(); }

    closestPointsSegSeg(s0, s1, tri.c, tri.a, a, b);
    const dE2 = a.distanceTo(b); if (dE2 < minD) { minD = dE2; minTri = b.clone(); minSeg = a.clone(); }

    outTri.copy(minTri); outSeg.copy(minSeg);
    return minD;
}

/* ---------- temporales compartidos (evitar GC) ---------- */
const TMP = {
    worldBox: new THREE.Box3(),
    localBox: new THREE.Box3(),
    triWorld: new THREE.Triangle(),
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    c: new THREE.Vector3(),
    pTri: new THREE.Vector3(),
    pSeg: new THREE.Vector3(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    v3: new THREE.Vector3(),
    v4: new THREE.Vector3(),
    v5: new THREE.Vector3(),
    v6: new THREE.Vector3(),
    v7: new THREE.Vector3(),
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3()),
    inv: new THREE.Matrix4(),
    nTmp: new THREE.Vector3(),
    nFace: new THREE.Vector3(),
};

type ColliderEnvOptions = {
    separationEps?: number;
    maxPasses?: number;
    /** Si true (default), aplanar normal Y en walls para evitar saltos verticales. */
    flattenWallNormalY?: boolean;
    /** Límite por-hit del empuje para evitar grandes saltos (default = 50% del radio). */
    maxPushPerHitMul?: number;
    /** Ignorar triángulos de walls cuya altura máxima esté por debajo de esta Y. */
    minWallY?: number;
};

export class ColliderEnvBVH {
    constructor(
        public ground: THREE.Mesh | null,
        public walls: THREE.Mesh | null,
        public opts: ColliderEnvOptions = {}
    ) { }

    /** Reusar instancia tras hot-reload; asegura BVH en walls si está disponible. */
    setMeshes(ground?: THREE.Mesh | null, walls?: THREE.Mesh | null) {
        if (ground !== undefined) this.ground = ground;
        if (walls !== undefined) this.walls = walls;
        this.ground?.updateMatrixWorld(true);
        this.walls?.updateMatrixWorld(true);
        const geo: any = this.walls?.geometry as any;
        if (geo && typeof geo.computeBoundsTree === "function" && !geo.boundsTree) {
            try { geo.computeBoundsTree(); } catch { }
        }
    }

    /**
     * Barrido de cápsula contra walls (BVH shapecast).
     * step = desplazamiento solicitado; devuelve desplazamiento corregido.
     */
    sweepCapsule(
        start: THREE.Vector3,
        end: THREE.Vector3,
        radius: number,
        step: THREE.Vector3
    ): THREE.Vector3 {
        const walls = this.walls;
        const geo = walls?.geometry as THREE.BufferGeometry | undefined;
        if (!walls || !geo) return step.clone();
        if (!ensureBVH(geo, { autoBuildInDev: true })) return step.clone();

        const eps = this.opts.separationEps ?? 0.001;
        const maxPasses = Math.max(1, this.opts.maxPasses ?? 4);
        const flattenY = this.opts.flattenWallNormalY ?? true;
        const maxPushMul = this.opts.maxPushPerHitMul ?? 0.5;

        // Valor pasado por opciones o CFG.collision.minWallY
        const minY = this.opts.minWallY ?? (CFG.collision?.minWallY ?? -Infinity);

        const segStart = TMP.v1.copy(start).add(step);
        const segEnd = TMP.v2.copy(end).add(step);
        const inv = TMP.inv.copy(walls.matrixWorld).invert();

        for (let pass = 0; pass < maxPasses; pass++) {
            let collided = false;

            const worldBox = TMP.worldBox.makeEmpty();
            worldBox.expandByPoint(segStart);
            worldBox.expandByPoint(segEnd);
            worldBox.min.addScalar(-radius);
            worldBox.max.addScalar(radius);
            const localBox = TMP.localBox.copy(worldBox).applyMatrix4(inv);

            // @ts-ignore boundsTree añadido por three-mesh-bvh
            geo.boundsTree.shapecast({
                intersectsBounds: (box: THREE.Box3) => box.intersectsBox(localBox),
                intersectsTriangle: (tri: THREE.Triangle) => {
                    // tri → mundo
                    TMP.a.copy(tri.a).applyMatrix4(walls.matrixWorld);
                    TMP.b.copy(tri.b).applyMatrix4(walls.matrixWorld);
                    TMP.c.copy(tri.c).applyMatrix4(walls.matrixWorld);
                    TMP.triWorld.set(TMP.a, TMP.b, TMP.c);

                    // Filtrado por altura
                    if (Math.max(TMP.triWorld.a.y, TMP.triWorld.b.y, TMP.triWorld.c.y) < minY) {
                        return false;
                    }

                    const dist = distanceTriangleSegment(TMP.triWorld, segStart, segEnd, TMP.pTri, TMP.pSeg);
                    if (dist < radius) {
                        const n = TMP.nTmp.subVectors(TMP.pSeg, TMP.pTri);
                        let nLen = n.length();
                        if (nLen < 1e-9) {
                            TMP.triWorld.getNormal(TMP.nFace);
                            n.copy(TMP.nFace); nLen = n.length();
                        }
                        if (nLen > 1e-9) n.multiplyScalar(1 / nLen); else n.set(0, 1, 0);

                        if (flattenY) {
                            n.y = 0;
                            const l = n.length();
                            if (l < 1e-6) {
                                n.set(segStart.x - start.x, 0, segStart.z - start.z).normalize();
                                if (!isFinite(n.x)) n.set(1, 0, 0);
                            } else {
                                n.multiplyScalar(1 / l);
                            }
                        }

                        const rawDelta = radius - dist + eps;
                        const delta = Math.min(rawDelta, Math.max(0.0, radius * maxPushMul));
                        segStart.addScaledVector(n, delta);
                        segEnd.addScaledVector(n, delta);

                        worldBox.min.addScaledVector(n, -delta);
                        worldBox.max.addScaledVector(n, +delta);
                        localBox.copy(worldBox).applyMatrix4(inv);

                        collided = true;
                    }
                    return false;
                },
            });

            if (!collided) break;
        }

        return TMP.v4.copy(segStart).sub(start);
    }

    groundY(x: number, z: number, fromY = 100): number | null {
        if (!this.ground) return null;
        const raycaster = new THREE.Raycaster(
            TMP.v5.set(x, fromY, z), TMP.v6.set(0, -1, 0), 0, fromY + 2
        );
        const hit = raycaster.intersectObject(this.ground, true)[0];
        return hit?.point.y ?? null;
    }
}

// Back-compat
export { ColliderEnvBVH as ColliderEnv };
export default ColliderEnvBVH;
