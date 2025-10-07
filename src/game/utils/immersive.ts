// src/game/utils/immersive.ts

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
    // 1) Si existe #fs-root, úsalo siempre (el juego lo monta persistente durante su vida)
    const explicit = document.getElementById("fs-root");
    if (explicit) return explicit;
    // 2) Si me pasan un nodo, busca su contenedor con data-immersive-root
    const rooted = preferFrom?.closest?.("[data-immersive-root]") as HTMLElement | null;
    if (rooted) return rooted;
    // 3) Último recurso: el documento entero
    return document.documentElement;
}

// ---------- Keyboard Lock (ESC) ----------
let escTrapInstalled = false;
function ensureEscTrapInstalled() {
    if (escTrapInstalled) return;
    escTrapInstalled = true;
    // Fallback: si estamos en fullscreen, evitar que ESC haga la acción por defecto del navegador.
    window.addEventListener(
        "keydown",
        (e) => {
            if (e.key === "Escape" && document.fullscreenElement) {
                // permitimos que el juego reciba el evento, pero bloqueamos la acción del navegador
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch { }
            }
        },
        true
    );
    // Reaplica/retira lock según entremos/salgamos de fullscreen
    document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement) lockEscapeIfPossible();
        else unlockEscapeIfPossible();
    });
}

async function lockEscapeIfPossible() {
    try {
        // Keyboard Lock API (sólo en contextos seguros y con activación de usuario)
        const kb = (navigator as any).keyboard;
        if (document.fullscreenElement && kb?.lock) {
            await kb.lock(["Escape"]);
        }
    } catch {
        /* noop */
    }
}
function unlockEscapeIfPossible() {
    try {
        const kb = (navigator as any).keyboard;
        kb?.unlock?.();
    } catch {
        /* noop */
    }
}

/**
 * Entra en fullscreen sobre el host adecuado.
 * Nunca pongas el <canvas> en fullscreen: usa el contenedor (fs-root / data-immersive-root / html).
 */
export async function enterFullscreen(el?: HTMLElement) {
    // Nunca pongas el <canvas> en fullscreen. Cambia al host contenedor.
    const node = el ?? null;
    const isCanvas = !!node && node.tagName === "CANVAS";
    const target = getFsRoot(isCanvas ? node : node ?? undefined);
    ensureEscTrapInstalled();
    const tryFS = async () => {
        try {
            await (target as any).requestFullscreen?.();
            await lockEscapeIfPossible();
        } catch (_) {
            // Si falla (gesto requerido), arma para el siguiente gesto del usuario
            const once = async () => {
                window.removeEventListener("pointerdown", once, true);
                window.removeEventListener("keydown", once, true);
                try { await (target as any).requestFullscreen?.(); await lockEscapeIfPossible(); } catch { }
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
        try {
            document.exitFullscreen();
        } catch {
            /* noop */
        }
    }
}

/** Pide pointer lock sobre un elemento (normalmente el canvas). Requiere gesto de usuario. */
export function requestPointerLock(el: HTMLElement) {
    try {
        (el as any)?.requestPointerLock?.();
    } catch { }
    // Si el navegador exige gesto, arma para el siguiente click/tecla
    const arm = () => {
        const once = () => {
            window.removeEventListener("pointerdown", once, true);
            window.removeEventListener("keydown", once, true);
            try { (el as any)?.requestPointerLock?.(); } catch { }
        };
        window.addEventListener("pointerdown", once, { once: true, capture: true });
        window.addEventListener("keydown", once, { once: true, capture: true });
    };
    // Heurística simple: si no estamos en pointer lock inmediatamente, arma fallback
    if (document.pointerLockElement !== el) arm();
}

/** Sale de pointer lock si procede. */
export function exitPointerLock() {
    try {
        (document as any)?.exitPointerLock?.();
    } catch {
        /* noop */
    }
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
    // Localiza el canvas (para pointer lock), pero el fullscreen va al host contenedor
    const canvas = (
        fromEl?.tagName === "CANVAS"
            ? fromEl
            : (document.querySelector(".game-canvas") || document.querySelector("canvas"))
    ) as HTMLElement | null;
    const host = resolveImmersiveHost(fromEl ?? canvas ?? undefined);
    // Forzamos fullscreen en el host, NO en el canvas
    await enterFullscreen(host);
    // Pointer lock sí al canvas (gesto de usuario)
    if (canvas) requestPointerLock(canvas);
}

/** Sale de inmersivo (pointer lock + fullscreen). */
export function exitImmersive() {
    exitPointerLock();
    unlockEscapeIfPossible();
    exitFullscreen();
}
