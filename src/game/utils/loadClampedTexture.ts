/* ==========================================
   FILE: src/game/utils/loadClampedTexture.ts
   ========================================== */
import * as THREE from "three";

/**
 * Carga una textura limitando su tamaño máximo (lado mayor) para ahorrar VRAM.
 * - Reutiliza resultados mediante una caché (url|max).
 * - Aplica ajustes seguros (sRGB, mipmaps, filtros, anisotropía).
 * - Devuelve una Promise<Texture>.
 */
const cache = new Map<string, Promise<THREE.Texture>>();

export type LoadClampedOptions = {
    maxSize?: number;                               // px, lado mayor (p.ej. 1024)
    colorSpace?: THREE.ColorSpace;                  // por defecto: SRGB
    anisotropy?: number;                            // por defecto: 4
    generateMipmaps?: boolean;                      // por defecto: true
    minFilter?: THREE.MinificationTextureFilter;    // p.ej. LinearMipmapLinearFilter (por defecto)
    magFilter?: THREE.MagnificationTextureFilter;   // p.ej. LinearFilter (por defecto)
}; 

export function loadClampedTexture(
    url: string,
    opts: LoadClampedOptions = {}
): Promise<THREE.Texture> {
    // SSR guard: sólo en cliente
    if (typeof window === "undefined") {
        return Promise.reject(new Error("loadClampedTexture sólo está disponible en cliente."));
    }

    const key = `${url}|${opts.maxSize ?? 1024}|${opts.colorSpace ?? "sRGB"}|${opts.anisotropy ?? 4}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (t) => {
                const img: any = t.image;
                const w = img?.width ?? 0;
                const h = img?.height ?? 0;
                const max = Math.max(1, opts.maxSize ?? 1024);

                let useTex: THREE.Texture = t;
                if (w > max || h > max) {
                    // Reescala en canvas (rápido y suficiente para UI/fondos)
                    const scale = Math.min(max / Math.max(1, w), max / Math.max(1, h));
                    const tw = Math.max(1, Math.floor(w * scale));
                    const th = Math.max(1, Math.floor(h * scale));
                    const canvas = document.createElement("canvas");
                    canvas.width = tw; canvas.height = th;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0, tw, th);
                    const ct = new THREE.CanvasTexture(canvas);
                    useTex = ct;
                    // libera la original
                    try { t.dispose(); } catch { }
                }

                (useTex as any).colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
                useTex.minFilter = opts.minFilter ?? THREE.LinearMipmapLinearFilter;
                useTex.magFilter = opts.magFilter ?? THREE.LinearFilter;
                useTex.generateMipmaps = opts.generateMipmaps ?? true;
                useTex.anisotropy = Math.max(1, Math.min(opts.anisotropy ?? 4, 16));
                useTex.wrapS = THREE.ClampToEdgeWrapping;
                useTex.wrapT = THREE.ClampToEdgeWrapping;
                useTex.needsUpdate = true;
                resolve(useTex);
            },
            undefined,
            (e) => reject(e)
        );
    });

    cache.set(key, promise);
    return promise;
}

export default loadClampedTexture;
