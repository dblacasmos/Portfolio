/* ====================================
   FILE: src/game/hooks/useHudResponsive.ts
   ==================================== */
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CFG } from "@/constants/config";

export type Breakpoints = {
    isMobile: boolean;   // < 640px
    isTablet: boolean;   // 640–1023px
    isDesktop: boolean;  // ≥ 1024px
};

export type HudResponsive = {
    aspect: number;               // width / height
    dpr: number;                  // device pixel ratio (clamped en config si procede)
    scale: number;                // responsiveScale = CFG.hud.ui.scaleForAspect(aspect)
    bp: Breakpoints;              // flags por breakpoint
    clampToSafe: (x: number, y: number, w: number, h: number) => { x: number; y: number };
    snap: (v: number, step?: number) => number;
    // conveniencias
    safeX: number;
    safeY: number;
    snapStep: number;
};

export function useHudResponsive(): HudResponsive {
    const { size, gl } = useThree();

    const aspect = size.width / Math.max(1, size.height);
    const dpr = gl.getPixelRatio?.() ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const scale = useMemo(() => CFG.hud.ui.scaleForAspect(aspect), [aspect]);

    const bp: Breakpoints = useMemo(
        () => ({
            isMobile: size.width < 640,
            isTablet: size.width >= 640 && size.width < 1024,
            isDesktop: size.width >= 1024,
        }),
        [size.width]
    );

    // Ensanchar tipos a number para evitar literales
    const safeX: number = Number(CFG.hud.ui.safeX ?? 0);
    const safeY: number = Number(CFG.hud.ui.safeY ?? 0);
    const snapStep: number = Number(CFG.hud.ui.snapStep ?? 0);

    const clampToSafe = (x: number, y: number, w: number, h: number) => {
        const minX = -aspect + safeX + w / 2;
        const maxX = +aspect - safeX - w / 2;
        const minY = -1 + safeY + h / 2;
        const maxY = +1 - safeY - h / 2;
        return {
            x: Math.min(maxX, Math.max(minX, x)),
            y: Math.min(maxY, Math.max(minY, y)),
        };
    };

    const snap = (v: number, step?: number) => {
        const s = typeof step === "number" ? step : snapStep;
        if (!s || s <= 0) return v;
        return Math.round(v / s) * s;
    };

    return { aspect, dpr, scale, bp, clampToSafe, snap, safeX, safeY, snapStep };
}

export default useHudResponsive;
