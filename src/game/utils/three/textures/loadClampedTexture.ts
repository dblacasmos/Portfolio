import * as THREE from "three";
import type {
    Texture,
    ColorSpace,
    MinificationTextureFilter,
    MagnificationTextureFilter,
} from "three";

/**
 * Carga una textura limitando su tamaño máximo (lado mayor) para ahorrar VRAM.
 * - Reutiliza resultados mediante una caché (url|max).
 * - Aplica ajustes seguros (sRGB, mipmaps, filtros, anisotropía).
 * - Devuelve una Promise<Texture>.
 */
const cache = new Map<string, Promise<THREE.Texture>>();

export type LoadClampedOptions = {
    maxSize?: number;              // px, lado mayor (p.ej. 1024)
    colorSpace?: ColorSpace;       // por defecto: SRGB
    anisotropy?: number;           // por defecto: 4
    generateMipmaps?: boolean;     // por defecto: true
    /** Filtro de MINIFICACIÓN (cuando un texel < un píxel) */
    minFilter?: MinificationTextureFilter;   // p.ej. LinearMipmapLinearFilter (por defecto)
    /** Filtro de MAGNIFICACIÓN (cuando un texel > un píxel) */
    magFilter?: MagnificationTextureFilter;  // p.ej. LinearFilter (por defecto)
};

// --- Guards de tipos seguros para filtros (añádelos tras los tipos de arriba) ---
const isMin = (f: number): f is MinificationTextureFilter =>
    f === THREE.NearestFilter || f === THREE.LinearFilter ||
    f === THREE.NearestMipmapNearestFilter || f === THREE.NearestMipmapLinearFilter ||
    f === THREE.LinearMipmapNearestFilter || f === THREE.LinearMipmapLinearFilter;

const isMag = (f: number): f is MagnificationTextureFilter =>
    f === THREE.NearestFilter || f === THREE.LinearFilter;


export function loadClampedTexture(
    url: string,
    opts: LoadClampedOptions = {}
): Promise<Texture> {
    const key = `${url}|${opts.maxSize ?? 1024}|${String(opts.colorSpace ?? THREE.SRGBColorSpace)}|${opts.anisotropy ?? 4}`
    const hit = cache.get(key);
    if (hit) return hit;

    const promise = new Promise<Texture>((resolve, reject) => {
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
                    const scale = Math.min(max / Math.max(1, w), max / Math.max(1, h));
                    const tw = Math.max(1, Math.floor(w * scale));
                    const th = Math.max(1, Math.floor(h * scale));
                    const canvas = document.createElement("canvas");
                    canvas.width = tw;
                    canvas.height = th;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0, tw, th);
                    const ct = new THREE.CanvasTexture(canvas);
                    useTex = ct;
                    // liberar textura original
                    try { t.dispose(); } catch { }
                }

                (useTex as any).colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
                // Filtros validados
                const minF = opts.minFilter;
                const magF = opts.magFilter;
                useTex.minFilter = isMin(minF as any) ? (minF as MinificationTextureFilter) : THREE.LinearMipmapLinearFilter;
                useTex.magFilter = isMag(magF as any) ? (magF as MagnificationTextureFilter) : THREE.LinearFilter;
                // Mipmaps
                useTex.generateMipmaps = opts.generateMipmaps ?? true;
                // Anisotropía segura (sin heurística WebGL1/2; si necesitas el máximo real, pásalo por opts)
                useTex.anisotropy = Math.max(1, opts.anisotropy ?? 4);
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
