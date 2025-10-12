//src/hooks/useEscOrTapToClose.ts
import { useEffect } from "react";

const isCoarsePointer = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
};

type Options = {
    enabled?: boolean;
    onClose: () => void;
    closeOnBackdropOnly?: boolean;
    backdropElement?: HTMLElement | null;
    /** Tecla que dispara el cierre (por defecto 'Enter') */
    keyboardKey?: string;
};

/**
 * Desktop: ENTER cierra.
 * Móvil/Tablet: tap cierra (o tap en backdrop si closeOnBackdropOnly=true).
 */
export function useEscOrTapToClose({
    enabled = true,
    onClose,
    closeOnBackdropOnly = false,
    backdropElement = null,
    keyboardKey = "Enter",
}: Options) {
    useEffect(() => {
        if (!enabled) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === keyboardKey) onClose();
        };

        const onPointer = (e: PointerEvent) => {
            if (!isCoarsePointer()) return;
            if (!closeOnBackdropOnly) {
                onClose();
                return;
            }
            // Solo cerrar si el tap ha sido en el backdrop
            const el = backdropElement;
            if (!el) return;
            if (e.target instanceof Node && el.contains(e.target)) {
                const targetIsBackdrop =
                    e.target === el ||
                    (e.target instanceof HTMLElement && e.target.getAttribute("data-backdrop") === "true");
                if (targetIsBackdrop) onClose();
            }
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("pointerdown", onPointer, { passive: true, capture: true });
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("pointerdown", onPointer, true);
        };
    }, [enabled, onClose, closeOnBackdropOnly, backdropElement, keyboardKey]);
}

export default useEscOrTapToClose;
