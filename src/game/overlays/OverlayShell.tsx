import React from "react";
import { createPortal } from "react-dom";
import { useEnterOrTapToClose } from "@/hooks/useEnterOrTapToClose";
import { getOverlayRoot } from "@/game/utils/overlayPortal";
import { requestPointerLock } from "@/game/utils/immersive";
import { audioManager } from "@/game/utils/audio/audio";

type OverlayShellProps = {
    /** Mostrar/ocultar overlay */
    visible: boolean;
    /** Cierre solicitado por backdrop/tecla/tap (o desde botón del hijo) */
    onClose: () => void;
    /** Para accesibilidad del diálogo */
    ariaLabel?: string;

    /** Z-index del overlay (por defecto 2147483647) */
    zIndex?: number;

    /** Manejador de tecla para cerrar (por defecto "Enter"); null = desactivar */
    keyboardKey?: KeyboardEvent["key"] | null;

    /** Cerrar con click en backdrop (true por defecto) */
    closeOnBackdrop?: boolean;

    /** Apaga música mientras está visible (default: false) */
    pauseMusic?: boolean;

    /** Mientras visible, evita que ESC del menú haga nada (default: false) */
    squelchMenuEsc?: boolean;

    /** Al cerrar, intenta recuperar pointer lock en este target (CSS selector) */
    pointerLockSelector?: string;
    /** Alternativa al selector: callback para resolver el elemento objetivo */
    getPointerLockTarget?: () => HTMLElement | null;

    /** Clases/estilos para el contenedor de contenido (centrado) */
    contentClassName?: string;
    contentStyle?: React.CSSProperties;

    /** Estilo del fondo */
    backdropClassName?: string;
    backdropStyle?: React.CSSProperties;

    /** Contenido del overlay (la “tarjeta”/UI real) */
    children: React.ReactNode;
};

function usePauseMusic(armed: boolean) {
    React.useEffect(() => {
        if (!armed) return;
        let resume: (() => void) | null = null;
        try {
            const am: any = audioManager;
            if (typeof am?.pauseMusic === "function" && typeof am?.resumeMusic === "function") {
                am.pauseMusic(); resume = () => am.resumeMusic();
            } else if (am?.music?.pause) {
                const wasPaused = !!am.music.paused;
                am.music.pause();
                resume = () => { if (!wasPaused) am.music.play?.(); };
            } else if (Array.isArray(am?.tracks)) {
                const resumeList: Array<() => void> = [];
                am.tracks.forEach((t: any) => {
                    if (t?.type === "music" && typeof t?.pause === "function") {
                        const wasPaused = !!t.paused; t.pause();
                        resumeList.push(() => { if (!wasPaused) t.play?.(); });
                    }
                });
                resume = () => resumeList.forEach((fn) => fn());
            } else {
                const prev: number =
                    am?.getMasterVolume?.() ?? am?.getVolume?.() ??
                    (typeof am?.masterVolume === "number" ? am.masterVolume : 1);
                if (am?.setMasterVolume) am.setMasterVolume(0);
                else if (am?.setVolume) am.setVolume(0);
                else if ("masterVolume" in am) (am as any).masterVolume = 0;
                resume = () => {
                    if (am?.setMasterVolume) am.setMasterVolume(prev);
                    else if (am?.setVolume) am.setVolume(prev);
                    else if ("masterVolume" in am) (am as any).masterVolume = prev;
                };
            }
        } catch { /* noop */ }
        return () => { try { resume?.(); } catch { /* noop */ } };
    }, [armed]);
}

export const OverlayShell: React.FC<OverlayShellProps> = ({
    visible,
    onClose,
    ariaLabel = "Overlay",
    zIndex = 2147483647,
    keyboardKey = "Enter",
    closeOnBackdrop = true,
    pauseMusic = false,
    squelchMenuEsc = false,
    pointerLockSelector,
    getPointerLockTarget,
    contentClassName = "flex items-start justify-center",
    contentStyle,
    backdropClassName = "absolute inset-0 bg-black/70 backdrop-blur-md",
    backdropStyle,
    children,
}) => {
    // Host dinámico: se reancla si cambia el root (FS on/off)
    const [host, setHost] = React.useState<HTMLElement | null>(null);
    React.useEffect(() => {
        const reparent = () => setHost(getOverlayRoot() || document.body);
        reparent();
        document.addEventListener("fullscreenchange", reparent, true);
        window.addEventListener("resize", reparent, { passive: true });
        window.addEventListener("orientationchange", reparent);
        return () => {
            document.removeEventListener("fullscreenchange", reparent, true);
            window.removeEventListener("resize", reparent as any);
            window.removeEventListener("orientationchange", reparent as any);
        };
    }, []);

    // Cursor visible + salir de pointer lock mientras esté abierto
    React.useEffect(() => {
        if (!visible) return;
        try { document.exitPointerLock?.(); } catch { /* noop */ }
        try {
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor", "hud-cursor");
        } catch { /* noop */ }
        return () => { try { document.body.classList.remove("show-cursor", "hud-cursor"); } catch { } };
    }, [visible]);

    // Squelch de ESC del menú
    React.useEffect(() => {
        if (!visible || !squelchMenuEsc) return;
        try { (window as any).__squelchMenuEsc = true; } catch { }
        return () => { try { (window as any).__squelchMenuEsc = false; } catch { } };
    }, [visible, squelchMenuEsc]);

    // Pausar música mientras visible
    usePauseMusic(visible && pauseMusic);

    // Cierre por Enter/tap si procede
    useEnterOrTapToClose({
        enabled: visible && !!keyboardKey,
        onClose: () => {
            // Recuperar pointer lock tras cerrar (en el siguiente frame, cuando ya se desmontó el overlay)
            const relock = () => {
                const el =
                    getPointerLockTarget?.() ??
                    (pointerLockSelector ? (document.querySelector(pointerLockSelector) as HTMLElement | null) : null) ??
                    document.querySelector("canvas");
                if (el) {
                    try { requestPointerLock(el); } catch { /* noop */ }
                }
            };
            try { onClose(); } finally {
                requestAnimationFrame(relock);
            }
        },
        closeOnBackdropOnly: false,
        keyboardKey: keyboardKey || undefined,
    });

    if (!visible || !host) return null;

    const node = (
        <div
            className="absolute inset-0"
            style={{ zIndex, pointerEvents: "auto", position: "absolute" }}
            aria-label={ariaLabel}
        >
            {/* Backdrop */}
            <div
                className={backdropClassName}
                style={backdropStyle}
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden
            />
            {/* Contenido */}
            <div className={`absolute inset-0 ${contentClassName}`} style={contentStyle}>
                {children}
            </div>
        </div>
    );

    return createPortal(node, host);
};

export default OverlayShell;
