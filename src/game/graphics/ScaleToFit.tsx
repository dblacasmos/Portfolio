import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ScaleToFit
 * Escala TODO su contenido para que mantenga la composición original
 * (misma "maqueta" que desktop) y simplemente reduzca/aumente su tamaño
 * según el viewport. Úsalo como wrapper del juego + UI.
 *
 * - designWidth / designHeight: tu resolución de referencia (ej: 1280x720 o 1920x1080)
 * - mode="contain": ajusta por el menor ratio (cabrá entero sin recortes)
 * - Con fixed root para overlays consistentes.
 */
type Props = {
    designWidth?: number;
    designHeight?: number;
    mode?: "contain" | "cover";
    className?: string;
    children: React.ReactNode;
};

export const ScaleToFit: React.FC<Props> = ({
    designWidth = 1280,
    designHeight = 720,
    mode = "contain",
    className = "",
    children,
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: designWidth, h: designHeight, x: 0, y: 0, s: 1 });

    // Exponer el root escalado para que los overlays hagan portal AQUÍ
    // (y hereden el scale), en vez de ir a document.body.
    useEffect(() => {
        const el = rootRef.current;
        try {
            (window as any).__scaleRoot = el;
        } catch { }
        return () => {
            try {
                if ((window as any).__scaleRoot === el) delete (window as any).__scaleRoot;
            } catch { }
        };
    }, []);

    useEffect(() => {
        const resize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const sx = vw / designWidth;
            const sy = vh / designHeight;
            const s = mode === "contain" ? Math.min(sx, sy) : Math.max(sx, sy);
            const w = Math.round(designWidth * s);
            const h = Math.round(designHeight * s);
            const x = Math.floor((vw - w) / 2);
            const y = Math.floor((vh - h) / 2);
            setBox({ w, h, x, y, s });
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(document.body);
        window.addEventListener("orientationchange", resize);
        window.addEventListener("resize", resize);
        return () => {
            ro.disconnect();
            window.removeEventListener("orientationchange", resize);
            window.removeEventListener("resize", resize);
        };
    }, [designWidth, designHeight, mode]);

    // “stage” con tamaño real (sin transform)
    const stageStyle = useMemo<React.CSSProperties>(
        () => ({
            position: "absolute",
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
        }),
        [box]
    );

    return (
        <div
            className={`fixed inset-0 overflow-hidden bg-black ${className}`}
            aria-label="viewport-scale-wrapper"
        >
            <div
                ref={rootRef}
                id="scale-root"
                data-scale-root="true"
                aria-label="scale-root"
                style={stageStyle}
                className="relative"
            // Importante: este contenedor será el “sistema de coordenadas” del juego/UI
            >
                {children}
            </div>
        </div>
    );
};
