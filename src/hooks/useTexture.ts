/* =============================
   FILE: src/hooks/useTexture.ts
   ============================= */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import loadClampedTexture, { type LoadClampedOptions } from "@/game/utils/loadClampedTexture";
import { getKTX2Optional, loadTextureSmart } from "@/game/utils/textures/ktx2";

export type UseTextureOptions = {
    /** Límite de lado mayor en px (VRAM-friendly). Si se define, usa loadClampedTexture. */
    clampToMaxSize?: number;
    /** Intenta .ktx2 y cae a raster si no está disponible. Requiere initKTX2Loader() en runtime. */
    preferKTX2?: boolean;
    /** Ajustes de color/filtros (por defecto: sRGB + mipmaps + Linear/LinearMipmapLinear) */
    colorSpace?: THREE.ColorSpace;
    minFilter?: THREE.MinificationTextureFilter;
    magFilter?: THREE.MagnificationTextureFilter;
    anisotropy?: number;
    generateMipmaps?: boolean;
};

/**
 * Hook único para cargar texturas con opciones de:
 * - clamp (tamaño máximo),
 * - preferencia por KTX2 + fallback,
 * - y ajustes de filtros/colorSpace.
 *
 * Internamente reutiliza loadClampedTexture y KTX2Loader (loadTextureSmart).
 */
export function useTexture(url: string | null | undefined, opts: UseTextureOptions = {}) {
    const [tex, setTex] = useState<THREE.Texture | null>(null);
    const prevRef = useRef<THREE.Texture | null>(null);

    const key = useMemo(() => {
        const safe = {
            clamp: opts.clampToMaxSize ?? 0,
            ktx2: !!opts.preferKTX2,
            cs: opts.colorSpace ?? THREE.SRGBColorSpace,
            an: opts.anisotropy ?? 4,
            mm: opts.generateMipmaps ?? true,
            min: opts.minFilter ?? THREE.LinearMipmapLinearFilter,
            mag: opts.magFilter ?? THREE.LinearFilter,
        };
        return `${url}|${JSON.stringify(safe)}`;
    }, [
        url,
        opts.clampToMaxSize,
        opts.preferKTX2,
        opts.colorSpace,
        opts.anisotropy,
        opts.generateMipmaps,
        opts.minFilter,
        opts.magFilter,
    ]);

    useEffect(() => {
        let disposed = false;

        const applyCommon = (t: THREE.Texture) => {
            // Nota: para KTX2 (CompressedTexture) lo seguro es no forzar generateMipmaps si no trae mips.
            const isCompressed = (t as any).isCompressedTexture === true;
            if (!isCompressed) {
                t.generateMipmaps = opts.generateMipmaps ?? true;
            }
            t.minFilter = opts.minFilter ?? THREE.LinearMipmapLinearFilter;
            t.magFilter = opts.magFilter ?? THREE.LinearFilter;
            t.anisotropy = Math.max(1, opts.anisotropy ?? 4);
            (t as any).colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
            t.needsUpdate = true;
            return t;
        };

        const cleanupPrev = () => {
            const prev = prevRef.current;
            if (prev) {
                try {
                    prev.dispose();
                } catch { }
                prevRef.current = null;
            }
        };

        cleanupPrev();
        setTex(null);

        if (!url) return () => { disposed = true; };

        // Ruta 1: clamp explícito -> usa loadClampedTexture
        if (opts.clampToMaxSize && opts.clampToMaxSize > 0) {
            const lopts: LoadClampedOptions = {
                maxSize: opts.clampToMaxSize,
                colorSpace: (opts.colorSpace as any) ?? THREE.SRGBColorSpace,
                anisotropy: opts.anisotropy ?? 4,
                generateMipmaps: opts.generateMipmaps ?? true,
                minFilter: opts.minFilter,
                magFilter: opts.magFilter,
            };
            loadClampedTexture(url, lopts)
                .then((t) => {
                    if (disposed) {
                        try { t.dispose(); } catch { }
                        return;
                    }
                    applyCommon(t);
                    prevRef.current = t;
                    setTex(t);
                })
                .catch(() => {
                    /* silencioso */
                });
            return () => {
                disposed = true;
                cleanupPrev();
            };
        }

        // Ruta 2: prefer KTX2 si el loader está listo, con fallback a raster
        const canKTX2 = !!getKTX2Optional();
        if (opts.preferKTX2 && canKTX2) {
            loadTextureSmart(
                url,
                (t) => {
                    if (disposed) {
                        try { t.dispose(); } catch { }
                        return;
                    }
                    applyCommon(t);
                    prevRef.current = t;
                    setTex(t);
                },
                undefined,
                () => {
                    /* onError: ignora, no seteamos nada */
                }
            );
            return () => {
                disposed = true;
                cleanupPrev();
            };
        }

        // Ruta 3: textura normal
        const tl = new THREE.TextureLoader();
        const handle = tl.load(
            url,
            (t) => {
                if (disposed) {
                    try { t.dispose(); } catch { }
                    return;
                }
                applyCommon(t);
                prevRef.current = t;
                setTex(t);
            },
            undefined,
            () => {
                /* silencioso */
            }
        );

        return () => {
            disposed = true;
            try {
                const h: any = handle;
                if (h) h.image = null; // sin optional chaining en el LHS
            } catch { }
            cleanupPrev();
        };
    }, [key]);

    return tex;
}

export default useTexture;
