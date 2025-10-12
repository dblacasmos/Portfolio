import React, { useRef, useEffect, useMemo } from "react";
import { useInput } from "@/hooks/useInput";

type Props = {
    radius?: number;  // radio visual del joystick (px)
};

export const Joystick: React.FC<Props> = ({ radius = 56 }) => {
    // Sólo seleccionamos lo que necesitamos del store (refs estables)
    const setMove = useInput((s) => s.setMove);
    const enableTouch = useInput((s) => s.enableTouch);

    const baseRef = useRef<HTMLDivElement | null>(null);
    const knobRef = useRef<HTMLDivElement | null>(null);
    const activeId = useRef<number | null>(null);
    const center = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastVec = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const R = radius;
    const innerR = Math.max(28, Math.floor(R * 0.55));

    const styles = useMemo(() => ({
        base: {
            width: R * 2, height: R * 2, borderRadius: R,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            backdropFilter: "blur(4px)",
            touchAction: "none" as const,
        },
        knob: {
            width: innerR * 2, height: innerR * 2, borderRadius: innerR,
            background: "rgba(255,255,255,.18)",
            border: "1px solid rgba(255,255,255,.25)",
            transform: "translate(-50%, -50%)",
            left: "50%", top: "50%",
        },
    }), [R, innerR]);

    useEffect(() => {
        const el = baseRef.current;
        if (!el) return;

        const getLocalCenter = () => {
            const b = el.getBoundingClientRect();
            center.current = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        };

        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

        const handleDown = (e: PointerEvent) => {
            if (!enableTouch) return;
            if (activeId.current !== null) return;
            activeId.current = e.pointerId;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            getLocalCenter();
            handleMove(e);
        };

        const handleMove = (e: PointerEvent) => {
            if (!enableTouch) return;
            if (activeId.current !== e.pointerId) return;
            const cx = center.current.x, cy = center.current.y;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const len = Math.hypot(dx, dy);
            const max = R - Math.max(10, R * 0.25);
            const k = len > 0 ? clamp(len / max, 0, 1) : 0;
            // vector normalizado (-1..1)
            const nx = (dx / (max || 1)) * clamp(1, 0, 1);
            const ny = (dy / (max || 1)) * clamp(1, 0, 1);

            // mapeo: x = strafe, y = forward (positivo hacia arriba; invertimos)
            const moveX = clamp(nx, -1, 1);
            const moveY = clamp(-ny, -1, 1);

            // mueve el knob
            if (knobRef.current) {
                const px = clamp(dx, -max, max);
                const py = clamp(dy, -max, max);
                knobRef.current.style.left = `calc(50% + ${px}px)`;
                knobRef.current.style.top = `calc(50% + ${py}px)`;
            }

            // Sólo setear si realmente cambió (evita notificaciones inútiles)
            if (moveX !== lastVec.current.x || moveY !== lastVec.current.y) {
                lastVec.current = { x: moveX, y: moveY };
                setMove(lastVec.current, "touch");
            }
        };

        const end = (e: PointerEvent) => {
            if (activeId.current !== e.pointerId) return;
            activeId.current = null;
            if (knobRef.current) {
                knobRef.current.style.left = `50%`;
                knobRef.current.style.top = `50%`;
            }
            lastVec.current = { x: 0, y: 0 };
            setMove({ x: 0, y: 0 }, "touch");
        };

        el.addEventListener("pointerdown", handleDown);
        el.addEventListener("pointermove", handleMove);
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
        el.addEventListener("pointerleave", end);
        window.addEventListener("resize", getLocalCenter);

        return () => {
            el.removeEventListener("pointerdown", handleDown);
            el.removeEventListener("pointermove", handleMove);
            el.removeEventListener("pointerup", end);
            el.removeEventListener("pointercancel", end);
            el.removeEventListener("pointerleave", end);
            window.removeEventListener("resize", getLocalCenter);
        };
    }, [R, enableTouch, setMove]);

    return (
        <div
            ref={baseRef}
            style={styles.base}
            className="relative select-none"
            aria-label="Joystick virtual"
        >
            <div ref={knobRef} style={styles.knob} className="absolute" />
        </div>
    );
};

export default Joystick;
