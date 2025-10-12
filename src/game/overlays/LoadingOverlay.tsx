/*  ====================================
    FILE: src/game/overlays/LoadingOverlay.tsx
    ==================================== */
import React from "react";
import { useGameStore } from "../utils/state/store";
import { ASSETS } from "../../constants/assets";
import { hideGlobalLoadingOverlay } from "./GlobalLoadingPortal";

type Props = {
    /** Progreso real del juego 0..1 (padre lo calcula) */
    progress01: number;
    /** Callback de cierre cuando llega a 100% + minMs */
    onFinished: () => void;
    /** Duración mínima visible (ms). Por defecto 4000ms */
    minMs?: number;
    /** Si true, fondo transparente (no oscurece detrás) */
    transparentBg?: boolean;
};

/** Guard global para evitar dobles montajes sin romper el orden de hooks */
const SINGLETON_KEY = "__app_loading_overlay_singleton__";

/** <video> aislado: nunca re-renderiza aunque el overlay actualice estado. */
const RobotVideo = React.memo(function RobotVideo() {
    const ref = React.useRef<HTMLVideoElement | null>(null);

    // Fuerza play (autoplay+muted en móvil)
    React.useEffect(() => {
        const v = ref.current;
        if (!v) return;
        const tryPlay = () => v.play().catch(() => void 0);
        v.addEventListener("canplay", tryPlay, { once: true });
        tryPlay();
        return () => v.removeEventListener("canplay", tryPlay);
    }, []);

    return (
        <video
            ref={ref}
            src={ASSETS.video.robotLoading}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            controls={false}
            disablePictureInPicture
        />
    );
    // equality siempre true => nunca re-render
}, () => true);

