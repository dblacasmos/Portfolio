// =======================================
// FILE: src/game/utils/immersive.ts
// =======================================
/* Utilidades robustas para:
   - Fullscreen del host correcto (#fs-root > [data-immersive-root] > <html>)
   - Pointer Lock (con reintentos tras gestos)
   - Sincronización con 'resize' al entrar/salir de FS
   - Trampa de F11 y ESC (Keyboard Lock si está disponible)
*/

type AnyEl = HTMLElement | null | undefined;

export function isFullscreen(): boolean {
    return !!document.fullscreenElement;
}

export function isPointerLocked(): boolean {
    return !!(document as any).pointerLockElement;
}

function pingResize() {
    // 2 RAFs para asegurar layout estable antes de reposicionar HUD
    requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
}

function getFsHost(preferFrom?: AnyEl): HTMLElement {
    const fs = document.getElementById("fs-root");
    if (fs) return fs;
    const rooted = preferFrom?.closest?.("[data-immersive-root]") as HTMLElement | null;
    if (rooted) return rooted;
    return document.documentElement;
}

/** Pide fullscreen sobre el host (no sobre el canvas). */
export async function enterFullscreen(fromEl?: AnyEl) {
    const host = getFsHost(fromEl ?? undefined);
    if (document.fullscreenElement) return;

    const tryFS = async () => {
        try {
            await (host as any).requestFullscreen?.();
            await lockEscapeIfPossible();
            pingResize();
        } catch {
            // Reintenta en el siguiente gesto del usuario
            const once = async () => {
                window.removeEventListener("pointerdown", once, true);
                window.removeEventListener("keydown", once, true);
                try {
                    await (host as any).requestFullscreen?.();
                    await lockEscapeIfPossible();
                } catch { /* noop */ }
                pingResize();
            };
            window.addEventListener("pointerdown", once, { once: true, capture: true });
            window.addEventListener("keydown", once, { once: true, capture: true });
        }
    };

    await tryFS();
}

export function exitFullscreen() {
    if (!document.fullscreenElement) return;
    try { document.exitFullscreen?.(); } catch { /* noop */ }
    // Asegura reposicionamiento de HUD/overlays
    pingResize();
}

/** Pide pointer lock sobre un elemento (normalmente el canvas). */
export function requestPointerLock(el: AnyEl) {
    const target = (el as any) as HTMLElement | null;
    const tryLock = () => {
        try { (target as any).requestPointerLock?.(); } catch { /* noop */ }
    };
    // Requiere gesto: liga a un 'click' si hace falta
    if (!document.pointerLockElement) {
        const once = () => {
            window.removeEventListener("mousedown", once, true);
            window.removeEventListener("pointerdown", once, true);
            tryLock();
        };
        window.addEventListener("mousedown", once, { once: true, capture: true });
        window.addEventListener("pointerdown", once, { once: true, capture: true });
    }
    tryLock();
}

export function exitPointerLock() {
    try { (document as any).exitPointerLock?.(); } catch { /* noop */ }
}

/** Entra en modo “inmersivo” (FS + pointer lock). */
export async function enterImmersive(fromEl?: AnyEl) {
    const canvas = (
        (fromEl && (fromEl as HTMLElement).tagName === "CANVAS")
            ? (fromEl as HTMLElement)
            : (document.querySelector(".game-canvas") || document.querySelector("canvas"))
    ) as HTMLElement | null;

    await enterFullscreen(canvas ?? undefined);
    if (canvas) requestPointerLock(canvas);
}

/** Sale de inmersivo (pointer lock + FS). */
export function exitImmersive() {
    exitPointerLock();
    unlockEscapeIfPossible();
    exitFullscreen();
}

/* ------------------ Keyboard Lock (ESC/F11) ------------------ */

let escTrapInstalled = false;
function ensureEscTrap() {
    if (escTrapInstalled) return;
    escTrapInstalled = true;

    // Evita F11 nativo y usa nuestro toggle
    window.addEventListener("keydown", (e) => {
        if (e.key === "F11") {
            try { e.preventDefault(); e.stopPropagation(); } catch { }
            toggleFullscreen();
        }
        // Si estamos en FS, evita que ESC 'salga' del navegador por defecto
        if (e.key === "Escape" && document.fullscreenElement) {
            try { e.preventDefault(); e.stopPropagation(); } catch { }
        }
    }, true);

    document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement) lockEscapeIfPossible();
        else unlockEscapeIfPossible();
        pingResize();
    });
}

export function toggleFullscreen(fromEl?: AnyEl) {
    if (isFullscreen()) exitFullscreen();
    else enterFullscreen(fromEl);
}

/* ---------- (opcional) Keyboard Lock API para capturar ESC ---------- */

async function lockEscapeIfPossible() {
    try {
        // @ts-ignore
        if (navigator.keyboard?.lock) await navigator.keyboard.lock(["Escape"]);
    } catch { }
}

function unlockEscapeIfPossible() {
    try {
        // @ts-ignore
        navigator.keyboard?.unlock?.();
    } catch { }
}

// Auto-init
ensureEscTrap();
