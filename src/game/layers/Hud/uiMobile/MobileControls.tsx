import React, { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useIsMobileOrTablet } from "@/hooks/useDevice";
import { useInput } from "@/hooks/useInput";
import { Joystick } from "./Joystick";
import { useGameStore } from "@/game/utils/state/store";
import { useLocation } from "react-router-dom";
import { useCoarsePointer } from '@/hooks/useCoarsePointer';

export const MobileControls: React.FC = () => {
    // Renderizar HUD sólo en /game (evita interceptar clics en intro u otras vistas)
    const { pathname } = useLocation();
    const isCoarse = useCoarsePointer();
    const inGame = pathname.startsWith("/game");
    if (!inGame) return null;

    // Permite forzar modo móvil en E2E: localStorage.__FORCE_MOBILE = "1"
    const forceMobile =
        typeof window !== "undefined" &&
        (localStorage.getItem("__FORCE_MOBILE") === "1" || (window as any).__FORCE_MOBILE === true);

    const detectedMobile = useIsMobileOrTablet();

    // Marca <html data-force-mobile="1"> para que el CSS no oculte el HUD móvil en desktop
    React.useEffect(() => {
        const root = document.documentElement;
        if (forceMobile) {
            root.setAttribute("data-force-mobile", "1");
        } else {
            root.removeAttribute("data-force-mobile");
        }
        return () => root.removeAttribute("data-force-mobile");
    }, [forceMobile]);

    // Heurística táctil amplia
    const coarseTouch = (() => {
        if (typeof window === "undefined") return false;
        try {
            const mm = (q: string) => window.matchMedia && window.matchMedia(q).matches;
            return mm("(any-pointer: coarse)") || mm("(pointer: coarse)");
        } catch { return false; }
    })();
    const hasTouchCap = typeof navigator !== "undefined" && ((navigator as any).maxTouchPoints || 0) > 0;
    const hasOntouch = typeof window !== "undefined" && ("ontouchstart" in window);

    // Único flag de render
    const isTouch =
        !!forceMobile ||
        !!detectedMobile ||
        !!coarseTouch ||
        !!hasTouchCap ||
        !!hasOntouch;

    // Nada de HUD móvil en desktop
    if (!isTouch) return null;

    // Store
    const setButton = useInput((s) => s.setButton);
    const setEnableTouch = useInput((s) => s.setEnableTouch);
    const enableTouch = useInput((s) => s.enableTouch);
    const setMenuOpen = useGameStore((s) => s.setMenuOpen);

    // Al montar, habilitamos touch; al desmontar, lo deshabilitamos.
    useEffect(() => {
        if (!enableTouch) setEnableTouch(true);
        return () => setEnableTouch(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const Btn: React.FC<
        React.PropsWithChildren<{
            onPress: () => void;
            onRelease?: () => void;
            "aria-label"?: string;
        }>
    > = ({ onPress, onRelease, children, ...aria }) => (
        <button
            type="button"
            {...aria}
            data-interactive="1"
            className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md active:scale-95 pointer-events-auto"
            onPointerDown={(e) => { e.preventDefault(); onPress(); }}
            onPointerUp={(e) => { e.preventDefault(); onRelease?.(); }}
            onPointerCancel={(e) => { e.preventDefault(); onRelease?.(); }}
            onPointerLeave={(e) => { e.preventDefault(); onRelease?.(); }}
        >
            {children}
        </button>
    );

    // --- Fire Zone Button (zona de disparo accesible) -----------------------
    const setButtonRef = useRef(setButton);
    useEffect(() => { setButtonRef.current = setButton; }, [setButton]);

    const firingRef = useRef<number | null>(null);
    const oneShotFire = useCallback(() => {
        try {
            setButtonRef.current("fire", true, "touch");
            if (firingRef.current) clearTimeout(firingRef.current);
            firingRef.current = window.setTimeout(() => {
                setButtonRef.current("fire", false, "touch");
                firingRef.current = null;
            }, 90);
        } catch { /* noop */ }
    }, []);
    useEffect(() => () => { if (firingRef.current) clearTimeout(firingRef.current); }, []);

    // Distinción tap vs drag
    const pressInfo = useRef<{ id: number; x: number; y: number; t: number; moved: boolean } | null>(null);
    const TAP_MOVE_EPS = 8;   // px
    const TAP_TIME_MS = 250;  // ms

    // --- Nodos a portalar: FIRE ZONE (no accesible) + HUD UI (accesible) ---
    const FireZone = (
        <button
            id="fire-zone"
            data-testid="fire-zone"
            aria-hidden="true"   // fuera de a11y
            className="absolute inset-0 w-full h-full z-10 block min-w-[44px] min-h-[44px] bg-transparent border-0 p-0 m-0 pointer-events-auto"
            style={{ WebkitTapHighlightColor: "transparent" }}

            onPointerDown={(e) => {
                e.preventDefault();
                try { setButtonRef.current("aim", true, "touch"); } catch { }
                pressInfo.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
            }}

            onPointerMove={(e) => {
                // 1) “Agujero” dinámico sobre el panel derecho para no bloquear botones
                const el = e.currentTarget as HTMLElement;
                const panel = document.querySelector('[data-interactive="1"].items-end') as HTMLElement | null;
                if (panel) {
                    const r = panel.getBoundingClientRect();
                    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
                    (el.style as any).pointerEvents = inside ? "none" : "auto";
                }
                // 2) Tap vs drag
                const p = pressInfo.current;
                if (!p || p.id !== e.pointerId) return;
                if (!p.moved) {
                    const dx = Math.abs(e.clientX - p.x);
                    const dy = Math.abs(e.clientY - p.y);
                    if (dx > TAP_MOVE_EPS || dy > TAP_MOVE_EPS) p.moved = true;
                }
            }}

            onPointerUp={(e) => {
                const p = pressInfo.current;
                pressInfo.current = null;
                try { setButtonRef.current("aim", false, "touch"); } catch { }
                e.preventDefault();
                if (p && p.id === e.pointerId) {
                    const dt = performance.now() - p.t;
                    if (!p.moved && dt <= TAP_TIME_MS) oneShotFire();
                }
            }}
            onPointerCancel={() => {
                pressInfo.current = null;
                try { setButtonRef.current("aim", false, "touch"); } catch { }
            }}
        />
    );

    const HudUi = (
        <div
            // Overlay relativo al host (#fs-root), no a la ventana
            className="absolute inset-0 z-[999] pointer-events-none p-4 flex justify-between items-end touch-none"
            style={{ gap: 12 }}
        >
            {/* Zona izquierda: joystick */}
            <div className="relative z-20 flex flex-col gap-3 pointer-events-auto" data-interactive="1" aria-hidden={false}>
                <Joystick radius={56} />
            </div>

            {/* Zona derecha: botones (fila 1: Menu + Reload / fila 2: Jump + Sprint) */}
            <div className="relative z-20 flex flex-col gap-3 items-end pointer-events-auto" data-interactive="1">
                <div className="flex gap-2">
                    <Btn aria-label="Menú" onPress={() => setMenuOpen(true)}>Menu</Btn>
                    <Btn aria-label="Recargar" onPress={() => setButton("reload", true, "touch")} onRelease={() => setButton("reload", false, "touch")}>Reload</Btn>
                </div>
                <div className="flex gap-2">
                    <Btn aria-label="Saltar" onPress={() => setButton("jump", true, "touch")} onRelease={() => setButton("jump", false, "touch")}>Jump</Btn>
                    <Btn aria-label="Correr" onPress={() => setButton("sprint", true, "touch")} onRelease={() => setButton("sprint", false, "touch")}>Sprint</Btn>
                </div>
            </div>
        </div>
    );

    // --- ÚNICO botón de disparo accesible, portaleado al <body> (todos los navegadores) ---
    const FireBtn = (
        <button
            type="button"
            id="fire-btn"
            aria-label="Disparar"
            data-testid="fire-btn"
            // Estilos inline (evita quirks de cascade/backdrop en WebKit)
            style={{
                position: "absolute",
                right: 20,
                bottom: 20,
                zIndex: 2147483647, // tope
                width: 64,
                height: 64,
                padding: 0,
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(0,0,0,0.55)", // sólido para evitar "transparent hit ignore"
                color: "white",
                pointerEvents: "auto",
                display: "block",
                visibility: "visible",
                WebkitAppearance: "none",
                transform: "translateZ(0)", // evita glitches de compositing
            }}
            onPointerDown={(e) => { e.preventDefault(); oneShotFire(); }}
        >
            {/* texto visible + accesible para que el name siempre matchee */}
            <span>Disparar / Fire</span>
        </button>
    );

    // Portal targets
    if (typeof document === "undefined") {
        // SSR/Testing sin DOM
        return (
            <>
                {FireZone}
                {HudUi}
            </>
        );
    }

    // Porta dentro del host del juego para que quede "dentro del canvas"
    const root =
        (document.getElementById("fs-root")
            ?? document.querySelector<HTMLElement>("[data-immersive-root]"))
        || document.body;

    return (
        <>
            {createPortal(FireZone, root)}
            {createPortal(HudUi, root)}
            {createPortal(FireBtn, root)}
        </>
    );
}
