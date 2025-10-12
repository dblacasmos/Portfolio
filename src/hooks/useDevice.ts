import { useEffect, useState } from "react";

export const isCoarsePointer = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
};

export const isMobileOrTablet = () => {
    if (typeof window === "undefined") return false;
    // Criterio híbrido: pointer “coarse” o ancho <= 1024
    return isCoarsePointer() || window.innerWidth <= 1024;
};

export function useIsMobileOrTablet() {
    const [val, setVal] = useState(isMobileOrTablet());
    useEffect(() => {
        const onResize = () => setVal(isMobileOrTablet());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return val;
}
