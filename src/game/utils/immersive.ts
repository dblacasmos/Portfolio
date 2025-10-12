// =======================================
// FILE: src/game/utils/immersive.ts
// =======================================

/** Alterna entre fullscreen y ventana normal. Si no se pasa elemento, elige según getFsRoot(). */
export function toggleFullscreen(fromEl?: HTMLElement) {
    if (isFullscreen()) exitFullscreen();
    else enterFullscreen(fromEl);
}

/** ¿Hay algún elemento en pantalla completa? */
export function isFullscreen() {
    return !!document.fullscreenElement;
}

/**
 * Entra en fullscreen sobre el <html> (documentElement).
 * Úsalo cuando quieras que el FS sobreviva cambios de ruta (el <html> no se desmonta).
 */
export async function enterAppFullscreen() {
    ensureEscTrapInstalled();
    if (!document.fullscreenElement && (document.documentElement as any)?.requestFullscreen) {
        try {
            await (document.documentElement as any).requestFullscreen();
            await lockEscapeIfPossible();
        } catch { /* noop */ }
    } else {
        await lockEscapeIfPossible();
    }
}

/** Devuelve el contenedor preferido para fullscreen (fs-root > data-immersive-root > html) */
function getFsRoot(preferFrom?: HTMLElement | null): HTMLElement {
    const explicit = document.getElementById("fs-root");
    if (explicit) return explicit;
    const rooted = preferFrom?.closest?.("[data-immersive-root]") as HTMLElement | null;
    if (rooted) return rooted;
    return document.documentElement;
}

// ---------- Keyboard Lock (ESC) ----------
let escTrapInstalled = false;
function ensureEscTrapInstalled() {
    if (escTrapInstalled) return;
    escTrapInstalled = true;
    const pingResize = () => {
        // dos RAFs para asegurarnos de que el layout de fullscreen ya está estable
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event("resize"));
            requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
        });
    };

    // Cuando estamos en FS, evitamos que ESC salga por defecto del navegador.
    window.addEventListener(
        "keydown",
        (e) => {
            if (e.key === "Escape" && document.fullscreenElement) {
                try { e.preventDefault(); e.stopPropagation(); } catch { }
            }
            // Evita el fullscreen nativo del navegador y usa el tuyo
            if (e.key === "F11") {
                try { e.preventDefault(); e.stopPropagation(); } catch { }
                // Redirige a tu toggle de FS (sobre fs-root / html)
                toggleFullscreen();
                return;
            }
        },
        true
    );
    // Reaplica/retira lock según entremos/salgamos de fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement) lockEscapeIfPossible();
        else unlockEscapeIfPossible();
        pingResize();
    });
}

async function lockEscapeIfPossible() {
    try {
        // Keyboard Lock API (requiere gesto y contexto seguro)
        const kb = (navigator as any).keyboard;
        if (document.fullscreenElement && kb?.lock) {
            await kb.lock(["Escape"]);
        }
    } catch { /* noop */ }
}
function unlockEscapeIfPossible() {
    try {
        const kb = (navigator as any).keyboard;
        kb?.unlock?.();
    } catch { /* noop */ }
}

/**
 * Entra en fullscreen sobre el host adecuado.
 * Nunca pongas el <canvas> en fullscreen: usa el contenedor (fs-root / data-immersive-root / html).
 */
export async function enterFullscreen(el?: HTMLElement) {
    const node = el ?? null;
    const isCanvas = !!node && node.tagName === "CANVAS";
    const target = getFsRoot(isCanvas ? node : node ?? undefined);
    ensureEscTrapInstalled();
    const pingResize = () => {
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event("resize"));
            requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
        });
    };

    const tryFS = async () => {
        try {
            await (target as any).requestFullscreen?.();
            await lockEscapeIfPossible();
            pingResize();
        } catch (_) {
            // Si falla (gesto requerido), arma para el siguiente gesto
            const once = async () => {
                window.removeEventListener("pointerdown", once, true);
                window.removeEventListener("keydown", once, true);
                try { await (target as any).requestFullscreen?.(); await lockEscapeIfPossible(); } catch { }
                pingResize();
            };
            window.addEventListener("pointerdown", once, { once: true, capture: true });
            window.addEventListener("keydown", once, { once: true, capture: true });
        }
    };

    if (!document.fullscreenElement && (target as any)?.requestFullscreen) {
        await tryFS();
    } else {
        // Ya en fullscreen → intenta bloquear ESC igualmente
        await lockEscapeIfPossible();
    }
}

/** Sale de fullscreen si procede. */
export function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
        try { document.exitFullscreen(); } catch { /* noop */ }
    }
    // Fuerza re-cálculo de layout al salir
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}

/** Pide pointer lock sobre un elemento (normalmente el canvas). Requiere gesto de usuario. */
export function requestPointerLock(el?: Element | null) {
    let target = el as HTMLElement | null;
    // Si nos pasaron el wrapper (.game-canvas), busca el <canvas> hijo
    if (target && target.classList?.contains("game-canvas")) {
        const child = target.querySelector("canvas") as HTMLCanvasElement | null;
        if (child) target = child;
    }
    // Fallbacks al canvas real de R3F
    if (!target) {
        target =
            ((window as any).__renderer?.domElement as HTMLCanvasElement | null) ??
            (document.querySelector(".game-canvas canvas") as HTMLCanvasElement | null) ??
            (document.querySelector("canvas") as HTMLCanvasElement | null);
    }

    const doLock = () => { try { (target as any)?.requestPointerLock?.(); } catch { } };

    // Intento inmediato
    doLock();

    // Si el navegador exige gesto, arma para el siguiente click/tecla
    if (document.pointerLockElement !== target) {
        const once = () => {
            window.removeEventListener("pointerdown", once, true);
            window.removeEventListener("keydown", once, true);
            doLock();
        };
        window.addEventListener("pointerdown", once, { once: true, capture: true });
        window.addEventListener("keydown", once, { once: true, capture: true });
    }
}

/** Sale de pointer lock si procede. */
export function exitPointerLock() {
    try { (document as any)?.exitPointerLock?.(); } catch { /* noop */ }
}

/** Busca el host que envuelve canvas + HUD (prefiere #fs-root, si no data-immersive-root) */
function resolveImmersiveHost(fromEl?: HTMLElement) {
    const base = fromEl ?? (document.querySelector("canvas") as HTMLElement | null) ?? undefined;
    const fsRoot = document.getElementById("fs-root");
    if (fsRoot) return fsRoot as HTMLElement;
    const rooted = base?.closest?.("[data-immersive-root]") as HTMLElement | null;
    return rooted ?? document.documentElement;
}

/** Entra en modo “inmersivo” (pantalla completa + pointer lock). */
export async function enterImmersive(fromEl?: HTMLElement) {
    const canvas = (
        fromEl?.tagName === "CANVAS"
            ? fromEl
            : (document.querySelector(".game-canvas") || document.querySelector("canvas"))
    ) as HTMLElement | null;

    const host = resolveImmersiveHost(fromEl ?? canvas ?? undefined);
    await enterFullscreen(host);    // FS en el contenedor, no en el canvas
    if (canvas) requestPointerLock(canvas);
}

/** Sale de inmersivo (pointer lock + fullscreen). */
export function exitImmersive() {
    exitPointerLock();
    unlockEscapeIfPossible();
    exitFullscreen();
}