function LoadingOverlayImpl({
    progress01,
    onFinished,
    minMs = 4000,
    transparentBg = false,
}: Props) {
    const setLoadingPct =
        useGameStore((s) => (s as any).setLoadingPct) as undefined | ((n: number) => void);

    // ---- Singleton guard (orden de hooks estable) ----
    const [allowed, setAllowed] = React.useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        return !(window as any)[SINGLETON_KEY];
    });
    React.useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any)[SINGLETON_KEY]) {
            setAllowed(false);
            return;
        }
        (window as any)[SINGLETON_KEY] = true;
        setAllowed(true);
        return () => {
            if ((window as any)[SINGLETON_KEY]) delete (window as any)[SINGLETON_KEY];
        };
    }, []);

    // Handshake: montado y primer paint
    React.useLayoutEffect(() => {
        (window as any).__ingameOverlayMounted = true;
        let raf1 = 0, raf2 = 0;
        const markPainted = () => { (window as any).__ingameOverlayPainted = true; };
        raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(markPainted); });
        return () => {
            if (raf1) cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
            delete (window as any).__ingameOverlayMounted;
            delete (window as any).__ingameOverlayPainted;
        };
    }, []);

    // --- Cierre manual: ENTER o tap en móvil/tablet => cerrar overlay (temporal)
    const isCoarse = React.useMemo(
        () => (typeof window !== "undefined" ? window.matchMedia?.("(pointer: coarse)")?.matches ?? false : false),
        []
    );
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                hideGlobalLoadingOverlay();
            }
        };
        const onPointer = () => { if (isCoarse) hideGlobalLoadingOverlay(); };
        window.addEventListener("keydown", onKey, true);
        window.addEventListener("pointerdown", onPointer, { passive: true, capture: true });
        return () => {
            window.removeEventListener("keydown", onKey, true);
            window.removeEventListener("pointerdown", onPointer, true);
        };
    }, [isCoarse]);

    // ---- Progreso mostrado (suavizado y monótono) ----
    const [pct, setPct] = React.useState(0);
    const startRef = React.useRef<number | null>(null);
    const doneRef = React.useRef(false);

    React.useEffect(() => {
        if (startRef.current == null) startRef.current = performance.now();
    }, []);

    React.useEffect(() => {
        let raf = 0;
        const EPS = 0.15;
        const tick = () => {
            const target = Math.max(0, Math.min(1, progress01)) * 100;
            setPct((prev) => {
                const delta = target - prev;
                if (Math.abs(delta) < EPS) return target; // salta si está muy cerca
                const k = 0.16; // suavizado
                const next = prev + delta * k;
                return Math.max(prev, Math.min(100, next)); // no decrece
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [progress01]);

    React.useEffect(() => {
        try { setLoadingPct?.(Math.round(pct)); } catch { }
    }, [pct, setLoadingPct]);

    React.useEffect(() => {
        if (doneRef.current) return;
        const elapsed = performance.now() - (startRef.current ?? performance.now());
        const atTarget = progress01 >= 1 - 1e-6;
        const atVisual = pct >= 99.75;
        if (atTarget && atVisual && elapsed >= minMs) {
            doneRef.current = true;
            onFinished();
        }
    }, [progress01, pct, minMs, onFinished]);

    // Mensajes
    const sys = React.useMemo(
        () => [
            "Inicializando malla BVH",
            "Compilando shaders",
            "Sincronizando texturas",
            "Activando iluminación",
            "Cargando entidad: drones",
            "Optimizando física",
            "Vinculando audio",
            "Aplicando post-proceso",
        ],
        []
    );
    const sysIdx = Math.min(sys.length - 1, Math.floor((pct / 100) * sys.length));
    const reached100 = pct >= 100 - 0.25;

    if (!allowed) return null;

    const bgClass = transparentBg ? "bg-transparent backdrop-blur-0" : "bg-black/75 backdrop-blur-md";

    return (
        <div className={`fixed inset-0 z-[60] ${bgClass}`}>
            {/* Resplandor sutil */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -inset-1 [background:radial-gradient(1000px_600px_at_10%_-5%,rgba(56,189,248,.28),transparent_55%),radial-gradient(800px_500px_at_110%_105%,rgba(59,130,246,.25),transparent_55%)] blur-3xl opacity-60" />
            </div>

            <div className="absolute inset-0 grid place-items-center px-4">
                <div className="relative w-[min(1080px,95vw)] rounded-2xl overflow-hidden">
                    {/* Borde animado */}
                    <div className="absolute inset-0 rounded-2xl p-[2px]">
                        <div className="w-full h-full rounded-2xl animate-[border-rot_6s_linear_infinite] bg-[conic-gradient(from_var(--ag),rgba(56,189,248,.55),rgba(99,102,241,.55),rgba(14,165,233,.55),rgba(56,189,248,.55))] [--ag:0deg]" />
                    </div>

                    <div className="relative rounded-2xl bg-[rgba(8,15,25,.78)] border border-cyan-400/30 shadow-[0_0_40px_rgba(56,189,248,.18)_inset]">
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr]">
                            {/* IZQ: vídeo (aislado) */}
                            <div className="relative bg-black md:h-full">
                                <RobotVideo />
                                {/* Overlays dinámicos por encima del vídeo */}
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-0 opacity-[.16] [background:repeating-linear-gradient(transparent_0_2px,rgba(255,255,255,.08)_2px_3px)]" />
                                    <div className="absolute top-3 left-3 text-[11px] tracking-[.35em] text-cyan-200/90">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="size-1.5 rounded-full bg-cyan-300 animate-pulse" />
                                            LOADING
                                        </span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 flex items-center gap-3">
                                        <Ring pct={pct} size={56} stroke={6} />
                                        <div className="text-xs text-white/85 leading-tight">
                                            <div className="uppercase tracking-wide text-cyan-200/90">Sistema</div>
                                            <div className="text-white/90">{sys[sysIdx]}</div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
                                </div>
                            </div>

                            {/* DER: progreso */}
                            <div className="relative p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[15px] sm:text-base font-semibold text-white/95 flex items-center gap-2">
                                        <span className="text-cyan-300">Timeline &gt; Engine</span>
                                        <span className="text-white/35">/</span>
                                        <span className="text-white/80">Inicialización</span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md text-[11px] bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30">
                                        {progress01 >= 1 ? (reached100 ? "Listo" : "Sincronizando…") : "Cargando…"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
                                    <div className="hidden sm:flex items-center justify-center">
                                        <Ring pct={pct} size={120} stroke={10} glow />
                                    </div>
                                    <div>
                                        <div className="text-[36px] sm:text-[48px] md:text-[56px] leading-none font-extrabold tracking-tight text-white drop-shadow">
                                            {Math.round(pct)}
                                            <span className="text-cyan-300">%</span>
                                        </div>
                                        <div className="mt-2 text-sm text-white/75">
                                            {progress01 >= 1
                                                ? reached100
                                                    ? "Iniciando módulo de misión…"
                                                    : "Sincronizando colisiones y shaders…"
                                                : "Cargando recursos de la ciudad y sistemas de juego…"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,.85),rgba(99,102,241,.85))] shadow-[0_0_24px_rgba(56,189,248,.65)] transition-[width] duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                        <div
                                            className="absolute inset-y-0 w-32 -ml-16 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-md animate-[sweep_1.8s_linear_infinite]"
                                            style={{ width: `${Math.max(10, pct)}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-white/60">
                                        {progress01 >= 1
                                            ? reached100
                                                ? "Listo."
                                                : "Esperando a SceneRoot…"
                                            : "Optimizando malla BVH y texturas…"}
                                    </div>
                                </div>

                                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-white/85">
                                    {sys.map((label, i) => {
                                        const active = i <= sysIdx;
                                        return (
                                            <li key={label} className="flex items-center gap-2">
                                                <span
                                                    className={
                                                        "size-2 rounded-full " +
                                                        (active
                                                            ? "bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,.55)]"
                                                            : "bg-white/25")
                                                    }
                                                />
                                                <span className={active ? "text-white" : "text-white/55"}>{label}</span>
                                                {active && i === sysIdx && (
                                                    <span className="ml-1 text-white/60 animate-pulse">…</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{css}</style>
        </div>
    );
}

/* ============ Anillo ============ */
function Ring({
    pct,
    size,
    stroke,
    glow = false,
}: {
    pct: number;
    size: number;
    stroke: number;
    glow?: boolean;
}) {
    const clamped = Math.max(0, Math.min(100, pct));
    const angle = (clamped / 100) * 360;
    return (
        <div
            className="relative grid place-items-center"
            style={{ width: size, height: size }}
            aria-label="Progreso"
            role="img"
        >
            <div
                className="rounded-full"
                style={{
                    width: size,
                    height: size,
                    background: `conic-gradient(rgba(56,189,248,.95) ${angle}deg, rgba(255,255,255,.08) ${angle}deg 360deg)`,
                    boxShadow: glow
                        ? "0 0 32px rgba(56,189,248,.45), inset 0 0 24px rgba(56,189,248,.18)"
                        : undefined,
                    transition: "background 250ms linear",
                }}
            />
            <div
                className="absolute rounded-full bg-[rgba(6,10,16,.95)]"
                style={{
                    width: size - stroke * 2,
                    height: size - stroke * 2,
                    boxShadow: "inset 0 0 24px rgba(99,102,241,.25)",
                }}
            />
            <div className="absolute text-[11px] tracking-widest text-cyan-200/90 select-none">SYNC</div>
        </div>
    );
}

const css = `
@keyframes border-rot { 0%{--ag:0deg}100%{--ag:360deg} }
@keyframes sweep { 0%{ transform:translateX(-30%); opacity:0; } 5%{opacity:.75} 50%{opacity:.35} 100%{ transform:translateX(220%); opacity:0; } }
`;

// Export por compatibilidad: default + nombrado
export const LoadingOverlay = LoadingOverlayImpl;
export default LoadingOverlayImpl;
