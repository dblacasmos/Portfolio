// ============================
// FILE: src/game/Game.tsx
// ============================
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import Drones from "./layers/Enemies/Drones";
import { CFG } from "../constants/config";
import { MissionCard } from "./overlays/MissionCard";
import MenuInGame from "./overlays/MenuInGame";
import DestroyDroneCard from "./overlays/DestroyDroneCard";
import { useGameStore } from "./utils/state/store";
import { audioManager } from "./utils/audio/audio";
import { useHudEditorStore } from "./utils/state/hudEditor";
import Player from "./layers/Player/Player";
import { ColliderEnvBVH } from "./utils/collision/colliderEnvBVH";
import { ContextLostShield } from "./overlays/ContextLostOverlay";
import { LaserSystem, type Laser, makeLaser } from "./layers/Shots/Lasers";
import SceneRoot from "./layers/World/SceneRoot";
import type { CityReadyInfo } from "./layers/World/City";
import {
  showGlobalLoadingOverlay,
  setGlobalLoadingProgress,
  isGlobalLoadingActive,
  markGlobalLoadingStage,
} from "./overlays/GlobalLoadingPortal";
import { patchThreeColorAlphaWarning } from "./utils/three/fixColorAlpha";
import EndDoor from "./layers/World/EndDoor";
import HudEditOverlay from "./overlays/HudEditOverlay";
import Quality from "./graphics/quality";
import { initKTX2Loader } from "./utils/three/ktx2/ktx2";
import { ASSETS } from "@/constants/assets";

patchThreeColorAlphaWarning();

/* ------------------ Helpers & Dev Bridge ------------------ */

function DevBridge() {
  const { invalidate, scene, camera } = useThree();
  useEffect(() => {
    (window as any).__invalidate = () => invalidate();
    (window as any).__toggleMenu = (on?: boolean) =>
      useGameStore.getState().setMenuOpen(on ?? !useGameStore.getState().menuOpen);
    (window as any).__exitLock = () => {
      try { document.exitPointerLock(); }
      catch (e) { console.error("[Game] Error al salir de pointer lock:", e); }
    };
    (window as any).__scene = scene;
    (window as any).__camera = camera;
    (window as any).__mem = () => {
      try {
        const gl: any = (window as any).__renderer;
        const info = gl?.info;
        console.table({
          geometries: info?.memory?.geometries,
          textures: info?.memory?.textures,
          programs: info?.programs?.length
        });
      } catch (e) {
        console.warn("[Game] No se pudo leer memoria de Three:", e);
      }
    };
    (window as any).__layers = CFG.layers;
    try { (window as any).useGameStore = useGameStore; } catch { }
    return () => {
      delete (window as any).__invalidate;
      delete (window as any).__toggleMenu;
      delete (window as any).__exitLock;
      delete (window as any).__scene;
      delete (window as any).__camera;
      delete (window as any).__mem;
      delete (window as any).__layers;
      try { delete (window as any).useGameStore; } catch { }
    };
  }, [invalidate, scene, camera]);
  return null;
}

const FirstFramePing: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const done = useRef(false);
  const cb = useCallback(() => {
    if (!done.current) {
      done.current = true;
      onReady();
    }
  }, [onReady]);
  useEffect(() => {
    const id = requestAnimationFrame(() => cb());
    return () => cancelAnimationFrame(id);
  }, [cb]);
  return null;
};

/* ====================== Componente principal ====================== */

