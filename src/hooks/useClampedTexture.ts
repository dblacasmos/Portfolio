import { useEffect, useState } from "react";
import * as THREE from "three";
import loadClampedTexture, { type LoadClampedOptions } from "@/game/utils/loadClampedTexture";

export function useClampedTexture(url: string, opts: LoadClampedOptions = {}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    setTex(null);
    loadClampedTexture(url, opts).then((t) => { if (alive) setTex(t); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [url, JSON.stringify(opts)]);
  return tex;
}
export default useClampedTexture;
