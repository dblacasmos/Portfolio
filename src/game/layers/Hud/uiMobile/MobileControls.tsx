import { useEffect, useRef, useState } from "react";
import Joystick from "./Joystick";
import { useInput } from "../../../utils/state/useInput";
import { useGameStore } from "../../../utils/state/store";

const safeCapture = (el: HTMLElement, e: React.PointerEvent | PointerEvent) => { try { if ((el as any).isConnected !== false && e.type === "pointerdown" && typeof (el as any).setPointerCapture === "function") (el as any).setPointerCapture((e as any).pointerId); } catch { } };
const isTouchDevice = () => window.matchMedia?.("(pointer: coarse)").matches;

export default function MobileControls() {
    if (!isTouchDevice()) return null; // sólo en móvil/tablet
    const setMove = useInput((s) => s.setMove);
    const addLook = useInput((s) => s.addLook);
    const setBtn = useInput((s) => s.setButton);
    // Abrir menú como ESC en desktop
    const openMenu = () => {
        try { document.exitPointerLock?.(); } catch { }
        try { useGameStore.getState().setMenuOpen(true); } catch { }
    };

    // Evita scroll/zoom por gestos encima del overlay
    useEffect(() => {
        const prevent = (e: Event) => e.preventDefault();
        const el = document.getElementById("game-overlay");
        el?.addEventListener("touchmove", prevent, { passive: false });
        return () => el?.removeEventListener("touchmove", prevent as any);
    }, []);

    // ===== Área global de mirar + “tap para disparar” =====
    const [activeId, setActiveId] = useState<number | null>(null);
    const startPosRef = useRef<{ x: number; y: number; t: number } | null>(null);
    const lastRef = useRef<{ x: number; y: number } | null>(null);

    const onLookDown = (e: React.PointerEvent) => {
        if (activeId != null) return;
        setActiveId(e.pointerId);
        safeCapture(e.currentTarget as HTMLElement, e);
        startPosRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        lastRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLookMove = (e: React.PointerEvent) => {
        if (activeId !== e.pointerId || !lastRef.current) return;
        const dx = e.clientX - lastRef.current.x;
        const dy = e.clientY - lastRef.current.y;
        lastRef.current = { x: e.clientX, y: e.clientY };
        addLook(dx * 0.15, dy * 0.15);
    };
    const onLookUp = (e: React.PointerEvent) => {
        if (activeId !== e.pointerId) return;
        const start = startPosRef.current;
        const end = { x: e.clientX, y: e.clientY, t: performance.now() };
        startPosRef.current = null;
        lastRef.current = null;
        setActiveId(null);
        if (start) {
            const dt = end.t - start.t;
            const dist = Math.hypot(end.x - start.x, end.y - start.y);
            if (dt < 220 && dist < 14) {
                setBtn("fire", true);
                setTimeout(() => setBtn("fire", false), 60);
            }
        }
    };

    const GhostBtn = (p: {
        label: string;
        onDown?: () => void;
        onUp?: () => void;
        className?: string;
        small?: boolean;
    }) => (
        <button
            className={[
                "rounded-xl border text-white/85 backdrop-blur",
                // ↑ más transparente en reposo y al pasar/activar
                "bg-black/10 hover:bg-black/15 active:bg-black/20",
                "border-white/10 active:scale-[0.985]",
                "select-none touch-manipulation",
                p.small ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]",
                p.className ?? "",
            ].join(" ")}
            onPointerDown={(e) => {
                safeCapture(e.currentTarget as HTMLElement, e);
                p.onDown?.();
            }}
            onPointerUp={p.onUp}
            onPointerCancel={p.onUp}
        >
            {p.label}
        </button>
    );

    return (
        <div
            id="game-overlay"
            className="fixed inset-0 z-50 pointer-events-none select-none overscroll-contain"
            style={{ touchAction: "none" }}
        >
            {/* Área global de look / tap-to-fire */}
            <div
                className="absolute inset-0 pointer-events-auto touch-action-none"
                onPointerDown={onLookDown}
                onPointerMove={onLookMove}
                onPointerUp={onLookUp}
                onPointerCancel={onLookUp}
            />

            {/* IZQUIERDA: Joystick (L/R invertido) */}
            <div className="absolute left-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] pointer-events-auto">
                <Joystick onChange={(x, y) => setMove({ x: -x, y })} />
            </div>

            {/* Derecha: layout 2-2-1 (Recargar encima de Correr) + botones más pequeños */}
            <div className="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-auto">
                {/* botones algo más compactos */}
                <div className="grid grid-cols-2 gap-1.25 w-[min(184px,32vw)]">
                    {/* Fila 1 */}
                    <GhostBtn small label="Saltar" onDown={() => setBtn("jump", true)} onUp={() => setBtn("jump", false)} />
                    <GhostBtn small label="Recargar" onDown={() => setBtn("reload", true)} onUp={() => setBtn("reload", false)} />
                    {/* Fila 2 */}
                    <GhostBtn small label="Agachar" onDown={() => setBtn("crouch", true)} onUp={() => setBtn("crouch", false)} />
                    <GhostBtn small label="Correr" onDown={() => setBtn("sprint", true)} onUp={() => setBtn("sprint", false)} />
                    {/* Fila 3: Zoom (izq) + Menú (der) */}
                    <GhostBtn
                        small
                        label="Zoom"
                        onDown={() => setBtn("aim", true)}
                        onUp={() => setBtn("aim", false)}
                        className="w-full"
                    />
                    <GhostBtn
                        small
                        label="Menú"
                        onDown={openMenu}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
}