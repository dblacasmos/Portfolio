/* =============================
    FILE: src/hooks/useKeyboard.ts
    ============================= */
import { useEffect, useRef } from "react";

type UseKeyboardOptions = {
    /** Callback en keydown (opcional) */
    onDown?: (e: KeyboardEvent) => void;
    /** Callback en keyup (opcional) */
    onUp?: (e: KeyboardEvent) => void;
    /** Hacer e.preventDefault() en los eventos (default: false) */
    preventDefault?: boolean;
    /** Ignorar cuando el foco está en inputs/textarea/contenteditable (default: true) */
    ignoreTyping?: boolean;
};

/**
 * Hook de teclado con:
 *  - Polling por frame: keys.current["KeyW"] → boolean
 *  - Callbacks de onDown/onUp
 *  - Protección para inputs/textarea/contenteditable
 */
export function useKeyboard(opts: UseKeyboardOptions = {}) {
    const {
        onDown,
        onUp,
        preventDefault = false,
        ignoreTyping = true,
    } = opts;

    const keys = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const isTyping = (e: Event) => {
            if (!ignoreTyping) return false;
            const el = e.target as HTMLElement | null;
            if (!el) return false;
            const tag = el.tagName;
            return (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                (el as any).isContentEditable === true
            );
        };

        const down = (e: KeyboardEvent) => {
            if (isTyping(e)) return;
            keys.current[e.code] = true;
            onDown?.(e);
            if (preventDefault) e.preventDefault();
        };

        const up = (e: KeyboardEvent) => {
            if (isTyping(e)) return;
            keys.current[e.code] = false;
            onUp?.(e);
            if (preventDefault) e.preventDefault();
        };

        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, [onDown, onUp, preventDefault, ignoreTyping]);

    return keys;
}
