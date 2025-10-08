// =======================================
// FILE: src/hooks/useClampedTexture.ts
// =======================================
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import loadClampedTexture, { type LoadClampedOptions } from "@/game/utils/loadClampedTexture";

/**
 * Carga una textura con límite de tamaño (VRAM friendly).
 * - Estabiliza dependencias del efecto (key memoizado).
 * - Hace dispose de la textura anterior al cambiar url/opciones.
 * - No falla en SSR (el loader ya protege, aquí devolvemos null).
 */
export function useClampedTexture(url: string, opts: LoadClampedOptions = {}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const prevRef = useRef<THREE.Texture | null>(null);

  // Key estable para deps (evita re-renders innecesarios por identidad de objeto)
  const key = useMemo(() => {
    const safe = {
      maxSize: opts.maxSize ?? 1024,
      colorSpace: opts.colorSpace ?? "sRGB",
      anisotropy: opts.anisotropy ?? 4,
      generateMipmaps: opts.generateMipmaps ?? true,
      minFilter: opts.minFilter,
      magFilter: opts.magFilter,
    };
    return `${url}|${JSON.stringify(safe)}`;
  }, [url, opts.maxSize, opts.colorSpace, opts.anisotropy, opts.generateMipmaps, opts.minFilter, opts.magFilter]);

  useEffect(() => {
    let alive = true;

    // Descarta la anterior si había
    if (prevRef.current) {
      try { prevRef.current.dispose(); } catch { }
      prevRef.current = null;
    }
    setTex(null);

    // SSR: si no hay window, termina limpio
    if (typeof window === "undefined") return () => { alive = false; };

    loadClampedTexture(url, opts)
      .then((t) => {
        if (!alive) { try { t.dispose(); } catch { } return; }
        prevRef.current = t;
        setTex(t);
      })
      .catch(() => { /* silent */ });

    return () => { alive = false; };
  }, [key]);

  return tex;
}

export default useClampedTexture;