const Game: React.FC = () => {
  const menuOpen = useGameStore((s) => s.menuOpen);
  const setMissionCard = useGameStore((s) => s.setMissionCard ?? (() => { }));
  const missionCardMode = useGameStore((s) => (s as any).missionCardMode ?? null);
  const hudEditEnabled = useHudEditorStore((s) => s.enabled);
  const accessVisible = useGameStore((s) => s.accessOverlay.visible);

  const endDoorEnabled = useGameStore((s) => s.endDoorEnabled);
  const allDronesDown = useGameStore((s) => (s as any).allDronesDown ?? false);
  const setEndDoorEnabled = useGameStore((s) => s.setEndDoorEnabled);

  const [overlayActive, setOverlayActive] = useState<boolean>(false);
  const introShownRef = useRef(false);

  const envRef = useRef<ColliderEnvBVH | null>(null);

  const cityInfoRef = useRef<{ center: THREE.Vector2; radius: number } | null>(null);
  const roadsMeshRef = useRef<THREE.Mesh | null>(null);
  const wallsMeshRef = useRef<THREE.Mesh | null>(null);

  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const groundYRef = useRef<number>(0);

  const forbidMeshRef = useRef<THREE.Mesh | null>(null);

  const playerSpawnRef = useRef<THREE.Vector3 | null>(null);
  const endDoorRef = useRef<THREE.Vector3 | null>(null);

  const [spawnAt, setSpawnAt] = useState<THREE.Vector3 | null>(null);
  const [spawnLookAt, setSpawnLookAt] = useState<THREE.Vector3 | null>(null);

  const [endDoorAt, setEndDoorAt] = useState<THREE.Vector3 | null>(null);
  const [endDoorLookAt, setEndDoorLookAt] = useState<THREE.Vector3 | null>(null);
  const endDoorMeshRef = useRef<THREE.Object3D | null>(null);

  const canMoveFrom = useCallback((pos: THREE.Vector3) => {
    const env = envRef.current;
    if (!env) return true;

    const eye = CFG.move.standHeight;
    const rBase = CFG.collision?.radiusStand ?? 0.26;
    const rWalls = Math.max(0.05, rBase - (CFG.collision?.wallPadding ?? 0));

    const capStart = new THREE.Vector3(pos.x, (pos.y - eye) + rBase, pos.z);
    const capEnd = new THREE.Vector3(pos.x, (pos.y - eye) + Math.max(eye - rBase, rBase), pos.z);

    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(), new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(), new THREE.Vector3(-1, 0, -1).normalize(),
    ];
    const tryLen = 0.6;
    for (const d of dirs) {
      const corrected = env.sweepCapsule(capStart, capEnd, rWalls, d.clone().multiplyScalar(tryLen));
      if (corrected.length() > tryLen * 0.5) return true;
    }
    return false;
  }, []);

  const handleSceneReady = useCallback((info: CityReadyInfo) => {
    if (envRef.current) {
      envRef.current.setMeshes(info.groundMesh ?? null, info.wallsMesh ?? null);
    } else {
      envRef.current = new ColliderEnvBVH(info.groundMesh ?? null, info.wallsMesh ?? null, {
        separationEps: 0.001,
        maxPasses: 4,
        minWallY: -Infinity,
      });
    }
    cityInfoRef.current = { center: info.center, radius: info.radius };
    roadsMeshRef.current = info.roadsMesh ?? null;
    wallsMeshRef.current = info.wallsMesh ?? null;

    groundMeshRef.current = info.groundMesh ?? null;
    groundYRef.current = info.groundY;

    forbidMeshRef.current = (info as any).forbidMesh ?? null;

    try {
      const side = (CFG.player.spawnSide ?? "east") as "east" | "west" | "north" | "south";
      const baseInset = Math.max(1.0, CFG.player.spawnEdgeInset ?? 3.5);
      const lateral = CFG.player.spawnLateralOffset ?? 0;

      const dir2 = new THREE.Vector2(
        side === "east" ? 1 : side === "west" ? -1 : 0,
        side === "north" ? 1 : side === "south" ? -1 : 0
      );
      if (dir2.lengthSq() === 0) dir2.set(1, 0);

      const fwd2 = new THREE.Vector2(-dir2.x, -dir2.y);
      const right2 = new THREE.Vector2(fwd2.y, -fwd2.x).normalize();

      const eyeH = CFG.move.standHeight;
      const center3 = new THREE.Vector3(info.center.x, info.groundY + eyeH + 0.02, info.center.y);

      let chosen: THREE.Vector3 | null = null;
      const maxExtra = 6;
      const stepSize = 0.5;

      for (let extra = 0; extra <= maxExtra + 1e-6; extra += stepSize) {
        const inset = baseInset + extra;
        const r = Math.max(0, info.radius - inset);

        let px = info.center.x + dir2.x * r;
        let pz = info.center.y + dir2.y * r;

        px += right2.x * lateral;
        pz += right2.y * lateral;

        const gy = envRef.current?.groundY(px, pz) ?? info.groundY;
        const safeY = gy + eyeH + 0.02;
        const pos = new THREE.Vector3(px, safeY, pz);

        if (canMoveFrom(pos)) { chosen = pos; break; }
      }

      if (!chosen) {
        const r = Math.max(0, info.radius - (baseInset + maxExtra));
        chosen = new THREE.Vector3(
          info.center.x + dir2.x * r + right2.x * lateral,
          info.groundY + eyeH + 0.02,
          info.center.y + dir2.y * r + right2.y * lateral
        );
      }

      setSpawnAt(chosen);
      playerSpawnRef.current = chosen;
      setSpawnLookAt(center3);

      const doorInset = Math.max(0.5, (CFG as any)?.endDoor?.inset ?? 1.2);
      const rDoor = Math.max(0, info.radius - doorInset);
      const doorDir2 = new THREE.Vector2(-dir2.x, -dir2.y).normalize();
      const rightDoor2 = new THREE.Vector2(dir2.y, -dir2.x).normalize();
      const lateralDoor = (CFG as any)?.endDoor?.lateralOffset ?? 0;
      const doorX = info.center.x + doorDir2.x * rDoor + rightDoor2.x * lateralDoor;
      const doorZ = info.center.y + doorDir2.y * rDoor + rightDoor2.y * lateralDoor;
      const doorGy = envRef.current?.groundY(doorX, doorZ) ?? info.groundY;
      const doorPos = new THREE.Vector3(doorX, doorGy + 0.1, doorZ);
      setEndDoorAt(doorPos);
      endDoorRef.current = doorPos;
      setEndDoorLookAt(new THREE.Vector3(info.center.x, doorGy + 1.2, info.center.y));
    } catch (e) {
      console.warn("[Game] handleSceneReady falló:", e);
    }

    try { markGlobalLoadingStage("scene-ready"); } catch { }
  }, [canMoveFrom]);

  const [canvasKey, setCanvasKey] = useState(0);
  useEffect(() => {
    const onQ = () => setCanvasKey((k) => k + 1);
    window.addEventListener("quality-changed", onQ as any);
    return () => {
      window.removeEventListener("quality-changed", onQ as any);
    };
  }, []);

  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const ktx2HandleRef = useRef<any>(null);
  const lostHandlerRef = useRef<((e: Event) => void) | null>(null);
  const restHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try { if (!isGlobalLoadingActive()) showGlobalLoadingOverlay(); }
    catch (e) { console.error("[Game] showGlobalLoadingOverlay falló:", e); }
  }, []);

  useEffect(() => {
    const A = (ASSETS as any)?.audio || {};
    const urls = [A.shotLaser, A.reload, A.step, A.explosionDron].filter(Boolean);
    if (urls.length) {
      audioManager.loadMany(urls).catch((e) => {
        console.warn("[Game] Falló la precarga de SFX:", e);
      });
    } else {
      console.warn("[Game] Faltan URLs de SFX en ASSETS.audio.");
    }
    (window as any).__testSfx = async () => {
      try { await audioManager.ensureStarted(); }
      catch (e) { console.error("[Audio] ensureStarted() falló:", e); }
      for (const u of urls) {
        try { audioManager.playSfx(u, 1.0); } catch (e) { console.warn("[Audio] playSfx falló:", e); }
        await new Promise(r => setTimeout(r, 250));
      }
    };
    return () => { try { delete (window as any).__testSfx; } catch { } };
  }, []);

  useEffect(() => {
    const ctx: AudioContext | undefined = (audioManager as any)?.ctx;
    if (!ctx) return;

    const tryResume = async () => {
      try {
        if (ctx.state !== "running") {
          await ctx.resume();
        }
      } catch (e) {
        console.error("[Audio] Resume falló:", e);
      }
    };

    const onGesture = () => {
      tryResume().finally(() => {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      });
    };
    if (ctx.state !== "running") {
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("keydown", onGesture, { once: true });
    }

    const onVisibility = () => { if (!document.hidden) tryResume(); };
    document.addEventListener("visibilitychange", onVisibility);

    const onFocus = () => { tryResume(); };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    return () => {
      try { (audioManager as any)?.stopAll?.(); (audioManager as any).ctx?.suspend?.(); } catch { }
      const gl = glRef.current;
      try {
        const canvas = gl?.domElement as HTMLCanvasElement | undefined;
        if (canvas && lostHandlerRef.current) canvas.removeEventListener("webglcontextlost", lostHandlerRef.current);
        if (canvas && restHandlerRef.current) canvas.removeEventListener("webglcontextrestored", restHandlerRef.current as any);
      } catch (e) {
        console.warn("[WebGL] Limpieza de listeners falló:", e);
      }
      try { ktx2HandleRef.current?.dispose?.(); } catch { }
      if (!gl) return;
      try { gl.dispose(); } catch (e) { console.warn("[WebGL] gl.dispose() falló:", e); }
    };
  }, []);

  const clipLine = useCallback((from: THREE.Vector3, to: THREE.Vector3) => {
    const env = envRef.current;
    if (!env) return to.clone();
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 1e-6) return to.clone();
    dir.multiplyScalar(1 / len);
    const rc = new THREE.Raycaster(from, dir, 0, len);
    const hits: THREE.Intersection[] = [];
    if (env.walls) hits.push(...rc.intersectObject(env.walls, true));
    if (env.ground) hits.push(...rc.intersectObject(env.ground, true));
    const hit = hits.sort((a, b) => a.distance - b.distance)[0];
    return hit ? hit.point.clone().add(dir.clone().multiplyScalar(-0.01)) : to.clone();
  }, []);

  const [lasers, setLasers] = useState<Laser[]>([]);
  const dronesGetterRef = useRef<(() => THREE.Object3D[]) | null>(null);

  const mainCamRef = useRef<THREE.PerspectiveCamera | null>(null);

  const hasBlockingOverlay = hudEditEnabled || overlayActive || !!missionCardMode || accessVisible;
  const uiLocked = hasBlockingOverlay;

  useEffect(() => {
    try { setGlobalLoadingProgress(1); }
    catch (e) { console.error("[Game] setGlobalLoadingProgress(1) falló:", e); }
  }, []);

  useEffect(() => {
    const onDDCClose = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index;
      if (idx === 5 && allDronesDown) {
        try { setEndDoorEnabled(true); } catch { }
      }
    };
    window.addEventListener("destroy-drone-card-closed", onDDCClose as any);
    return () => window.removeEventListener("destroy-drone-card-closed", onDDCClose as any);
  }, [allDronesDown, setEndDoorEnabled]);

  useEffect(() => {
    const onShown = () => setOverlayActive(true);
    const onHidden = () => {
      setOverlayActive(false);
      if (!introShownRef.current) {
        introShownRef.current = true;
        setTimeout(() => {
          try { setMissionCard && setMissionCard("intro"); } catch { }
        }, 50);
      }
    };

    window.addEventListener("global-loading-shown", onShown as any);
    window.addEventListener("global-loading-hidden", onHidden as any);
    return () => {
      window.removeEventListener("global-loading-shown", onShown as any);
      window.removeEventListener("global-loading-hidden", onHidden as any);
    };
  }, [setMissionCard]);

  useEffect(() => {
    try { (window as any).__endDoorVisible = !!endDoorEnabled; } catch { }
    return () => { try { delete (window as any).__endDoorVisible; } catch { } };
  }, [endDoorEnabled]);

  useEffect(() => {
    if (menuOpen && hasBlockingOverlay) {
      try { useGameStore.getState().setMenuOpen(false); } catch { }
    }
  }, [menuOpen, hasBlockingOverlay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const st = useGameStore.getState();
      if (st.menuOpen) return;
      if (hasBlockingOverlay) return;
      if ((window as any).__squelchMenuEsc) {
        try { e.preventDefault(); e.stopPropagation(); } catch { }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      try { document.exitPointerLock?.(); }
      catch (err) { console.error("[Game] exitPointerLock falló:", err); }
      st.setMenuOpen(true);
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hasBlockingOverlay]);

  const onPlayerShoot = useCallback(
    (from: THREE.Vector3, to: THREE.Vector3, color: Laser["color"] = "green") => {
      try {
        const ctx: AudioContext | undefined = (audioManager as any)?.ctx;
        if (ctx && ctx.state !== "running") ctx.resume();
      } catch (e) {
        console.warn("[Audio] resume() falló antes de disparo:", e);
      }

      const getEnemies = dronesGetterRef.current;
      let firstHit: THREE.Intersection | null = null;
      if (getEnemies) {
        const meshes = getEnemies();
        if (meshes.length) {
          const dir = new THREE.Vector3().subVectors(to, from).normalize();
          const rc = new THREE.Raycaster(from, dir, 0, from.distanceTo(to));
          rc.layers.set(CFG.layers.ENEMIES);

          const aliveMeshes = meshes.filter(m => m && m.parent);
          const hits = rc.intersectObjects(aliveMeshes, true).sort((a, b) => a.distance - b.distance);
          if (hits.length) firstHit = hits[0];
        }
      }
      const clippedTo = clipLine(from, to);
      setLasers((prev) => [...prev, makeLaser(from, clippedTo, color)]);
      if (firstHit?.object) {
        try { (window as any).hitDroneByMesh?.(firstHit.object); } catch (e) { console.warn("[Game] hitDroneByMesh falló:", e); }
      }
    },
    [clipLine]
  );

  const onFirstFrame = useCallback(() => {
    try { markGlobalLoadingStage("first-frame"); } catch { }
  }, []);

  const registerTargetsStable = useCallback((getter: () => THREE.Object3D[]) => {
    dronesGetterRef.current = getter;
  }, []);

  const fsRootRef = useRef<HTMLDivElement | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoKindRef = useRef<null | "afterPortal" | "presentacion" | "capDos" | "video1">(null);

  const stopTrackedAudios = useCallback(() => {
    const A = (ASSETS as any)?.audio || {};
    const tryStop = (url?: string) => {
      if (!url) return;
      try {
        if (typeof (audioManager as any).stopUrl === "function") {
          (audioManager as any).stopUrl(url);
        } else if (typeof (audioManager as any).stop === "function") {
          (audioManager as any).stop(url);
        } else if (typeof (audioManager as any).squelchUrl === "function") {
          (audioManager as any).squelchUrl(url, 0.001);
        } else {
          (audioManager as any)?.stopAll?.();
        }
      } catch (e) {
        console.warn("[Audio] stop/squelch falló:", e);
      }
    };
    tryStop(A.introMusic);
    tryStop(A.portal);
    tryStop(A.capDos);
  }, []);

  useEffect(() => {
    (window as any).__fsRoot = fsRootRef;
    (window as any).__enterFS = async () => {
      const el = fsRootRef.current || document.getElementById("fs-root") || document.body;
      try { await (el as any)?.requestFullscreen?.(); }
      catch (e) { console.warn("[Game] requestFullscreen falló:", e); }
    };
    (window as any).__exitFS = async () => {
      try { await (document as any).exitFullscreen?.(); }
      catch (e) { console.warn("[Game] exitFullscreen falló:", e); }
    };
    return () => {
      try {
        delete (window as any).__fsRoot;
        delete (window as any).__enterFS;
        delete (window as any).__exitFS;
      } catch { }
    };
  }, []);

  const playCutsceneExclusive = useCallback(async (opts: {
    src: string;
    kind: "afterPortal" | "presentacion" | "capDos" | "video1";
    fadeInMs?: number;
    fadeOutMs?: number;
    onEnd?: () => void;
  }) => {
    const fadeInMs = Math.max(0, opts.fadeInMs ?? (CFG as any)?.endDoor?.fadeInMs ?? 220);
    const fadeOutMs = Math.max(0, opts.fadeOutMs ?? (CFG as any)?.endDoor?.fadeOutMs ?? 220);

    try { document.exitPointerLock?.(); } catch (e) { console.warn("[Game] exitPointerLock antes de vídeo falló:", e); }
    setOverlayActive(true);
    try { useGameStore.getState().setPlaying(false); } catch { }
    try { (audioManager as any)?.stopAll?.(); (audioManager as any).ctx?.suspend?.(); } catch (e) { console.warn("[Audio] stopAll/suspend falló:", e); }
    try { fsRootRef.current?.classList?.add("cutscene-active"); } catch { }

    const urlCfg = (CFG as any)?.routes?.main;
    const nextUrl = typeof urlCfg === "string" && urlCfg.trim().length ? urlCfg : "/main";

    const src = opts.src;

    const backdrop = document.createElement("div");
    backdrop.style.position = "fixed";
    backdrop.style.inset = "0";
    backdrop.style.background = "#000";
    backdrop.style.zIndex = "999998";
    backdrop.style.pointerEvents = "none";

    const el = document.createElement("video");
    el.src = src;
    el.playsInline = true;
    el.autoplay = true;
    el.controls = false;
    el.loop = false;
    el.muted = true;
    el.preload = "auto";
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.objectFit = "cover";
    el.style.zIndex = "999999";
    el.style.background = "#000";
    el.style.opacity = "0";
    el.style.transition = `opacity ${fadeInMs}ms ease`;

    const cleanup = () => {
      try { el.pause(); } catch (e) { console.debug("[Cutscene] pause() falló:", e); }
      try { el.src = ""; el.load(); } catch (e) { console.debug("[Cutscene] limpiar src/load falló:", e); }
      try { el.remove(); } catch (e) { console.debug("[Cutscene] remove() falló:", e); }
      try { backdrop.remove(); } catch (e) { console.debug("[Cutscene] backdrop.remove() falló:", e); }
      activeVideoRef.current = null;
      activeVideoKindRef.current = null;
    };

    const goNext = () => {
      try {
        el.style.transition = `opacity ${fadeOutMs}ms ease`;
        el.style.opacity = "0";
      } catch { }
      window.setTimeout(() => {
        cleanup();
        try { window.location.assign(nextUrl); }
        catch { (window as any).location.href = nextUrl; }
      }, fadeOutMs);
    };

    document.body.appendChild(backdrop);
    document.body.appendChild(el);
    activeVideoRef.current = el;
    activeVideoKindRef.current = opts.kind;

    let safetyFired = false;
    const safety = window.setTimeout(() => {
      safetyFired = true;
      goNext();
    }, Math.max(4000, ((CFG as any)?.endDoor?.afterPortalTimeoutMs ?? 12000)));

    const clearSafety = () => { try { window.clearTimeout(safety); } catch { } };

    el.addEventListener("ended", () => { clearSafety(); if (!safetyFired) goNext(); });
    el.addEventListener("error", () => { clearSafety(); if (!safetyFired) goNext(); });

    try {
      await el.play();
      requestAnimationFrame(() => { try { el.style.opacity = "1"; } catch { } });
      try {
        el.muted = false;
        el.volume = Math.max(0, Math.min(1, (CFG as any)?.audio?.cutsceneVolume ?? 1.0));
      } catch { }
    } catch {
      clearSafety();
      goNext();
    }
  }, [setOverlayActive]);

  const playAfterPortalAndNavigate = useCallback(async () => {
    const srcFromAssets = (ASSETS as any)?.video?.afterPortal as string | undefined;
    const srcFromCfg = (CFG as any)?.endDoor?.afterPortalUrl as string | undefined;
    const fallback = "/assets/video/afterPortal.mp4";
    const src = srcFromAssets || srcFromCfg || fallback;
    await playCutsceneExclusive({
      src,
      kind: "afterPortal",
      fadeInMs: (CFG as any)?.endDoor?.fadeInMs,
      fadeOutMs: (CFG as any)?.endDoor?.fadeOutMs,
    });
  }, [playCutsceneExclusive]);

  useEffect(() => {
    (window as any).__playAfterPortalImpl = playAfterPortalAndNavigate;
    return () => { try { delete (window as any).__playAfterPortalImpl; } catch { } };
  }, [playAfterPortalAndNavigate]);

  useEffect(() => {
    const onKeyEscToEnd = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const vid = activeVideoRef.current;
      stopTrackedAudios();
      if (!vid) return;
      e.preventDefault();
      e.stopPropagation();
      try { vid.dispatchEvent(new Event("ended")); } catch (err) {
        console.warn("[Game] Forzar 'ended' de vídeo falló:", err);
      }
    };
    window.addEventListener("keydown", onKeyEscToEnd, true);
    return () => window.removeEventListener("keydown", onKeyEscToEnd, true);
  }, [stopTrackedAudios]);

  return (
    <div id="immersive-root" data-immersive-root className="game-root">
      <div id="fs-root" ref={fsRootRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <HudEditOverlay exportLayout={() => useHudEditorStore.getState().exportLayout()} />

        <Canvas
          className="game-canvas"
          key={canvasKey}
          dpr={[1, CFG.hud.ui.dprMax]}
          camera={{ fov: 70, near: 0.01, far: 1000, position: [0, 2, 6] }}
          gl={{
            powerPreference: "high-performance",
            antialias: false,
            alpha: false,
            stencil: false,
            preserveDrawingBuffer: false,
          }}
          frameloop={menuOpen || overlayActive || accessVisible ? "never" : "always"}
          onCreated={({ gl }) => {
            const r = gl as THREE.WebGLRenderer;
            try { ktx2HandleRef.current = initKTX2Loader(r, (CFG as any)?.decoders?.basisPath ?? "/assets/basis/") ?? null; }
            catch (e) { console.warn("[KTX2] initKTX2Loader falló:", e); }
            glRef.current = r;
            r.shadowMap.enabled = false;
            r.toneMapping = THREE.NoToneMapping;
            (r as any).outputColorSpace = THREE.SRGBColorSpace;
            r.toneMappingExposure = 1.15;
            r.autoClear = false;
            try { (window as any).__renderer = r; } catch { }

            const canvas = r.domElement as HTMLCanvasElement;
            try { if (!canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "-1"); } catch { }

            const onLost = (e: Event) => {
              e.preventDefault();
              console.warn("[WebGL] Contexto perdido. Mostrando overlay…");
              setOverlayActive(true);
            };
            const onRestored = () => {
              console.warn("[WebGL] Contexto restaurado. Se recomienda recargar para reconstruir recursos.");
              setOverlayActive(true);
            };

            try {
              canvas.addEventListener("webglcontextlost", onLost, false);
              lostHandlerRef.current = onLost;
              canvas.addEventListener("webglcontextrestored", onRestored, false);
              restHandlerRef.current = onRestored;
            } catch (e) {
              console.warn("[WebGL] No se pudieron registrar listeners de contexto:", e);
            }
          }}
        >
          <PerformanceMonitor
            // @ts-ignore
            onChange={(meta: any) => {
              const fps = (meta?.fps ?? (1000 / (meta?.ms || 16.6))) as number;
              Quality.feedAutoFpsSample(Math.max(1, Math.min(240, fps)));
            }}
          />
          <AdaptiveDpr />

          <FirstFramePing onReady={onFirstFrame} />
          <CameraTap store={mainCamRef} />
          <DevBridge />
          <ContextLostShield />

          <hemisphereLight
            intensity={0.7}
            color="#ffffff"
            groundColor="#0b0d10"
            onUpdate={(l) => {
              l.layers.set(CFG.layers.WORLD);
              l.layers.enable(CFG.layers.ENEMIES);
              l.layers.enable(CFG.layers.PLAYER);
              l.layers.enable(CFG.layers.WEAPON);
              l.layers.enable(CFG.layers.SHOTS);
            }}
          />
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.0}
            onUpdate={(l) => {
              l.layers.set(CFG.layers.WORLD);
              l.layers.enable(CFG.layers.ENEMIES);
              l.layers.enable(CFG.layers.PLAYER);
              l.layers.enable(CFG.layers.WEAPON);
              l.layers.enable(CFG.layers.SHOTS);
            }}
          />

          <SceneRoot onReady={handleSceneReady} />

          {cityInfoRef.current && endDoorEnabled && endDoorAt && endDoorLookAt && (
            <EndDoor
              center={cityInfoRef.current.center}
              position={endDoorAt}
              lookAt={endDoorLookAt}
              groundY={groundYRef.current}
              onReady={(m) => { endDoorMeshRef.current = m; }}
            />
          )}

          <ExitWatcher
            enabled={endDoorEnabled}
            target={endDoorAt ?? null}
            radius={(CFG as any)?.endDoor?.triggerRadius ?? 1.1}
            onBeforeExit={() => { }}
          />

          <Player
            env={envRef}
            onShoot={onPlayerShoot}
            debug={{ withWeapon: true, withHud: true }}
            uiLocked={uiLocked}
            getEnemyMeshes={() => dronesGetterRef.current?.() ?? []}
            startAt={spawnAt ?? undefined}
            startLookAt={spawnLookAt ?? undefined}
          />

          <LaserSystem lasers={lasers} setLasers={setLasers} renderOrder={9000} layer={CFG.layers.SHOTS} />

          {/* Enemigos sin Rapier */}
          <Drones
            envRef={envRef}
            registerTargets={registerTargetsStable}
            cityBoundsRef={cityInfoRef}
            roadsMeshRef={roadsMeshRef}
            wallsMeshRef={wallsMeshRef}
            groundMeshRef={groundMeshRef}
            groundYRef={groundYRef}
            playerSpawnRef={playerSpawnRef}
            endDoorRef={endDoorRef}
            forbidMeshRef={forbidMeshRef}
          />

          {/* HUD (layer HUD) */}
          <LayeredComposer hasLasers={lasers.length > 0} />
        </Canvas>

        <MissionCard />
        <DestroyDroneCard />
        <MenuInGame />
      </div>
    </div>
  );
}

