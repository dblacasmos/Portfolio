/* ====================================
   FILE: src/game/overlays/GlobalLoadingPortal.tsx
   ==================================== */
import { createRoot, Root } from "react-dom/client";
import LoadingOverlay from "./LoadingOverlay";

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

// Fuentes de progreso
let externalProgress = 0;     // setGlobalLoadingProgress
let reachedStageFloor = 0;    // markGlobalLoadingStage
let combinedProgress = 0;     // max(timeFloor, stageFloor, external)
let rafId: number | null = null;

// Etapas conocidas (puedes añadir más sin tocar tipos)
const STAGE_MIN: Record<string, number> = {
    // Navegación / routing
    navigating: 0.06,
    "route-loaded": 0.08,
    "game-imported": 0.10,
    "assets-preload": 0.14,
    "scene-preload": 0.18,

    // In-game (compat con la versión anterior)
    mounted: 0.30,
    "first-frame": 0.60,
    "scene-ready": 1.00,
};

function ensureMount() {
    if (mountEl && root) return;
    mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
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

// Rampa temporal: sube suave hasta ~0.82 durante minMs (aunque no haya updates)
function timeFloor(now: number) {
    if (!bornAt || minMs <= 0) return 0;
    const t = Math.max(0, Math.min(1, (now - bornAt) / minMs));
    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
    return easeOutCubic(t) * 0.82;
}

function computeProgress(now: number) {
    const tf = timeFloor(now);
    const tgt = Math.max(tf, reachedStageFloor, externalProgress);
    const next = Math.max(combinedProgress, Math.min(1, tgt)); // monótono
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
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

function armWatchdog() {
    if (watchdogId != null) window.clearTimeout(watchdogId);
    if (!maxMs || maxMs <= 0) return;
    watchdogId = window.setTimeout(() => {
        // Si algo fue mal y nadie cerró, cerramos nosotros.
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

    // Señales (útiles para Game)
    window.dispatchEvent(new CustomEvent("global-loading-shown"));
}

export function setGlobalLoadingProgress(p: number) {
    if (!active) return;
    externalProgress = Math.max(0, Math.min(1, p));
    // el loop se encarga de re-renderizar
    // Si ya estamos al 100%, cierra cuando se cumpla el minMs.
    if (externalProgress >= 0.999) {
        const elapsed = performance.now() - bornAt;
        const wait = Math.max(0, minMs - elapsed);
        window.setTimeout(() => {
            // Podría haberse cerrado ya por watchdog o por otro camino.
            if (active) hideGlobalLoadingOverlay();
        }, wait);
    }
}

/** Asegura un mínimo de progreso asociado a una etapa. */
export function markGlobalLoadingStage(name: string) {
    if (!active) return;
    const floor = STAGE_MIN[name] ?? 0;
    if (floor > reachedStageFloor) {
        reachedStageFloor = floor;
    }
    // el loop lo recogerá
}

export function hideGlobalLoadingOverlay() {
    if (!active || unmounting) return;
    unmounting = true;

    const elapsed = performance.now() - bornAt;
    const wait = Math.max(0, minMs - elapsed);

    const doAsyncUnmount = () => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                try {
                    try { root?.render(null as any); } catch { }
                    root?.unmount();
                } catch { }
                if (mountEl?.parentNode) mountEl.parentNode.removeChild(mountEl);
                stopLoop();
                if (watchdogId != null) { window.clearTimeout(watchdogId); watchdogId = null; }
                root = null;
                mountEl = null;

                active = false;
                externalProgress = 0;
                reachedStageFloor = 0;
                combinedProgress = 0;
                unmounting = false;

                window.dispatchEvent(new CustomEvent("global-loading-hidden"));
            });
        }, 0);
    };

    if (wait > 0) {
        window.setTimeout(doAsyncUnmount, wait);
    } else {
        doAsyncUnmount();
    }
}

export function isGlobalLoadingActive() {
    return active;
}
