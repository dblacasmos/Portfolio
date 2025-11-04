/*  ===============================
    FILE: src/engine/ScaleToFit.tsx
    =============================== */
import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
    designWidth?: number;
    designHeight?: number;
    mode?: "contain" | "cover";
    className?: string;
    children?: React.ReactNode;
};

export const ScaleToFit: React.FC<Props> = ({
    designWidth = 1280,
    designHeight = 720,
    mode = "contain",
    className,
    children,
}) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [s, setS] = useState(1);

    useEffect(() => {
        const el = rootRef.current?.parentElement || document.body;
        const getSize = () => {
            // VisualViewport para iOS; fallback a innerWidth/innerHeight
            const vw = (window.visualViewport?.width ?? window.innerWidth);
            const vh = (window.visualViewport?.height ?? window.innerHeight);
            const sx = vw / designWidth;
            const sy = vh / designHeight;
            const ns = mode === "contain" ? Math.min(sx, sy) : Math.max(sx, sy);
            setS(ns);
        };
        getSize();
        const ro = new ResizeObserver(getSize);
        ro.observe(el);
        window.visualViewport?.addEventListener("resize", getSize, { passive: true });
        window.addEventListener("orientationchange", getSize, { passive: true });
        return () => {
            ro.disconnect();
            window.visualViewport?.removeEventListener("resize", getSize as any);
            window.removeEventListener("orientationchange", getSize as any);
        };
    }, [designWidth, designHeight, mode]);

    const outerStyle: React.CSSProperties = useMemo(
        () => ({
            position: "fixed",
            inset: 0,
            width: "100dvw",
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            touchAction: "none", // los gestos se gestionan dentro
            WebkitTapHighlightColor: "transparent",
        }),
        []
    );

    const stageStyle: React.CSSProperties = useMemo(
        () => ({
            width: designWidth,
            height: designHeight,
            transform: `scale(${s})`,
            transformOrigin: "center center",
            pointerEvents: "auto",
        }),
        [s, designWidth, designHeight]
    );

    return (
        <div style={outerStyle} className={className ? className : undefined}>
            <div
                ref={rootRef}
                id="scale-root"
                data-scale-root="true"
                aria-label="scale-root"
                style={stageStyle}
                className="relative"
            >
                {children}
            </div>
        </div>
    );
};