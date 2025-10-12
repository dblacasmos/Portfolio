/*  ====================================
    FILE: src/game/overlays/ContextLostOverlay.tsx
    ==================================== */
import React from "react";
import { useThree } from "@react-three/fiber";

/**
 * Cubre la pantalla cuando WebGL pierde el contexto.
 * - Escucha lost/restored en el canvas de R3F
 * - Intenta restaurar el estado de GL al recuperarse
 * - Tras ~1.5s sugiere recargar si no vuelve solo
 */
export const ContextLostShield: React.FC = () => {
    const { gl } = useThree();
    const [lost, setLost] = React.useState(false);
    const [suggestReload, setSuggestReload] = React.useState(false);
    const timerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        const canvas = gl.domElement;

        const onLost = (e: Event) => {
            // Evita el borrado automático del canvas
            e.preventDefault();
            setLost(true);
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setSuggestReload(true), 1500);
        };

        const onRestored = () => {
            setLost(false);
            setSuggestReload(false);
            // Reset de estado del renderer (blend/depth/cull…)
            try { gl.resetState(); } catch { }
            if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
        };

        // Importante: passive:false para que preventDefault funcione
        canvas.addEventListener("webglcontextlost", onLost, { passive: false });
        canvas.addEventListener("webglcontextrestored", onRestored as any, { passive: true });

        // Teclas de test (opcionales)
        const testKeys = (ev: KeyboardEvent) => {
            if (!(ev.ctrlKey && ev.altKey)) return;
            const ext: any = gl.getContext().getExtension("WEBGL_lose_context");
            if (!ext) return;
            if (ev.code === "KeyL") ext.loseContext();
            if (ev.code === "KeyR") ext.restoreContext();
        };
        window.addEventListener("keydown", testKeys);

        return () => {
            canvas.removeEventListener("webglcontextlost", onLost as any);
            canvas.removeEventListener("webglcontextrestored", onRestored as any);
            window.removeEventListener("keydown", testKeys);
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [gl]);

    if (!lost) return null;

    return (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70]" data-overlay="context-lost">
            <div className="px-3 py-2 rounded-xl bg-black/80 text-cyan-100 border border-cyan-400/40 text-xs shadow-lg">
                Contexto WebGL perdido. {suggestReload ? "Si no vuelve, recarga la pestaña." : "Intentando recuperar…"}
            </div>
        </div>
    );
};

export default ContextLostShield;
