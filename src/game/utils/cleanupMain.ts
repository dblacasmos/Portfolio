/* ===================================
   FILE: src/game/utils/cleanupMain.ts
   =================================== */
import type { WebGLRenderer } from "three";

// Tip opcional para filtrar qué elementos NO se deben tocar
export type KeepOpts = {
    keepIds?: string[];
    keepClasses?: string[];
    keepSelectors?: string[];
    keepPredicate?: (el: Element) => boolean;
};

const DEF_KEEP_SELECTORS = [
    "#main-fs-root",
    "#bgMain",
    "video#bgMain",
    "[data-keep-media]",
];

function shouldKeep(el: Element, opts?: KeepOpts) {
    const ids = opts?.keepIds ?? [];
    const classes = opts?.keepClasses ?? [];
    const sels = [...DEF_KEEP_SELECTORS, ...(opts?.keepSelectors ?? [])];
    const pred = opts?.keepPredicate;

    if (ids.length && el instanceof HTMLElement && ids.includes(el.id)) return true;
    if (classes.length && el instanceof HTMLElement && classes.some(c => el.classList.contains(c))) return true;
    if (sels.length && sels.some(sel => {
        try { return el.matches?.(sel); } catch { return false; }
    })) return true;
    if (typeof pred === "function") {
        try { if (pred(el)) return true; } catch { }
    }
    return false;
}

function pauseAndReleaseMedia(el: HTMLMediaElement) {
    try { el.pause(); } catch { }
    try { el.muted = true; } catch { }
    // soltar decoders
    try { el.removeAttribute("src"); el.load(); } catch { }
}

function stopAllTTS() {
    try { window.speechSynthesis?.cancel(); } catch { }
}

function stopHowlerAndAudioManager() {
    // 1) Howler
    try {
        const w = window as any;
        if (w?.Howler) {
            w.Howler.stop?.();
            w.Howler.unload?.();
        } else {
            void import("howler")
                .then(({ Howler }) => { Howler?.stop?.(); Howler?.unload?.(); })
                .catch(() => { /* noop */ });
        }
    } catch { /* noop */ }

    // 2) audioManager propio del juego
    try {
        const w = window as any;
        const am = w?.audioManager ?? w?.__audioManager;
        if (am) {
            am.stopAll?.();
            am.ctx?.suspend?.(); // no cerramos: close() es terminal
        } else {
            void import("@/game/utils/audio/audio")
                .then((mod: any) => {
                    const mgr = mod?.audioManager;
                    mgr?.stopAll?.();
                    mgr?.ctx?.suspend?.();
                })
                .catch(() => { /* noop */ });
        }
    } catch { /* noop */ }
}

function loseWebGLContext(canvas: HTMLCanvasElement) {
    try {
        const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
        const ext = gl && (gl.getExtension("WEBGL_lose_context") as any);
        ext?.loseContext?.();
    } catch { }
    try { canvas.width = 0; canvas.height = 0; } catch { }
}

function disposeThreeRenderer(r: WebGLRenderer | null | undefined) {
    if (!r) return;
    try { r.dispose(); } catch { }
    try { (r.domElement as HTMLCanvasElement | undefined)?.remove?.(); } catch { }
}

/** Limpieza ligera: corta video/audio, TTS y sonidos (Howler/audioManager). */
export function softCleanupMedia(opts: KeepOpts = {}) {
    try {
        const medias = Array.from(document.querySelectorAll("video, audio")) as HTMLMediaElement[];
        for (const m of medias) {
            if (shouldKeep(m, opts)) continue;
            pauseAndReleaseMedia(m);
        }
    } catch { }
    stopAllTTS();
    stopHowlerAndAudioManager();
}

/**
 * Limpieza fuerte: incluye soft + suelta WebGL, elimina canvases huérfanos
 * y corta cualquier vídeo superpuesto de cutscene.
 */
export function hardCleanupBeforeMain(opts: KeepOpts = {}) {
    // 1) corta audio/video/tts/howler
    softCleanupMedia(opts);

    // 2) WebGL renderers conocidos
    try {
        const w = window as any;
        disposeThreeRenderer(w.__renderer as WebGLRenderer | undefined);
        if (w.__renderer) delete w.__renderer;
    } catch { }

    // 3) cualquier canvas WebGL (huérfano)
    try {
        const canvases = Array.from(document.querySelectorAll("canvas")) as HTMLCanvasElement[];
        for (const c of canvases) {
            if (shouldKeep(c, opts)) continue;
            loseWebGLContext(c);
        }
    } catch { }

    // 4) vídeos superpuestos de cutscene
    try {
        const overlays = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
        for (const v of overlays) {
            const style = window.getComputedStyle(v);
            const z = parseInt(style.zIndex || "0", 10);
            const isOverlay = style.position === "fixed" && z >= 999000;
            if (!isOverlay) continue;
            if (shouldKeep(v, opts)) continue;
            pauseAndReleaseMedia(v);
            try { v.remove(); } catch { }
        }
    } catch { }
}
