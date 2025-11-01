import { useEffect, useState } from "react";
import type { Texture } from "three";
import loadClampedTexture, { type LoadClampedOptions } from "@/game/utils/three/textures/loadClampedTexture";

export function useClampedTexture(url: string, opts: LoadClampedOptions = {}) {
  const [tex, setTex] = useState<Texture | null>(null);
  const optsKey =
    `${opts.maxSize ?? ""}|${String(opts.colorSpace ?? "")}|${opts.anisotropy ?? ""}|` +
    `${opts.generateMipmaps ?? ""}|${opts.minFilter ?? ""}|${opts.magFilter ?? ""}`;
  useEffect(() => {
    let alive = true;
    setTex(null);
    loadClampedTexture(url, opts).then((t) => { if (alive) setTex(t); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [url, optsKey]);
  return tex;
}
export default useClampedTexture;
