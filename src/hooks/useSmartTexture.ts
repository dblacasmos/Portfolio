/* ================================================
   FILE: src/game/hooks/textures/useSmartTexture.ts
   ================================================ */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadTextureSmart } from "@/game/utils/textures/ktx2";

/**
 * Carga una textura intentando primero .ktx2 y cae a png/jpg/webp/avif.
 * Ajusta filtros y color space; hace dispose al desmontar/cambiar.
 */
export function useSmartTexture(url: string | null | undefined) {
    const [tex, setTex] = useState<THREE.Texture | null>(null);
    const currentRef = useRef<THREE.Texture | null>(null);

    useEffect(() => {
        let disposed = false;

        // Limpia anterior
        if (currentRef.current) {
            try { currentRef.current.dispose(); } catch { }
            currentRef.current = null;
        }
        setTex(null);

        if (!url) return () => { disposed = true; };

        const onLoad = (t: THREE.Texture) => {
            if (disposed) { try { t.dispose(); } catch { } return; }
            // Ajustes seguros por defecto
            t.anisotropy = Math.max(1, (t.anisotropy || 4));
            t.generateMipmaps = true;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            (t as any).colorSpace = THREE.SRGBColorSpace;
            currentRef.current = t;
            setTex(t);
        };
        const onError = () => { /* silent */ };

        try {
            loadTextureSmart(url, onLoad, undefined, onError);
        } catch {
            // Fallback manual si algo va mal
            new THREE.TextureLoader().load(url, onLoad);
        }

        return () => {
            disposed = true;
        };
    }, [url]);

    return tex;
}

export default useSmartTexture;
