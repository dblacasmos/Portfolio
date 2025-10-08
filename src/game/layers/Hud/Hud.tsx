import React, { useMemo, useRef, useLayoutEffect, useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { useThree, useFrame, createPortal } from "@react-three/fiber";
import { CFG } from "@/constants/config";
import { useHudEditorStore, type OrthoId } from "../../utils/state/hudEditor";
import { setLayerRecursive } from "@/game/utils/three/layers";
import { Crosshair } from "./Crosshair";
import AmmoBar from "./AmmoBar";
import HealthDial from "./dials/HealthDial";
import ShieldDial from "./dials/ShieldDial";
import ReloadBar from "./ReloadBar";
import DronesCounterHud from "./DronesCounter";
import Radar from "./Radar";
import { useGameStore } from "../../utils/state/store";

const HUD_LAYER = CFG.layers.HUD;
const OVERLAY_ORDER = 20000;

/* ---------------- Hex Vignette (barato, aditivo) ---------------- */
const HexVignette: React.FC<{ zoom: number; aspect: number; color?: string }> = ({ zoom, aspect, color }) => {
    const mat = useMemo(() => {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uZoom: { value: 0 },
                uAspect: { value: 1 },
                uColor: { value: new THREE.Color(color ?? (CFG.hud?.colors?.neonCyan ?? "#22D3EE")) },
            },
            vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
            fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime, uZoom, uAspect;
        uniform vec3  uColor;

        float sdHex(vec2 p, float r){
          p.x *= uAspect;
          p = abs(p);
          return max(dot(p, vec2(0.8660254, 0.5)), p.x) - r;
        }
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }

        void main(){
          vec2 p = vUv * 2.0 - 1.0;
          float d = sdHex(p, 0.88);
          float ring = smoothstep(0.020, 0.0, abs(d));
          float glow = smoothstep(0.12, 0.0, abs(d));
          float vign = smoothstep(0.0, 1.2, length(p)) * 0.6;

          float n = h(floor(p*vec2(640.0,640.0))) * 0.25 + 0.75;
          float z = clamp(uZoom, 0.0, 1.0);
          float amp = mix(0.0, 0.9, z);
          float s = (0.75 + 0.25*sin(uTime*3.0)) * amp;

          vec3 col = uColor * ( ring * (1.2 + s) + glow*0.35 + vign*0.08 );
          gl_FragColor = vec4(col * n, z * 0.85);
        }`,
        });
    }, [color]);

    useFrame((state) => {
        (mat.uniforms.uTime as any).value = state.clock.elapsedTime;
        (mat.uniforms.uZoom as any).value = Math.max(0, Math.min(1, zoom));
        (mat.uniforms.uAspect as any).value = aspect;
    });

    return (
        <mesh renderOrder={OVERLAY_ORDER + 2} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
};

/* ---------------- util editor ---------------- */

function clampToSafe(
    x: number,
    y: number,
    w: number,
    h: number,
    aspect: number,
    safeX = CFG.hud.ui.safeX,
    safeY = CFG.hud.ui.safeY
) {
    const minX = -aspect + safeX + w / 2;
    const maxX = +aspect - safeX - w / 2;
    const minY = -1 + safeY + h / 2;
    const maxY = +1 - safeY - h / 2;
    return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
}

function snap(v: number, step = CFG.hud.ui.snapStep) {
    if (!step || step <= 0) return v;
    return Math.round(v / step) * step;
}

type Rect = { id: OrthoId; cx: number; cy: number; w: number; h: number };
function hitRect(nxWorld: number, nyWorld: number, rects: Rect[]): OrthoId | null {
    for (let i = rects.length - 1; i >= 0; i--) {
        const r = rects[i];
        if (nxWorld >= r.cx - r.w / 2 && nxWorld <= r.cx + r.w / 2 && nyWorld >= r.cy - r.h / 2 && nyWorld <= r.cy + r.h / 2) {
            return r.id;
        }
    }
    return null;
}

/* ---------------- contenedor ---------------- */

const ForceHudFlags: React.FC<{ children: React.ReactNode; refresh?: any }> = ({ children, refresh }) => {
    const group = useRef<THREE.Group>(null!);

    const applyHudFlags = useCallback((o: any) => {
        o.layers?.set?.(HUD_LAYER);
        if (o.isMesh || o.isLine || o.isPoints || o.isSprite) {
            o.renderOrder = OVERLAY_ORDER;
            o.frustumCulled = false;
            const mats = (o.material ?? null) as THREE.Material | THREE.Material[] | null;
            const apply = (m?: THREE.Material) => {
                if (!m) return;
                m.depthTest = false;
                m.depthWrite = false;
                (m as any).toneMapped = false;
                m.transparent = true;
            };
            if (Array.isArray(mats)) mats.forEach(apply);
            else apply(mats ?? undefined);
        }
    }, []);

    useLayoutEffect(() => {
        const g = group.current;
        if (!g) return;
        g.traverse(applyHudFlags);
    }, [applyHudFlags]);

    // Re-aplica flags al cambiar subtree (p.ej. togglear Radar)
    useEffect(() => {
        const g = group.current;
        if (g) g.traverse(applyHudFlags);
    }, [applyHudFlags, refresh, children]);

    return (
        <group
            ref={group}
            onUpdate={(g) => {
                setLayerRecursive(g, HUD_LAYER);
                g.traverse(applyHudFlags);
            }}
        >
            {children}
        </group>
    );
};

/* Frame visual del editor desactivado (no se usa aquí) */
const Frame: React.FC<{
    center: [number, number, number];
    size: [number, number];
    selected?: boolean;
    hovered?: boolean;
}> = () => null;

/* ------------------------------ HUD ------------------------------ */

export type HudProps = {
    mag: number;
    magSize?: number;
    reserve: number;
    reloading: boolean;
    reloadT?: number;
    health?: number;
    shield?: number;
    player?: { x: number; y: number; headingRad: number };
    env?: { walls?: THREE.Object3D | null; ground?: THREE.Object3D | null } | null;
    getEnemyMeshes?: () => THREE.Object3D[] | null;
    getPoiMeshes?: () => THREE.Object3D[] | null;
    getPlayer2D?: () => { x: number; y: number; headingRad: number };
    zoom?: number;
    overTarget?: boolean;
};

export default function Hud({
    mag,
    magSize,
    reserve,
    reloading,
    reloadT,
    health = 100,
    shield = 100,
    player,
    env = null,
    getEnemyMeshes,
    getPoiMeshes,
    getPlayer2D,
    zoom = 0,
    overTarget = false,
}: HudProps) {
    const { size, gl, scene, camera } = useThree();

    const [portalTarget, setPortalTarget] = useState<THREE.Object3D | null>(null);

    // Root fijo en la escena (evita depender de matrices de la cámara)
    useLayoutEffect(() => {
        let root = (scene as any).userData?.__hudRoot as THREE.Group | undefined;
        if (!root) {
            root = new THREE.Group();
            root.name = "__hudRoot";
            scene.add(root);
            (scene as any).userData.__hudRoot = root;
        }
        setPortalTarget(root);
    }, [scene]);

    const editEnabled = useHudEditorStore((s) => s.enabled);
    const setPos = useHudEditorStore((s) => s.setPos);
    const posMap = useHudEditorStore((s) => s.pos);
    const scaleMap = useHudEditorStore((s) => s.scale);
    const nudgeScale = useHudEditorStore((s) => s.nudgeScale);

    const aspect = size.width / size.height;
    const responsiveScale = CFG.hud.ui.scaleForAspect(aspect);

    /* === Toggle + zoom del radar === */
    const [radarOn, setRadarOn] = useState(true);
    useEffect(() => {
        const t = () => setRadarOn((v) => !v);
        window.addEventListener("hud:toggle-radar", t as any);
        return () => window.removeEventListener("hud:toggle-radar", t as any);
    }, []);

    // Hotkeys M (toggle radar) y F (fullscreen). Ignora si editor o menú.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const menuOpen = useGameStore.getState().menuOpen;
            if (editEnabled || menuOpen) return;
            if (e.code === "KeyM") {
                setRadarOn((v) => !v);
                e.preventDefault(); e.stopPropagation();
            } else if (e.code === "KeyF") {
                const el = (gl?.domElement ?? document.documentElement) as any;
                if (document.fullscreenElement) document.exitFullscreen?.();
                else el?.requestFullscreen?.();
                e.preventDefault(); e.stopPropagation();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [gl, editEnabled]);

    const [radarZoom, setRadarZoom] = useState(1);
    useEffect(() => {
        const onZoom = (e: CustomEvent<{ mul?: number }>) => {
            const mul = e?.detail?.mul ?? 1;
            setRadarZoom((z) => THREE.MathUtils.clamp(z * mul, 0.5, 8));
        };
        window.addEventListener("hud:radar-zoom", onZoom as any);
        return () => window.removeEventListener("hud:radar-zoom", onZoom as any);
    }, []);

    /* ----------------- Posiciones por defecto + tamaños ----------------- */

    const defaultAmmoPos = useMemo<[number, number, number]>(() => {
        const planeW = CFG.hud.ammo.size * responsiveScale;
        const planeH = planeW * (CFG.hud.ammo.canvasPx[1] / CFG.hud.ammo.canvasPx[0]);
        const x = aspect - CFG.hud.ammo.offset.right - planeW / 2;
        const y = -1 + CFG.hud.ammo.offset.bottom + planeH / 2;
        return [x, y, 0];
    }, [aspect, responsiveScale]);

    const defaultDialPos = useCallback(
        (which: "health" | "shield") => {
            const s = CFG.hud.dials.size * responsiveScale;
            const off = CFG.hud.dials[which];
            return [-aspect + off.left + s / 2, -1 + off.bottom + s / 2, 0] as [number, number, number];
        },
        [aspect, responsiveScale]
    );

    const defaultReloadPos = useMemo<[number, number, number]>(() => [CFG.hud.reloadBar.x, CFG.hud.reloadBar.y, 0], []);
    const defaultCrosshairPos = useMemo<[number, number, number]>(() => [0, 0, 0], []);
    const defaultCounterPos = useMemo<[number, number, number]>(() => {
        const dc = CFG.hud.dronesCounter;
        const [Wc, Hc] = (dc.canvasPx ?? [340, 92]) as [number, number];
        const sizeW = (dc.size ?? 0.4) as number;
        const planeW = sizeW * responsiveScale;
        const planeH = planeW * (Hc / Wc);
        const topPx = dc.topPx ?? 8;
        const viewH = (typeof window !== "undefined" ? window.innerHeight : size.height) || size.height;
        const yTop = 1 - 2 * (topPx / viewH);
        const y = yTop - planeH / 2;
        return [0, y, 0];
    }, [responsiveScale, size.height]);

    // Radar / escala
    const [radarW0, radarH0] = CFG.hud.radar.plane as [number, number];
    const layoutScale = CFG.hud.layoutOverrides?.scale?.radar3d ?? 1;
    const editorScale = editEnabled ? (scaleMap.radar3d ?? 1) : 1;
    const radarScale = THREE.MathUtils.clamp(layoutScale * editorScale, 0.2, 1.2);
    const radarBaseW = radarW0 * responsiveScale;
    const radarBaseH = radarH0 * responsiveScale;
    const radarPlaneW = radarBaseW * radarScale;
    const radarPlaneH = radarBaseH * radarScale;

    useEffect(() => {
        const onSize = (e: any) => {
            const mul = e?.detail?.mul ?? 1.0;
            nudgeScale("radar3d", mul);
        };
        window.addEventListener("hud:radar-size", onSize as any);
        return () => window.removeEventListener("hud:radar-size", onSize as any);
    }, [nudgeScale, editEnabled]);

    const defaultRadarPos = useMemo<[number, number, number]>(() => {
        const x = aspect - (CFG.hud.radar.offset.right ?? 0.32) - radarPlaneW / 2;
        const y = 1 - (CFG.hud.radar.offset.top ?? 0.3) - radarPlaneH / 2;
        return [x, y, 0];
    }, [aspect, radarPlaneW, radarPlaneH]);

    // Pos finales
    const ammoPos = posMap.ammo ? ([posMap.ammo.x, posMap.ammo.y, 0] as [number, number, number]) : defaultAmmoPos;
    const healthPos = posMap.health ? ([posMap.health.x, posMap.health.y, 0] as [number, number, number]) : defaultDialPos("health");
    const shieldPos = posMap.shield ? ([posMap.shield.x, posMap.shield.y, 0] as [number, number, number]) : defaultDialPos("shield");
    const reloadPos = posMap.reload ? ([posMap.reload.x, posMap.reload.y, 0] as [number, number, number]) : defaultReloadPos;
    const crossPos = posMap.crosshair ? ([posMap.crosshair.x, posMap.crosshair.y, 0] as [number, number, number]) : defaultCrosshairPos;
    const counterPos = posMap.counter ? ([posMap.counter.x, posMap.counter.y, 0] as [number, number, number]) : defaultCounterPos;
    const radarPos = posMap.radar3d ? ([posMap.radar3d.x, posMap.radar3d.y, 0] as [number, number, number]) : defaultRadarPos;

    // Tamaños (para marcos / clamp)
    const ammoW = CFG.hud.ammo.size * responsiveScale * (scaleMap.ammo ?? 1);
    const ammoH = ammoW * (CFG.hud.ammo.canvasPx[1] / CFG.hud.ammo.canvasPx[0]);
    const dialS = CFG.hud.dials.size * responsiveScale;
    const healthS = dialS * (scaleMap.health ?? 1);
    const shieldS = dialS * (scaleMap.shield ?? 1);
    const reloadW = CFG.hud.reloadBar.size[0] * (scaleMap.reload ?? 1);
    const reloadH = CFG.hud.reloadBar.size[1] * (scaleMap.reload ?? 1);
    const crossS = CFG.hud.crosshair.size * responsiveScale * (scaleMap.crosshair ?? 1);
    const dc: any = CFG.hud.dronesCounter;
    const [Wc, Hc] = (dc.canvasPx ?? [340, 92]) as [number, number];
    const counterW = (dc.size ?? 0.8) * responsiveScale * (scaleMap.counter ?? 1);
    const counterH = counterW * (Hc / Wc);

    /* Lista de rects (hit test pantalla) */
    const rects = useMemo(
        () => [
            { id: "radar3d", cx: radarPos[0], cy: radarPos[1], w: radarPlaneW, h: radarPlaneH },
            { id: "counter", cx: counterPos[0], cy: counterPos[1], w: counterW, h: counterH },
            { id: "reload", cx: reloadPos[0], cy: reloadPos[1], w: reloadW, h: reloadH },
            { id: "ammo", cx: ammoPos[0], cy: ammoPos[1], w: ammoW, h: ammoH },
            { id: "health", cx: healthPos[0], cy: healthPos[1], w: healthS, h: healthS },
            { id: "shield", cx: shieldPos[0], cy: shieldPos[1], w: shieldS, h: shieldS },
            { id: "crosshair", cx: crossPos[0], cy: crossPos[1], w: crossS, h: crossS },
        ],
        [radarPos, radarPlaneW, radarPlaneH, counterPos, counterW, counterH, reloadPos, reloadW, reloadH, ammoPos, ammoW, ammoH, healthPos, healthS, shieldPos, shieldS, crossPos, crossS]
    ) as { id: OrthoId; cx: number; cy: number; w: number; h: number }[];

    /* Clamp al entrar en editor */
    useEffect(() => {
        if (!editEnabled) return;
        const applyClamp = (id: OrthoId, cx: number, cy: number, w: number, h: number) => {
            const c = clampToSafe(cx, cy, w, h, aspect);
            if (c.x !== cx || c.y !== cy) setPos(id, { x: c.x, y: c.y });
        };
        rects.forEach((r) => applyClamp(r.id, r.cx, r.cy, r.w, r.h));
        document.body.style.cursor = "default";
        return () => { document.body.style.cursor = ""; };
    }, [editEnabled, rects, aspect, setPos]);

    /* Auto-clamp silencioso en resize/fullscreen */
    const lastSizeRef = useRef({ w: 0, h: 0 });
    useEffect(() => {
        const w = size.width, h = size.height;
        const changed = w !== lastSizeRef.current.w || h !== lastSizeRef.current.h;
        lastSizeRef.current = { w, h };
        if (!changed || editEnabled) return;
        const EPS = 1e-3;
        rects.forEach((r) => {
            const cl = clampToSafe(r.cx, r.cy, r.w, r.h, aspect);
            const out =
                Math.abs(cl.x - r.cx) > EPS ||
                Math.abs(cl.y - r.cy) > EPS ||
                r.cx < -aspect - r.w / 2 ||
                r.cx > +aspect + r.w / 2 ||
                r.cy < -1 - r.h / 2 ||
                r.cy > +1 + r.h / 2;
            if (out) setPos(r.id, { x: cl.x, y: cl.y });
        });
    }, [size.width, size.height, aspect, editEnabled, rects, setPos]);

    /* Entrada editor (drag/resize) */
    const dragRef = useRef<{ id: OrthoId; dx: number; dy: number } | null>(null);

    const toOrtho = useCallback(
        (clientX: number, clientY: number) => {
            const rect = gl.domElement.getBoundingClientRect();
            const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
            const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
            return { x: nx * aspect, y: ny };
        },
        [gl, aspect]
    );

    useEffect(() => {
        if (!editEnabled) return;

        const onMouseDown = (ev: MouseEvent) => {
            if (ev.button !== 0) return;
            const p = toOrtho(ev.clientX, ev.clientY);
            const id = hitRect(p.x, p.y, rects);
            useHudEditorStore.getState().setHovered(id);
            useHudEditorStore.getState().setSelected(id);
            if (id) {
                const r = rects.find((rr) => rr.id === id)!;
                dragRef.current = { id, dx: r.cx - p.x, dy: r.cy - p.y };
                document.body.style.cursor = "grabbing";
                ev.preventDefault();
                ev.stopPropagation();
            }
        };

        const onMouseMove = (ev: MouseEvent) => {
            const p = toOrtho(ev.clientX, ev.clientY);
            if (dragRef.current && useHudEditorStore.getState().selected === dragRef.current.id) {
                const id = dragRef.current.id;
                const r = rects.find((rr) => rr.id === id)!;
                let nx = p.x + dragRef.current.dx;
                let ny = p.y + dragRef.current.dy;
                const cl = clampToSafe(nx, ny, r.w, r.h, aspect);
                nx = snap(cl.x);
                ny = snap(cl.y);
                setPos(id, { x: nx, y: ny });
                ev.preventDefault();
                return;
            }
            const id = hitRect(p.x, p.y, rects);
            useHudEditorStore.getState().setHovered(id);
        };

        const onMouseUp = () => {
            dragRef.current = null;
            if (useHudEditorStore.getState().selected) document.body.style.cursor = "default";
        };

        const onWheel = (ev: WheelEvent) => {
            if (!ev.shiftKey) return;
            const id = useHudEditorStore.getState().selected;
            if (!id) return;
            const dir = ev.deltaY > 0 ? 0.94 : 1.06;
            nudgeScale(id, dir);
            ev.preventDefault();
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                useHudEditorStore.getState().setSelected(null);
                useHudEditorStore.getState().setHovered(null);
                document.body.style.cursor = "default";
            }
        };

        window.addEventListener("mousedown", onMouseDown, { capture: true });
        window.addEventListener("mousemove", onMouseMove, { capture: true });
        window.addEventListener("mouseup", onMouseUp, { capture: true });
        window.addEventListener("wheel", onWheel, { capture: true, passive: false });
        window.addEventListener("keydown", onKey, { capture: true });

        return () => {
            window.removeEventListener("mousedown", onMouseDown as any, { capture: true } as any);
            window.removeEventListener("mousemove", onMouseMove as any, { capture: true } as any);
            window.removeEventListener("mouseup", onMouseUp as any, { capture: true } as any);
            window.removeEventListener("wheel", onWheel as any, { capture: true } as any);
            window.removeEventListener("keydown", onKey as any, { capture: true } as any);
            document.body.style.cursor = "";
        };
    }, [editEnabled, rects, toOrtho, nudgeScale, setPos, aspect]);

    /* Spread/Recoil del crosshair */
    const [spread, setSpread] = useState(0);
    useEffect(() => {
        const onShot = (e: Event) => {
            const power = Math.max(0, Math.min(1, (e as CustomEvent).detail?.power ?? 1));
            const bump = (CFG.hud.crosshair?.spread?.bump ?? 0.35) * power;
            setSpread((s) => Math.min(1, s + bump));
        };
        window.addEventListener("weapon:shot", onShot as any);
        return () => window.removeEventListener("weapon:shot", onShot as any);
    }, []);
    useFrame((_, dt) => {
        if (spread <= 0) return;
        const recover = CFG.hud.crosshair?.spread?.recoverPerSec ?? 2.5;
        if (recover > 0) setSpread((s) => Math.max(0, s - recover * dt));
    });

    /* Failsafe de capas HUD en cámaras */
    useFrame(() => {
        const ensureEnabled = (obj?: THREE.Object3D | null) => {
            const L = obj && (obj as any).layers as THREE.Layers | undefined;
            if (!L) return;
            const bit = 1 << HUD_LAYER;
            if ((L.mask & bit) === 0) L.enable(HUD_LAYER);
        };
        ensureEnabled(camera as any);
        const uiCam = (scene as any)?.userData?.__uiCam as THREE.Camera | undefined;
        ensureEnabled(uiCam as any);
    });

    if (!portalTarget) return null;

    const hudZoomMul = 1 + (CFG.hud?.crosshair?.zoom?.uiMul ?? 0.25) * Math.max(0, Math.min(1, zoom));

    return createPortal(
        <group key="hud-root" position={[0, 0, -1]} scale={[hudZoomMul, hudZoomMul, 1]}>
            {/* refresh={radarOn} fuerza re-traversal de flags/layers */}
            <ForceHudFlags refresh={radarOn}>
                {/* HEX VIGNETTE */}
                <HexVignette zoom={zoom} aspect={size.width / size.height} />

                {/* CROSSHAIR */}
                <group>
                    <Crosshair
                        position={posMap.crosshair ? ([posMap.crosshair.x, posMap.crosshair.y, 0] as [number, number, number]) : [0, 0, 0]}
                        spread={spread}
                        zoom={zoom}
                        overTarget={overTarget}
                        headingRad={player?.headingRad ?? 0}
                    />
                </group>

                {/* AMMO */}
                <group scale={useHudEditorStore.getState().scale.ammo ?? 1}>
                    <AmmoBar
                        mag={mag}
                        magSize={magSize}
                        reserve={reserve}
                        reloading={reloading}
                        position={posMap.ammo ? ([posMap.ammo.x, posMap.ammo.y, 0] as [number, number, number]) : defaultAmmoPos}
                        size={CFG.hud.ammo.size}
                        uiScale={CFG.hud.ui.scale}
                        stretchX={CFG.hud.ammo.stretchX}
                    />
                </group>

                {/* DIALS */}
                <group scale={useHudEditorStore.getState().scale.health ?? 1}>
                    <HealthDial value={health} position={posMap.health ? ([posMap.health.x, posMap.health.y, 0] as [number, number, number]) : defaultDialPos("health")} size={CFG.hud.dials.size} />
                </group>
                <group scale={useHudEditorStore.getState().scale.shield ?? 1}>
                    <ShieldDial value={shield} position={posMap.shield ? ([posMap.shield.x, posMap.shield.y, 0] as [number, number, number]) : defaultDialPos("shield")} size={CFG.hud.dials.size} />
                </group>

                {/* RELOAD */}
                <group scale={useHudEditorStore.getState().scale.reload ?? 1}>
                    <ReloadBar
                        reloading={useHudEditorStore.getState().enabled ? true : reloading}
                        progress={useHudEditorStore.getState().enabled ? (useHudEditorStore.getState().reloadPreview ?? 0.7) : (reloadT ?? 0)}
                        position={posMap.reload ? ([posMap.reload.x, posMap.reload.y, 0] as [number, number, number]) : defaultReloadPos}
                    />
                </group>

                {/* COUNTER */}
                <group scale={useHudEditorStore.getState().scale.counter ?? 1}>
                    <DronesCounterHud position={posMap.counter ? ([posMap.counter.x, posMap.counter.y, 0] as [number, number, number]) : defaultCounterPos} />
                </group>

                {/* RADAR */}
                {player && radarOn && (
                    <Radar
                        position={posMap.radar3d ? ([posMap.radar3d.x, posMap.radar3d.y, 0] as [number, number, number]) : defaultRadarPos}
                        width={radarPlaneW}
                        height={radarPlaneH}
                        getPlayer2D={getPlayer2D}
                        zoomMul={radarZoom}
                        getEnemyMeshes={getEnemyMeshes}
                        getPoiMeshes={getPoiMeshes}
                        sweepEnabled={((CFG as any)?.hud?.radar?.sweepOn ?? true) !== false}
                        fillAlpha={0.38}
                    />
                )}
            </ForceHudFlags>
        </group>,
        portalTarget
    );
}
