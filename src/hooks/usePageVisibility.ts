/* ====================================
   FILE: src/hooks/usePageVisibility.ts
   ==================================== */
import { useEffect, useState } from "react";

export function usePageVisibility() {
    const [visible, setVisible] = useState(
        typeof document !== "undefined"
            ? document.visibilityState === "visible"
            : true
    );
    useEffect(() => {
        const onVis = () => setVisible(document.visibilityState === "visible");
        document.addEventListener("visibilitychange", onVis, { passive: true });
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);
    return visible;
}
