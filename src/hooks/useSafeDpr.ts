// =============================
// FILE: src/hooks/useSafeDpr.ts
// =============================
export function useSafeDpr(): [number, number] {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iP(hone|ad|od)/.test(ua);
    const dpr =
        typeof window !== "undefined" ? Math.max(1, Math.min(window.devicePixelRatio || 1, 3)) : 1;
    // Respeta ahorro de datos si está disponible (no rompe en Safari)
    const prefersLowData =
        typeof window !== "undefined" &&
        (("connection" in navigator && (navigator as any).connection?.saveData) ||
            window.matchMedia?.("(prefers-reduced-data: reduce)")?.matches);
    const maxCap = prefersLowData ? 1.25 : (isIOS ? 1.5 : 2);
    const cap = Math.min(maxCap, dpr);
    return [1, cap];
}