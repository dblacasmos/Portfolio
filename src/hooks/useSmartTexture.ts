/* ====================================
   FILE: src/game/hooks/textures/useSmartTexture.ts
   ==================================== */
import { useEffect, useState } from "react";
import * as THREE from "three";
import { loadTextureSmart } from "@/game/utils/three/ktx2/ktx2";
/**
 * Carga una textura intentando primero la versión .ktx2 (si existe en /public), 
 * y hace fallback a la ruta original (png/jpg/webp/avif). No cambia la calidad visible.
 * Útil para ahorrar VRAM y ancho de banda en dispositivos compatibles.
 */
export function useSmartTexture(url: string | null | undefined) {
    const [tex, setTex] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let disposed = false;
        if (!url) { setTex(null); return; }
        const onLoad = (t: THREE.Texture) => {
            if (disposed) return;
            // Ajustes seguros por defecto
            t.anisotropy = Math.max(1, (t.anisotropy || 4));
            t.generateMipmaps = true;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            (t as any).colorSpace = THREE.SRGBColorSpace;
            setTex(t);
        };
        const onError = () => { /* silent fallback handled in loader */ };
        try {
            loadTextureSmart(url, onLoad, undefined, onError);
        } catch {
            // Fallback manual si algo va mal
            new THREE.TextureLoader().load(url, onLoad);
        }
        return () => {
            disposed = true;
            try { tex?.dispose(); } catch { }
            setTex(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return tex;
}

export default useSmartTexture;