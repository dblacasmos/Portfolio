import { useEffect, useState } from "react";

export const isCoarsePointer = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
};

export const isMobileOrTablet = () => {
    if (typeof window === "undefined") return false;
    // Override manual para tests o forzar HUD móvil
    if (localStorage.getItem("__FORCE_MOBILE") === "1") return true;
    // Criterio híbrido: pointer “coarse”, hover:none o ancho <= 1024
    const noHover = window.matchMedia?.("(hover: none)")?.matches ?? false;
    return isCoarsePointer() || noHover || window.innerWidth <= 1024;
};

export function useIsMobileOrTablet() {
    const [val, setVal] = useState(isMobileOrTablet());
    useEffect(() => {
        const onChange = () => setVal(isMobileOrTablet());
        window.addEventListener("resize", onChange);
        try {
            const mqCoarse = window.matchMedia("(pointer: coarse)");
            const mqNoHover = window.matchMedia("(hover: none)");
            mqCoarse.addEventListener?.("change", onChange);
            mqNoHover.addEventListener?.("change", onChange);
            return () => {
                window.removeEventListener("resize", onChange);
                mqCoarse.removeEventListener?.("change", onChange);
                mqNoHover.removeEventListener?.("change", onChange);
            };
        } catch {
            return () => window.removeEventListener("resize", onChange);
        }
    }, []);
    return val;
}