/* ========= Compositor de capas + cámara ortográfica de HUD ========= */
function LayeredComposer({ hasLasers }: { hasLasers: boolean }) {
  const { gl, scene, size } = useThree();
  const uiCam = useRef<THREE.OrthographicCamera>(null!);
  const aspect = size.width / size.height;

  useEffect(() => {
    gl.autoClear = false;
    gl.setClearColor(0x0b0f14, 1);
  }, [gl]);

  useEffect(() => {
    (scene as any).userData.__uiCam = uiCam.current;
    return () => {
      if ((scene as any).userData.__uiCam === uiCam.current) delete (scene as any).userData.__uiCam;
    };
  }, [scene]);

  useEffect(() => {
    const c = uiCam.current;
    if (!c) return;
    c.left = -aspect;
    c.right = +aspect;
    c.top = +1;
    c.bottom = -1;
    c.near = 0.1;
    c.far = 10;
    c.position.set(0, 0, 2);
    c.updateProjectionMatrix();
  }, [aspect]);

  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const renderer = gl;

    (window as any).__camera = cam;
    (window as any).__scene = scene;

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.width, size.height);
    renderer.setScissor(0, 0, size.width, size.height);
    renderer.clear(true, true, true);

    // WORLD siempre
    cam.layers.set(CFG.layers.WORLD);
    renderer.render(scene, cam);

    // ENEMIES solo si quedan vivos
    const st = useGameStore.getState();
    if (st.dronesDestroyed < st.dronesTotal) {
      cam.layers.set(CFG.layers.ENEMIES);
      renderer.render(scene, cam);
    }

    // SHOTS solo si hay láseres
    if (hasLasers) {
      cam.layers.set(CFG.layers.SHOTS);
      renderer.render(scene, cam);
    }

    // PLAYER + WEAPON
    renderer.clearDepth();
    cam.layers.set(CFG.layers.PLAYER);
    cam.layers.enable(CFG.layers.WEAPON);
    renderer.render(scene, cam);

    // HUD
    if (uiCam.current) {
      uiCam.current.layers.set(CFG.layers.HUD);
      renderer.render(scene, uiCam.current);
    }
  });

  return <orthographicCamera ref={uiCam} />;
}

