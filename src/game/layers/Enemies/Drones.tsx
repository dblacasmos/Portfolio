/* =========================================================
FILE: src/game/layers/Enemies/Drones.tsx
========================================================= */
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { CFG } from "../../../constants/config";
import { useGameStore } from "../../utils/state/store";
import { ASSETS } from "@/constants/assets";
import { audioManager } from "../../utils/audio/audio";
import type { ColliderEnvBVH } from "../../utils/collision/colliderEnvBVH";

/* ---------- Tipos ---------- */
type WithDroneIndex = { userData: { __droneIndex?: number } };

export type DronesProps = {
    registerTargets: (getter: () => THREE.Object3D[]) => void;
    envRef: React.MutableRefObject<ColliderEnvBVH | null>;

    // Compat Game.tsx
    clipLine?: (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3;
    sweepStep?: (pos: THREE.Vector3, step: THREE.Vector3, radius: number) => THREE.Vector3;

    cityBoundsRef: React.MutableRefObject<{ center: THREE.Vector2; radius: number } | null>;
    roadsMeshRef: React.MutableRefObject<THREE.Mesh | null>;
    wallsMeshRef: React.MutableRefObject<THREE.Mesh | null>;
    groundMeshRef?: React.MutableRefObject<THREE.Mesh | null>;
    groundYRef: React.MutableRefObject<number>;
    playerSpawnRef?: React.MutableRefObject<THREE.Vector3 | null>;
    endDoorRef?: React.MutableRefObject<THREE.Vector3 | null>;
    // NUEVO:
    forbidMeshRef?: React.MutableRefObject<THREE.Mesh | null>;
};

type Spawn = { pos: THREE.Vector3; box: THREE.Box3; alive: boolean };
type ExplosionFx = { id: number; pos: THREE.Vector3 };

/* ---------- Parámetros ---------- */
// Centralizado: número de drones desde config (una sola fuente de verdad)
const WANT_COUNT = Math.max(0, CFG.gameplay.dronesTotal);
const INNER_MARGIN = 1.0;       // margen contra paredes (para sectores AABB)
const CLEAR_RADIUS = 0.05;      // separación respecto a paredes verticales
const TARGET_ALT = 1;           // altura de vuelo sobre la calzada
const UP_CLEARANCE = 1.2;       // espacio libre por arriba

// Nudging hacia el centro si hay pared cerca
const NUDGE_STEP = 0.4;         // metros por empuje
const MAX_NUDGE_STEPS = 7;      // seguridad para no buclear

/* ---------- Reutilizables ---------- */
const RC = new THREE.Raycaster();
const TMP_BOX = new THREE.Box3();

/* ---------- Helpers ---------- */
const isForbiddenName = (n: string) => {
    const nm = (n || "").toLowerCase();
    return nm.includes("mesa") || nm.includes("objetofinal") || nm.includes("objectfinal");
};

function collectForbiddenRects(scene: THREE.Scene) {
    const rects: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
    scene.traverse((o: any) => {
        if (!o?.isMesh) return;
        if (!isForbiddenName(o.name)) return;
        o.updateWorldMatrix(true, false);
        TMP_BOX.setFromObject(o);
        rects.push({
            minX: TMP_BOX.min.x - 0.4,
            maxX: TMP_BOX.max.x + 0.4,
            minZ: TMP_BOX.min.z - 0.4,
            maxZ: TMP_BOX.max.z + 0.4,
        });
    });
    return rects;
}
const inRect = (x: number, z: number, r: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
    x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

function projectOnRoads(x: number, z: number, roads: THREE.Mesh | null, yHint: number) {
    if (!roads) return null;
    RC.set(new THREE.Vector3(x, yHint + 80, z), new THREE.Vector3(0, -1, 0));
    const hit = RC.intersectObject(roads, true)[0] as any;
    return hit?.point ?? null;
}

/** Esfera de separación (rayos horizontales en 16 direcciones) contra walls. */
function sphereClearOfWalls(p: THREE.Vector3, walls: THREE.Mesh | null, radius = CLEAR_RADIUS): boolean {
    if (!walls) return true;
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        RC.set(p, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
        const hit = RC.intersectObject(walls, true)[0];
        // Ignora suelo/techo: sólo consideramos caras “verticales”
        const isVertical = hit?.face ? Math.abs(hit.face.normal.y) < 0.4 : true;
        if (hit && isVertical && hit.distance < radius) return false;
    }
    return true;
}

/** Libre por encima (relajado; evita que haya techo pegado) */
function isFreeAbove(p: THREE.Vector3, walls: THREE.Mesh | null, upClearance = UP_CLEARANCE): boolean {
    if (!walls) return true;
    RC.set(p, new THREE.Vector3(0, 1, 0));
    const hit = RC.intersectObject(walls, true)[0];
    return !(hit && hit.distance < upClearance);
}

const distXZ = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

/* ====== NUEVO: AABB y sectorización en 5 cuadrados ====== */
type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

/** AABB (en mundo) de un mesh */
function worldAABB(mesh: THREE.Mesh | null): Rect | null {
    if (!mesh) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
}

/** 5 sectores cuadrados centrados dentro del AABB (N, S, E, O, C) */
function makeFiveSquareSectorsFromAABB(aabb: Rect, margin = INNER_MARGIN): Rect[] {
    // Reducimos el AABB con margen para no “besar” pared
    const minX = aabb.minX + margin;
    const maxX = aabb.maxX - margin;
    const minZ = aabb.minZ + margin;
    const maxZ = aabb.maxZ - margin;

    const W = Math.max(0, maxX - minX);
    const H = Math.max(0, maxZ - minZ);

    // Lado de la celda: menor dimensión / 3  => mallado 3x3 centrado
    const s = Math.max(0.5, Math.min(W, H) / 3);
    const offX = (W - 3 * s) * 0.5;
    const offZ = (H - 3 * s) * 0.5;

    const cell = (r: number, c: number): Rect => {
        const x0 = minX + offX + c * s;
        const z0 = minZ + offZ + r * s;
        return { minX: x0, maxX: x0 + s, minZ: z0, maxZ: z0 + s };
    };

    // Orden: Norte, Sur, Este, Oeste, Centro (sobre la malla 3x3)
    return [cell(0, 1), cell(2, 1), cell(1, 2), cell(1, 0), cell(1, 1)];
}

/** Genera candidatos en rejilla dentro de un rect y los devuelve ordenados por cercanía a su centro. */
function* gridCandidatesSquare(rect: Rect, step: number) {
    const cx = (rect.minX + rect.maxX) * 0.5;
    const cz = (rect.minZ + rect.maxZ) * 0.5;
    const pts: { x: number; z: number; w: number }[] = [];
    for (let x = rect.minX; x <= rect.maxX; x += step) {
        for (let z = rect.minZ; z <= rect.maxZ; z += step) {
            const w = Math.hypot(x - cx, z - cz);
            pts.push({ x, z, w });
        }
    }
    pts.sort((a, b) => a.w - b.w);
    for (const p of pts) yield new THREE.Vector2(p.x, p.z);
}

/* ====== Prohibidos: raycast vertical preciso ====== */
function coveredByForbidden(x: number, z: number, forbid: THREE.Mesh | null, groundY: number): boolean {
    if (!forbid) return false;
    RC.set(new THREE.Vector3(x, groundY + 200, z), new THREE.Vector3(0, -1, 0));
    const hit = RC.intersectObject(forbid, true)[0];
    return !!(hit && hit.point.y > groundY + 0.05);
}

/* =================== Componente de explosión (vídeo) =================== */
const ExplosionBillboard: React.FC<{
    position: THREE.Vector3;
    videoUrl: string;
    onEnded: () => void;
    size?: number;
}> = ({ position, videoUrl, onEnded, size = 1.8 }) => {
    const { camera } = useThree();
    const meshRef = useRef<THREE.Mesh>(null!);
    const [tex, setTex] = useState<THREE.VideoTexture | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [ready, setReady] = useState(false);

    // ShaderMaterial con luma key (fondo negro por defecto)
    const mat = useMemo(() => {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uMap: { value: null as any },
                uKeyLow: { value: 0.10 },
                uKeyHigh: { value: 0.25 },
                uInvert: { value: 0.0 },
            },
            vertexShader: /*glsl*/`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
            fragmentShader: /*glsl*/`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uMap;
        uniform float uKeyLow, uKeyHigh, uInvert;

        float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

        void main(){
          vec4 tex = texture2D(uMap, vUv);
          float y = mix(luma(tex.rgb), luma(vec3(1.0) - tex.rgb), uInvert);
          float a = smoothstep(uKeyLow, uKeyHigh, y);
          gl_FragColor = vec4(tex.rgb, a);
          if (gl_FragColor.a <= 0.01) discard;
        }`,
            toneMapped: false as any,
        });
    }, []);

    // crea video + texture
    useEffect(() => {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.loop = false;
        video.playsInline = true;
        video.preload = "auto";

        const onCanPlay = () => setReady(true);
        const onEnd = () => onEnded();
        video.addEventListener("canplay", onCanPlay, { once: true });
        video.addEventListener("ended", onEnd, { once: true });

        const vt = new THREE.VideoTexture(video);
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.generateMipmaps = false;
        (vt as any).colorSpace = THREE.SRGBColorSpace;

        videoRef.current = video;
        setTex(vt);
        (mat.uniforms.uMap as any).value = vt;

        video.play().catch(() => { /* requiere gesto en móvil */ });

        return () => {
            video.removeEventListener("canplay", onCanPlay);
            video.removeEventListener("ended", onEnd);
            try { video.pause(); } catch { }
            try { (video as any).src = ""; video.load(); } catch { }
            vt.dispose();
            (mat.uniforms.uMap as any).value = null;
            setTex(null);
            videoRef.current = null;
        };
    }, [videoUrl, onEnded, mat]);

    // billboard
    useFrame(() => { meshRef.current?.lookAt(camera.position); });

    if (!tex || !ready) return null;

    return (
        <mesh ref={meshRef} position={position} renderOrder={1500} frustumCulled={false}>
            <planeGeometry args={[size, size * 0.5625]} />
            <primitive attach="material" object={mat} />
        </mesh>
    );
};

/* =================== Movimiento: ping-pong rectilíneo =================== */
type MoveState = {
    baseDir: THREE.Vector2;     // dirección rectilínea base (spawn)
    dir: THREE.Vector2;         // dirección actual (± baseDir)
    speed: number;              // m/s
    traveledInLeg: number;      // metros recorridos en el tramo actual
    stalledFrames: number;      // frames consecutivos sin avance (para evitar jitter)
};

function randomUnit2(): THREE.Vector2 {
    const a = Math.random() * Math.PI * 2;
    return new THREE.Vector2(Math.cos(a), Math.sin(a));
}

/* ========================================================= */
const Drones: React.FC<DronesProps> = ({
    registerTargets,
    envRef,
    cityBoundsRef,
    roadsMeshRef,
    wallsMeshRef,
    groundYRef,
    forbidMeshRef,
}) => {
    const { scene, camera } = useThree();
    const setCrosshairOnDrone = useGameStore((s) => s.setCrosshairOnDrone);
    const incDestroyed = useGameStore((s) => s.incDestroyed);
    const setDronesTotal = useGameStore((s) => s.setDronesTotal);

    const DRONE_SIZE = Math.max(0.1, (CFG as any)?.drones?.size ?? 0.4);

    // AABB del recinto (derivado de las paredes invisibles)
    const aabbRectRef = useRef<Rect | null>(null);

    // Modelo del dron
    const gltf = useGLTF(CFG.models.drone) as any;
    const droneMeshes = useMemo(() => {
        const arr: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
        (gltf.scene as THREE.Object3D).traverse((o: any) => {
            if (o?.isMesh && o.geometry) {
                o.castShadow = false; o.receiveShadow = false;
                o.frustumCulled = false;
                arr.push({ geo: o.geometry, mat: o.material });
            }
        });
        return arr;
    }, [gltf.scene]);

    // Prohibidos (fallback AABB)
    const forbiddenRectsRef = useRef<{ minX: number; maxX: number; minZ: number; maxZ: number }[]>([]);
    useEffect(() => { forbiddenRectsRef.current = collectForbiddenRects(scene); }, [scene]);

    const [spawns, setSpawns] = useState<Spawn[]>([]);
    const targetsRef = useRef<(THREE.Object3D | null)[]>([]);
    const proxiesGroupRef = useRef<THREE.Group>(new THREE.Group());
    const didSpawnRef = useRef(false);

    // FX de explosión activos
    const [explosions, setExplosions] = useState<ExplosionFx[]>([]);
    const nextExplId = useRef(1);
    // Arranque de movimiento retrasado 2s tras el spawn
    const moveEnabledAtRef = useRef<number>(0);

    /* ---------- Utilidades de validación/nudge ---------- */

    function nudgeTowardCenterIfNearWall(p: THREE.Vector3, center2D: THREE.Vector2, walls: THREE.Mesh | null) {
        if (!walls) return p;
        const tmp = p.clone();
        let steps = 0;
        while ((!sphereClearOfWalls(tmp, walls, CLEAR_RADIUS) || !isFreeAbove(tmp, walls, UP_CLEARANCE)) && steps < MAX_NUDGE_STEPS) {
            const dir = new THREE.Vector3(center2D.x - tmp.x, 0, center2D.y - tmp.z).normalize();
            tmp.addScaledVector(dir, NUDGE_STEP);
            steps++;
        }
        return tmp;
    }

    function mapNormToAABB(n: { x: number; z: number }, a: Rect, margin = INNER_MARGIN): { x: number; z: number } {
        const cx = (a.minX + a.maxX) * 0.5;
        const cz = (a.minZ + a.maxZ) * 0.5;
        const hx = Math.max(0, (a.maxX - a.minX) * 0.5 - margin);
        const hz = Math.max(0, (a.maxZ - a.minZ) * 0.5 - margin);
        const nx = THREE.MathUtils.clamp(n.x, -1, 1);
        const nz = THREE.MathUtils.clamp(n.z, -1, 1);
        return { x: cx + nx * hx, z: cz + nz * hz };
    }

    /* --- SPAWN: preferencia puntos custom → normalizados → sectores (5) --- */
    useEffect(() => {
        let alive = true;
        const trySpawnOnce = () => {
            if (!alive || didSpawnRef.current) return;

            const roads = roadsMeshRef.current;
            const walls = wallsMeshRef.current;
            if (!roads) { requestAnimationFrame(trySpawnOnce); return; }

            const yHint = groundYRef.current;
            const forbidMesh = forbidMeshRef?.current ?? null;

            // Tomamos AABB preferente de walls; si no, de roads
            const aabb = worldAABB(walls) ?? worldAABB(roads);
            if (!aabb) { requestAnimationFrame(trySpawnOnce); return; }

            // Guarda AABB para clamps de movimiento
            aabbRectRef.current = aabb;

            const picked: THREE.Vector3[] = [];
            const aabbCenter = new THREE.Vector2(
                (aabb.minX + aabb.maxX) * 0.5,
                (aabb.minZ + aabb.maxZ) * 0.5
            );

            // ① PRIORIDAD: puntos de usuario en mundo absoluto
            const customWorld = (CFG as any)?.drones?.customSpawnsWorld as { x: number; z: number }[] | undefined;
            if (Array.isArray(customWorld) && customWorld.length) {
                for (const wz of customWorld.slice(0, WANT_COUNT)) {
                    const hit = projectOnRoads(wz.x, wz.z, roads, yHint);
                    if (!hit) continue;
                    let p = new THREE.Vector3(hit.x, hit.y + TARGET_ALT, hit.z);
                    // seguridad: AABB duro
                    if (p.x < aabb.minX || p.x > aabb.maxX || p.z < aabb.minZ || p.z > aabb.maxZ) continue;
                    if (coveredByForbidden(p.x, p.z, forbidMesh, yHint)) continue;
                    if (forbiddenRectsRef.current.some(r => inRect(p.x, p.z, r))) continue;
                    p = nudgeTowardCenterIfNearWall(p, aabbCenter, walls);
                    if (!sphereClearOfWalls(p, walls, CLEAR_RADIUS)) continue;
                    if (!isFreeAbove(p, walls, UP_CLEARANCE)) continue;
                    picked.push(p);
                }
            }

            // ② Si faltan, usa puntos normalizados [-1..1] relativos al AABB
            if (picked.length < WANT_COUNT) {
                const customNorm = (CFG as any)?.drones?.customSpawnsXZ as { x: number; z: number }[] | undefined;
                if (Array.isArray(customNorm) && customNorm.length) {
                    for (const nz of customNorm.slice(0, WANT_COUNT - picked.length)) {
                        const mapped = mapNormToAABB(nz, aabb, INNER_MARGIN + 0.8);
                        const hit = projectOnRoads(mapped.x, mapped.z, roads, yHint);
                        if (!hit) continue;
                        let p = new THREE.Vector3(hit.x, hit.y + TARGET_ALT, hit.z);
                        if (coveredByForbidden(p.x, p.z, forbidMesh, yHint)) continue;
                        if (forbiddenRectsRef.current.some(r => inRect(p.x, p.z, r))) continue;
                        p = nudgeTowardCenterIfNearWall(p, aabbCenter, walls);
                        if (!sphereClearOfWalls(p, walls, CLEAR_RADIUS)) continue;
                        if (!isFreeAbove(p, walls, UP_CLEARANCE)) continue;
                        picked.push(p);
                    }
                }
            }

            // ③ Fallback: sectores automáticos (N, S, E, O, C)
            if (picked.length < WANT_COUNT) {
                const sectors = makeFiveSquareSectorsFromAABB(aabb, INNER_MARGIN);
                // Paso de rejilla 1..2 m típicamente, proporcional al AABB
                const gridStep = Math.max(
                    1.0,
                    Math.min(2.0, Math.min(aabb.maxX - aabb.minX, aabb.maxZ - aabb.minZ) * 0.04)
                );

                for (const rect of sectors) {
                    if (picked.length >= WANT_COUNT) break;
                    let placed: THREE.Vector3 | null = null;
                    for (const v of gridCandidatesSquare(rect, gridStep)) {
                        // proyecta sobre carreteras
                        const hit = projectOnRoads(v.x, v.y, roads, yHint);
                        if (!hit) continue;

                        let p = new THREE.Vector3(hit.x, hit.y + TARGET_ALT, hit.z);

                        // seguridad: si por proyección cae fuera del AABB, descarta
                        if (p.x < aabb.minX || p.x > aabb.maxX || p.z < aabb.minZ || p.z > aabb.maxZ) continue;

                        // nudge si está pegado a paredes o techo bajo
                        p = nudgeTowardCenterIfNearWall(p, aabbCenter, walls);

                        // chequeos
                        if (coveredByForbidden(p.x, p.z, forbidMesh, yHint)) continue;
                        if (forbiddenRectsRef.current.some(r => inRect(p.x, p.z, r))) continue;
                        if (!sphereClearOfWalls(p, walls, CLEAR_RADIUS)) continue;
                        if (!isFreeAbove(p, walls, UP_CLEARANCE)) continue;

                        placed = p;
                        break;
                    }
                    if (placed) picked.push(placed);
                }
            }

            const sp = picked.slice(0, WANT_COUNT).map((pos) => {
                const half = 0.6 * DRONE_SIZE;
                const box = new THREE.Box3(
                    new THREE.Vector3(pos.x - half, pos.y - half, pos.z - half),
                    new THREE.Vector3(pos.x + half, pos.y + half, pos.z + half)
                );
                return { pos, box, alive: true } as Spawn;
            });

            setSpawns(sp);
            setDronesTotal(sp.length);

            // Armar la barrera temporal de movimiento: ahora + 2 s
            try { moveEnabledAtRef.current = performance.now() + 2000; } catch { moveEnabledAtRef.current = Date.now() + 2000; }

            // Proxy con radio un poco mayor para facilitar el hit
            const proxies = sp.map((s, idx) => {
                const g = new THREE.SphereGeometry(Math.max(0.6, 1.8 * DRONE_SIZE), 16, 12);
                const m = new THREE.MeshBasicMaterial({ visible: false });
                const mesh = new THREE.Mesh(g, m);
                mesh.position.copy(s.pos);
                mesh.layers.set(CFG.layers.ENEMIES);
                (mesh.userData as any).__droneIndex = idx;
                (mesh.userData as any).droneId = idx;
                proxiesGroupRef.current.add(mesh);
                return mesh;
            });
            targetsRef.current = proxies;
            registerTargets(() => (proxiesGroupRef.current?.children ?? []) as THREE.Object3D[]);

            didSpawnRef.current = true;
        };

        trySpawnOnce();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Reproducir FX (vídeo + audio) con delay sincronizado (100ms) ---
    const playExplosionFx = (where: THREE.Vector3) => {
        const pos = where.clone();
        setTimeout(() => {
            const id = nextExplId.current++;
            setExplosions((prev) => [...prev, { id, pos }]);
            try {
                const expDur = audioManager.getDuration(ASSETS.audio.explosionDron) ?? 1.2;
                audioManager.squelchUrl(ASSETS.audio.shotLaser, expDur + 0.05);
                audioManager.playSfx(ASSETS.audio.explosionDron, 1.35);
            } catch { }
        }, 100);
    };

    // --- Hit externo (desde Game.onPlayerShoot) ---
    useEffect(() => {
        (window as any).hitDroneByMesh = (obj: THREE.Object3D) => {
            let o: any = obj;
            let idx: number | undefined;
            while (o && idx === undefined) { idx = o.userData?.__droneIndex; o = o.parent; }
            if (idx === undefined) return;

            setSpawns(prev => {
                const cur = prev[idx];
                if (!cur?.alive) return prev;

                const proxy = targetsRef.current[idx];
                if (proxy) proxy.parent?.remove(proxy);
                targetsRef.current[idx] = null;

                const next = prev.slice();
                next[idx] = { ...cur, alive: false };
                playExplosionFx(cur.pos);
                return next;
            });

            incDestroyed();
        };
        return () => { try { delete (window as any).hitDroneByMesh; } catch { } };
    }, [incDestroyed]);

    // --- Hover del crosshair (rayo central) ---
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    useFrame(() => {
        if (!spawns.length) { setCrosshairOnDrone(false); setHoverIdx(null); return; }
        RC.setFromCamera(new THREE.Vector2(0, 0), camera);
        let found: number | null = null;
        for (let i = 0; i < spawns.length; i++) {
            const s = spawns[i]; if (!s.alive) continue;
            if (RC.ray.intersectsBox(s.box)) { found = i; break; }
        }
        setHoverIdx(found);
        setCrosshairOnDrone(found != null);
    });

    // Helper DEV: window.__drones
    function minPairwiseDistance(points: THREE.Vector3[]) {
        let min = Infinity;
        let pair: [number, number] | null = null;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const d = Math.sqrt(
                    Math.pow(points[i].x - points[j].x, 2) +
                    Math.pow(points[i].y - points[j].y, 2) +
                    Math.pow(points[i].z - points[j].z, 2)
                );
                if (d < min) { min = d; pair = [i, j]; }
            }
        }
        return { min, pair };
    }

    useEffect(() => {
        const posArray = spawns.map((s, i) => ({ i, alive: s.alive, x: s.pos.x, y: s.pos.y, z: s.pos.z }));
        (window as any).__drones = {
            count: (aliveOnly: boolean = true) => aliveOnly ? posArray.filter(p => p.alive).length : posArray.length,
            positions: (aliveOnly: boolean = true) =>
                (aliveOnly ? posArray.filter(p => p.alive) : posArray).map(p => ({ i: p.i, x: p.x, y: p.y, z: p.z })),
            minSpacing: (aliveOnly: boolean = true) => {
                const filtered = aliveOnly ? posArray.filter(p => p.alive) : posArray;
                const pts = filtered.map(p => new THREE.Vector3(p.x, p.y, p.z));
                if (pts.length < 2) return { min: 0, pair: null as [number, number] | null };
                const { min, pair } = minPairwiseDistance(pts);
                return pair ? { min, pair: [filtered[pair[0]].i, filtered[pair[1]].i] as [number, number] } : { min, pair: null };
            },
            teleportTo: (i: number, opts?: { above?: number; back?: number }) => {
                const cam = (window as any).__camera as THREE.PerspectiveCamera | undefined;
                const s = spawns[i]; if (!cam || !s) return false;
                const above = opts?.above ?? 1.2, back = opts?.back ?? 2.0;
                const toCam = new THREE.Vector3().subVectors(cam.position, s.pos).setY(0);
                if (toCam.lengthSq() < 1e-4) toCam.set(0, 0, 1);
                toCam.normalize().multiplyScalar(back);
                const eye = new THREE.Vector3(s.pos.x + toCam.x, s.pos.y + above, s.pos.z + toCam.z);
                cam.position.copy(eye); cam.lookAt(s.pos);
                (window as any).__invalidate?.();
                return true;
            },
            debug: (on: boolean) => {
                let g = (window as any).__drones_dbg as THREE.Group | undefined;
                try { g?.parent?.remove(g); } catch { }
                (window as any).__drones_dbg = undefined;
                if (!on) { (window as any).__invalidate?.(); return true; }
                g = new THREE.Group();
                spawns.forEach((s, i) => {
                    const m = new THREE.Mesh(
                        new THREE.SphereGeometry(0.18, 12, 8),
                        new THREE.MeshBasicMaterial({ color: s.alive ? 0x00ff88 : 0xff3366 })
                    );
                    m.position.copy(s.pos);
                    m.layers.set(CFG.layers.ENEMIES);
                    g!.add(m);
                });
                (window as any).__scene?.add(g);
                (window as any).__invalidate?.();
                (window as any).__drones_dbg = g;
                return true;
            },
        };

        // Atajos runtime para fijar spawns exactos sin recompilar
        (window as any).__drones_set = {
            world: (arr: { x: number; z: number }[]) => {
                (CFG as any).drones = (CFG as any).drones || {};
                (CFG as any).drones.customSpawnsWorld = arr;
                (CFG as any).drones.customSpawnsXZ = undefined;
                location.reload();
            },
            norm: (arr: { x: number; z: number }[]) => {
                (CFG as any).drones = (CFG as any).drones || {};
                (CFG as any).drones.customSpawnsXZ = arr;
                (CFG as any).drones.customSpawnsWorld = undefined;
                location.reload();
            },
        };
    }, [spawns]);

    // URLs FX de assets
    const explosionVideoUrl = ASSETS.video.explosion;

    /* ---------- Movimiento recto ping-pong ---------- */
    const groupsRef = useRef<(THREE.Group | null)[]>([]);
    const moveRef = useRef<MoveState[]>([]);
    const speedBase = Math.max(0.6, (CFG as any)?.drones?.speed ?? 1.2); // m/s
    const pingPongDist = Math.max(0.5, (CFG as any)?.drones?.pingPongDistance ?? 6.0);
    // Usa cápsula propia del dron para colisionar con las paredes invisibles del recinto
    const radiusCollider = Math.max(0.03, (CFG as any)?.drones?.capsuleRadius ?? 0.07);
    const halfHeightCollider = Math.max(radiusCollider, (CFG as any)?.drones?.capsuleHalfHeight ?? 0.06);

    // Inicializa estados y orientaciones al tener spawns
    useEffect(() => {
        if (!spawns.length) return;

        moveRef.current = spawns.map((s, idx) => {
            // Direcciones de spawn:
            // - Drones 0,2,3,4 hacia eje Z -1 (0,-1)
            // - Dron 3 mirando hacia x = 13.0 (desde su x actual)
            let baseDir = new THREE.Vector2(0, -1); // z negativo
            if (idx === 3) {
                const toX = 13.0 - s.pos.x;
                baseDir = new THREE.Vector2(Math.sign(toX === 0 ? 1 : toX), 0);
                // Si queremos exactamente hacia (13, y, z): vector real normalizado
                const vx = 13.0 - s.pos.x;
                const v = new THREE.Vector2(vx, 0);
                if (v.lengthSq() > 1e-6) baseDir = v.normalize();
            }
            return {
                baseDir,
                dir: baseDir.clone(),
                speed: speedBase,
                traveledInLeg: 0,
                stalledFrames: 0,
            };
        });

        // Orienta los grupos según la dirección inicial
        requestAnimationFrame(() => {
            spawns.forEach((s, i) => {
                const g = groupsRef.current[i];
                const m = moveRef.current[i];
                if (g && m) {
                    const lookAt = new THREE.Vector3(s.pos.x + m.dir.x, s.pos.y, s.pos.z + m.dir.y);
                    g.position.copy(s.pos);
                    g.lookAt(lookAt);
                }
            });
        });
    }, [spawns, speedBase]);

    // Intenta mover sobre roads. Devuelve avance real en metros (0 si bloqueado).
    function tryStepOnRoads(i: number, wishStepLen: number): number {
        const s = spawns[i];
        if (!s?.alive) return 0;
        const m = moveRef.current[i];
        if (!m) return 0;

        // Ventana de 2 s post-spawn
        const nowMs = (typeof performance !== "undefined" && performance?.now) ? performance.now() : Date.now();
        if (nowMs < moveEnabledAtRef.current) return 0;

        const roads = roadsMeshRef.current;
        const walls = wallsMeshRef.current;
        const forbid = forbidMeshRef?.current ?? null;
        const yHint = groundYRef.current;

        const stepLen = Math.max(0, wishStepLen);
        if (stepLen <= 0) return 0;

        const nextX = s.pos.x + m.dir.x * stepLen;
        const nextZ = s.pos.z + m.dir.y * stepLen;

        // Proyectar sobre carreteras
        const hit = projectOnRoads(nextX, nextZ, roads, yHint);
        if (!hit) return 0;

        // Si hay BVH, barrer cápsula tipo player
        const env = envRef.current;
        if (env) {
            // ► Barrido de cápsula contra walls con dimensiones de DRON (no del jugador)
            const rWalls = Math.max(0.03, radiusCollider - (CFG.collision?.wallPadding ?? 0));
            const capStart = new THREE.Vector3(s.pos.x, s.pos.y - halfHeightCollider, s.pos.z);
            const capEnd = new THREE.Vector3(s.pos.x, s.pos.y + halfHeightCollider, s.pos.z);
            const wish = new THREE.Vector3(hit.x - s.pos.x, 0, hit.z - s.pos.z);
            const corrected = env.sweepCapsule(capStart, capEnd, rWalls, wish);
            const advance = new THREE.Vector2(corrected.x, corrected.z).length();
            const EPS = 1e-5;

            // ► Si estamos bloqueados (chocamos con pared), invertimos dirección al instante
            if (!Number.isFinite(corrected.x) || !Number.isFinite(corrected.z) || advance <= EPS) {
                m.dir.multiplyScalar(-1);
                m.baseDir.multiplyScalar(-1);
                m.traveledInLeg = 0;
                return 0; // bloqueo (sin desplazamiento)
            }

            // Avance válido → aplicamos XZ corregido
            s.pos.add(corrected);

            // ► Reproyecta Y sobre la calzada SIEMPRE (evita “deriva” hacia bajo el suelo)
            const rehit = projectOnRoads(s.pos.x, s.pos.z, roads, yHint);
            s.pos.y = (rehit?.y ?? yHint) + TARGET_ALT;

            // Clamp duro al AABB del recinto (con pequeño margen interior)
            const rect = aabbRectRef.current;
            if (rect) {
                const mrg = Math.max(0.2, INNER_MARGIN * 0.5);
                const clampedX = THREE.MathUtils.clamp(s.pos.x, rect.minX + mrg, rect.maxX - mrg);
                const clampedZ = THREE.MathUtils.clamp(s.pos.z, rect.minZ + mrg, rect.maxZ - mrg);
                const escaped = (Math.abs(clampedX - s.pos.x) > 1e-4) || (Math.abs(clampedZ - s.pos.z) > 1e-4);
                s.pos.x = clampedX; s.pos.z = clampedZ;
                if (escaped) {
                    // Rebote inmediato si toca el límite duro del recinto
                    m.dir.multiplyScalar(-1);
                    m.baseDir.multiplyScalar(-1);
                    m.traveledInLeg = 0;
                }
            }

            // Seguridad adicional
            if (coveredByForbidden(s.pos.x, s.pos.z, forbid, yHint)) {
                // Si cae dentro de “prohibidos”, invierte y no avanza
                m.dir.multiplyScalar(-1);
                m.baseDir.multiplyScalar(-1);
                m.traveledInLeg = 0;
                return 0;
            }
            if (!sphereClearOfWalls(s.pos, walls, CLEAR_RADIUS)) return 0;
            if (!isFreeAbove(s.pos, walls, UP_CLEARANCE)) return 0;
            // Actualizar AABB + proxy
            const half = 0.6 * DRONE_SIZE;
            s.box.min.set(s.pos.x - half, s.pos.y - half, s.pos.z - half);
            s.box.max.set(s.pos.x + half, s.pos.y + half, s.pos.z + half);
            const proxy = targetsRef.current[i] as THREE.Mesh | null | undefined;
            if (proxy) proxy.position.copy(s.pos);
            // Orientación del modelo (seguir la dir)
            const g = groupsRef.current[i];
            if (g) {
                const lookAt = new THREE.Vector3(s.pos.x + m.dir.x, s.pos.y, s.pos.z + m.dir.y);
                g.position.copy(s.pos);
                g.lookAt(lookAt);
            }
            return advance;
        } else {
            // Sin BVH: validaciones ligeras
            const nextPos = new THREE.Vector3(hit.x, hit.y + TARGET_ALT, hit.z);
            if (coveredByForbidden(nextPos.x, nextPos.z, forbid, yHint)) return 0;
            if (!sphereClearOfWalls(nextPos, walls, CLEAR_RADIUS)) return 0;
            if (!isFreeAbove(nextPos, walls, UP_CLEARANCE)) return 0;

            const adv = new THREE.Vector2(nextPos.x - s.pos.x, nextPos.z - s.pos.z).length();
            // Clamp previo para que no salga
            const rect = aabbRectRef.current;
            if (rect) {
                const mrg = Math.max(0.2, INNER_MARGIN * 0.5);
                nextPos.x = THREE.MathUtils.clamp(nextPos.x, rect.minX + mrg, rect.maxX - mrg);
                nextPos.z = THREE.MathUtils.clamp(nextPos.z, rect.minZ + mrg, rect.maxZ - mrg);
            }
            s.pos.copy(nextPos);

            const half = 0.6 * DRONE_SIZE;
            s.box.min.set(s.pos.x - half, s.pos.y - half, s.pos.z - half);
            s.box.max.set(s.pos.x + half, s.pos.y + half, s.pos.z + half);

            const proxy = targetsRef.current[i] as THREE.Mesh | null | undefined;
            if (proxy) proxy.position.copy(s.pos);

            const g = groupsRef.current[i];
            if (g) {
                const lookAt = new THREE.Vector3(s.pos.x + m.dir.x, s.pos.y, s.pos.z + m.dir.y);
                g.position.copy(s.pos);
                g.lookAt(lookAt);
            }
            return adv;
        }
    }

    useFrame((state) => {
        if (!spawns.length) return;
        const dt = Math.min(0.05, state.clock.getDelta()); // clamp para estabilidad
        const desired = (i: number) => (moveRef.current[i]?.speed ?? speedBase) * dt;

        for (let i = 0; i < spawns.length; i++) {
            const s = spawns[i];
            if (!s?.alive) continue;
            const m = moveRef.current[i];
            if (!m) continue;

            // Avanzar
            const moved = tryStepOnRoads(i, desired(i));
            m.traveledInLeg += moved;
            if ((desired(i) > 0 && moved <= 1e-5)) {
                m.stalledFrames++;
            } else {
                m.stalledFrames = 0;
            }

            // Reglas de ping-pong: invertir si llegamos a la distancia objetivo o si bloquea el avance
            // (se requiere varios frames atascado para evitar invertir cada frame provocando vibración)
            if (m.traveledInLeg >= pingPongDist || m.stalledFrames >= 5) {
                m.dir.multiplyScalar(-1);          // invertir
                m.baseDir.multiplyScalar(-1);      // mantener coherencia del “base”
                m.traveledInLeg = 0;
                m.stalledFrames = 0;               // reset bloqueo               // reiniciar tramo
                // Forzar orientado del grupo aunque no haya movimiento este frame
                const g = groupsRef.current[i];
                if (g) {
                    const lookAt = new THREE.Vector3(s.pos.x + m.dir.x, s.pos.y, s.pos.z + m.dir.y);
                    g.position.copy(s.pos);
                    g.lookAt(lookAt);
                }
            }
        }
    });

    // Render
    return (
        <group>
            {/* proxies invisibles (hit via Game.onPlayerShoot) */}
            <group
                ref={proxiesGroupRef}
                onUpdate={(g) => g.traverse((o: any) => o?.layers?.set?.(CFG.layers.ENEMIES))}
            />

            {/* modelos del dron (con orientación al spawn / marcha) */}
            {
                spawns.map((s, i) => {
                    if (!s.alive) return null;
                    return (
                        <group
                            key={i}
                            ref={(r) => (groupsRef.current[i] = r)}
                            position={s.pos}
                            scale={[DRONE_SIZE, DRONE_SIZE, DRONE_SIZE]}
                            onUpdate={(g) => g.traverse((o: any) => {
                                o?.layers?.set?.(CFG.layers.ENEMIES);
                                if (o?.isMesh) { o.userData.droneId = i; o.userData.__droneIndex = i; }
                            })}
                        >
                            {
                                droneMeshes.map((m, k) => (
                                    <mesh key={k} geometry={m.geo} material={m.mat} castShadow={false} receiveShadow={false} frustumCulled={false} />
                                ))
                            }
                        </group>
                    );
                })
            }

            {/* FX de explosión */}
            {
                explosions.map((e) => (
                    <ExplosionBillboard
                        key={e.id}
                        position={e.pos}
                        videoUrl={explosionVideoUrl}
                        onEnded={() => {
                            setExplosions((prev) => prev.filter((x) => x.id !== e.id));
                            const n = Math.min(5, useGameStore.getState().dronesDestroyed);
                            useGameStore.getState().showAccessOverlay(n, `Acceso a archivo nº${n}`);
                        }}
                        size={(CFG as any)?.fx?.explosionSize ?? 2.0}
                    />
                ))
            }
        </group>
    );
};

useGLTF.preload(CFG.models.drone);
export default Drones;
