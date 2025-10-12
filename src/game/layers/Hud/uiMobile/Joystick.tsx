import { useRef, useState } from "react";

type Props = {
    onChange: (x: number, y: number) => void;
    size?: number;
    /** "left" -> Q, "right" -> E, null -> ninguno */
    onSidePress?: (side: "left" | "right" | null) => void;
};

export default function Joystick({ onChange, size = 120, onSidePress }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [side, setSide] = useState<"left" | "right" | null>(null);

    const updateSide = (dx: number) => {
        const next: "left" | "right" = dx < 0 ? "left" : "right";
        if (next !== side) { setSide(next); onSidePress?.(next); }
    };

    const handle = (e: React.PointerEvent) => {
        if (!ref.current) return;
        e.stopPropagation();
        const r = ref.current.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        updateSide(dx);

        const max = size * 0.35; // radio útil
        const mag = Math.min(1, Math.hypot(dx, dy) / max);
        const ang = Math.atan2(dy, dx);
        // x = lateral, y = adelante (+) / atrás (-)
        onChange(mag * Math.cos(ang), -mag * Math.sin(ang));
    };

    const stop = (e?: React.PointerEvent) => {
        if (e) e.stopPropagation();
        setActive(false);
        onChange(0, 0);
        if (side !== null) { setSide(null); onSidePress?.(null); }
    };

    return (
        <div
            ref={ref}
            style={{ width: size, height: size, touchAction: "none" }}
            className="rounded-full bg-white/5 border border-white/10 relative"
            onPointerDown={(e) => { e.stopPropagation(); setActive(true); try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { } handle(e); }}
            onPointerMove={(e) => active && handle(e)}
            onPointerUp={stop}
            onPointerCancel={stop}
        >
            <div className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-white/30 pointer-events-none" />
        </div>
    );
}
