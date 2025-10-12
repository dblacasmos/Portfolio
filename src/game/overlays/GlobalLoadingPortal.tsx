/* ====================================
   FILE: src/game/overlays/GlobalLoadingPortal.tsx
   ==================================== */
import { createRoot, Root } from "react-dom/client";
import LoadingOverlay from "./LoadingOverlay";
import { getOverlayRoot } from "@/game/utils/overlayPortal"; // ← usa tu helper

type Options = { minMs?: number; maxMs?: number; transparentBg?: boolean };

let root: Root | null = null;
let mountEl: HTMLDivElement | null = null;

let active = false;
let unmounting = false;
let bornAt = 0;
let minMs = 0;
let transparentBg = false;
let maxMs = 15000;
let watchdogId: number | null = null;

// Progreso
let externalProgress = 0;
let reachedStageFloor = 0;
let combinedProgress = 0;
let rafId: number | null = null;

// Etapas
const STAGE_MIN: Record<string, number> = {
    navigating: 0.06,
    "route-loaded": 0.08,
    "game-imported": 0.10,
    "assets-preload": 0.14,
    "scene-preload": 0.18,
    mounted: 0.30,
    "first-frame": 0.60,
    "scene-ready": 1.00,
};

function ensureMount() {
    if (mountEl && root) return;

    mountEl = document.createElement("div");
    mountEl.setAttribute("aria-live", "polite");
    // IMPORTANTE: absoluto dentro de #fs-root (que debe ser position: relative)
    mountEl.style.position = "absolute";
    mountEl.style.inset = "0";
    mountEl.style.zIndex = "2147483646";
    mountEl.style.pointerEvents = "auto";

    const parent = getOverlayRoot(); // ← anclado a fs-root
    parent.appendChild(mountEl);

    // Reparenta dinámicamente si el host de overlays cambia (p. ej. al entrar/salir de FS)
    const reparent = () => {
        if (!mountEl) return;
        const next = getOverlayRoot();
        if (mountEl.parentElement !== next) {
            try { next.appendChild(mountEl); } catch { }
        }
    };
    document.addEventListener("fullscreenchange", reparent, true);
    // En algunos navegadores el FS implica resize; también reparentamos en resize/orientation
    window.addEventListener("resize", reparent, { passive: true });
    window.addEventListener("orientationchange", reparent);
    (mountEl as any).__reparent = reparent;

    root = createRoot(mountEl);
}

function rerender() {
    if (!root) return;
    root.render(
        <LoadingOverlay
            progress01={combinedProgress}
            minMs={minMs}
            onFinished={hideGlobalLoadingOverlay}
            transparentBg={transparentBg}
        />
    );
}

function timeFloor(now: number) {
    if (!bornAt || minMs <= 0) return 0;
    const t = Math.max(0, Math.min(1, (now - bornAt) / minMs));
    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
    return easeOutCubic(t) * 0.82;
}

function computeProgress(now: number) {
    const tf = timeFloor(now);
    const tgt = Math.max(tf, reachedStageFloor, externalProgress);
    const next = Math.max(combinedProgress, Math.min(1, tgt));
    if (next !== combinedProgress) {
        combinedProgress = next;
        rerender();
    }
}

function loop() {
    computeProgress(performance.now());
    rafId = requestAnimationFrame(loop);
}

function stopLoop() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

function armWatchdog() {
    if (watchdogId != null) window.clearTimeout(watchdogId);
    if (!maxMs || maxMs <= 0) return;
    watchdogId = window.setTimeout(() => {
        hideGlobalLoadingOverlay();
    }, maxMs);
}

export function showGlobalLoadingOverlay(opts?: Options) {
    if (active) return;
    ensureMount();
    active = true;
    unmounting = false;

    bornAt = performance.now();
    minMs = Math.max(0, opts?.minMs ?? 0);
    maxMs = Math.max(minMs + 500, opts?.maxMs ?? 15000);
    transparentBg = !!opts?.transparentBg;

    externalProgress = 0;
    reachedStageFloor = 0;
    combinedProgress = 0;

    rerender();
    stopLoop();
    rafId = requestAnimationFrame(loop);
    armWatchdog();

    window.dispatchEvent(new CustomEvent("global-loading-shown"));
}

export function setGlobalLoadingProgress(p: number) {
    if (!active) return;
    externalProgress = Math.max(0, Math.min(1, p));
    if (externalProgress >= 0.999) {
        const elapsed = performance.now() - bornAt;
        const wait = Math.max(0, minMs - elapsed);
        window.setTimeout(() => { if (active) hideGlobalLoadingOverlay(); }, wait);
    }
}

export function markGlobalLoadingStage(name: string) {
    if (!active) return;
    const floor = STAGE_MIN[name] ?? 0;
    if (floor > reachedStageFloor) reachedStageFloor = floor;
}

export function hideGlobalLoadingOverlay() {
    if (!active || unmounting) return;
    unmounting = true;

    const elapsed = performance.now() - bornAt;
    const wait = Math.max(0, minMs - elapsed);

    const doAsyncUnmount = () => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                try { try { root?.render(null as any); } catch { } root?.unmount(); } catch { }
                if (mountEl?.parentNode) mountEl.parentNode.removeChild(mountEl);
                // Quita listeners de reparentado
                try {
                    const fn = (mountEl as any)?.__reparent;
                    if (fn) {
                        document.removeEventListener("fullscreenchange", fn, true);
                        window.removeEventListener("resize", fn as any);
                        window.removeEventListener("orientationchange", fn as any);
                    }
                } catch { }
                stopLoop();
                if (watchdogId != null) { window.clearTimeout(watchdogId); watchdogId = null; }
                root = null; mountEl = null;

                active = false;
                externalProgress = 0;
                reachedStageFloor = 0;
                combinedProgress = 0;
                unmounting = false;

                window.dispatchEvent(new CustomEvent("global-loading-hidden"));
            });
        }, 0);
    };

    if (wait > 0) window.setTimeout(doAsyncUnmount, wait);
    else doAsyncUnmount();
}

export function isGlobalLoadingActive() {
    return active;
}

export default {
    showGlobalLoadingOverlay,
    setGlobalLoadingProgress,
    markGlobalLoadingStage,
    hideGlobalLoadingOverlay,
    isGlobalLoadingActive,
};