const CameraTap: React.FC<{
  store: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}> = ({ store }) => {
  const { camera } = useThree();
  useEffect(() => {
    store.current = camera as THREE.PerspectiveCamera;
  }, [camera, store]);
  return null;
};

const ExitWatcher: React.FC<{
  enabled: boolean;
  target: THREE.Vector3 | null;
  radius: number;
  onBeforeExit?: () => void;
}> = ({ enabled, target, radius, onBeforeExit }) => {
  const didRef = React.useRef(false);
  const { camera } = useThree();
  useFrame(() => {
    if (didRef.current) return;
    if (!enabled || !target) return;
    const dist = camera.position.distanceTo(target);
    if (dist <= radius) {
      try { window.dispatchEvent(new CustomEvent("enddoor-entered")); } catch { }
      try { onBeforeExit?.(); } catch (e) { console.warn("[ExitWatcher] onBeforeExit falló:", e); }
      didRef.current = true;
      try { useGameStore.getState().setPlaying(false); } catch { }
      try {
        setTimeout(() => {
          try { (window as any).__playAfterPortal?.(); } catch (e) { console.warn("[ExitWatcher] __playAfterPortal falló:", e); }
        }, 0);
      } catch { }
    }
  });
  return null;
};

(() => {
  try {
    if (!(window as any).__playAfterPortal) {
      (window as any).__playAfterPortal = () => {
        try {
          const fn = (window as any).__playAfterPortalImpl;
          if (typeof fn === "function") fn();
        } catch (e) {
          console.warn("[Game] __playAfterPortal falló:", e);
        }
      };
    }
  } catch { }
})();

export default Game;
