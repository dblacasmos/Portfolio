import * as THREE from "three";

/**
 * Carga una textura limitando su tamaño máximo (lado mayor) para ahorrar VRAM.
 * - Reutiliza resultados mediante una caché (url|max).
 * - Aplica ajustes seguros (sRGB, mipmaps, filtros, anisotropía).
 * - Devuelve una Promise<Texture>.
 */
const cache = new Map<string, Promise<THREE.Texture>>();

export type LoadClampedOptions = {
    maxSize?: number;            // px, lado mayor (p.ej. 1024)
    colorSpace?: THREE.ColorSpace; // por defecto: SRGB
    anisotropy?: number;         // por defecto: 4
    generateMipmaps?: boolean;   // por defecto: true
    /** Filtro de MINIFICACIÓN (cuando un texel < un píxel) */
    minFilter?: THREE.MinificationTextureFilter;   // p.ej. THREE.LinearMipmapLinearFilter (por defecto)
    /** Filtro de MAGNIFICACIÓN (cuando un texel > un píxel) */
    magFilter?: THREE.MagnificationTextureFilter;  // p.ej. THREE.LinearFilter (por defecto)
};

// --- Guards de tipos seguros para filtros (añádelos tras los tipos de arriba) ---
const isMin = (f: number): f is THREE.MinificationTextureFilter =>
    f === THREE.NearestFilter || f === THREE.LinearFilter ||
    f === THREE.NearestMipmapNearestFilter || f === THREE.NearestMipmapLinearFilter ||
    f === THREE.LinearMipmapNearestFilter || f === THREE.LinearMipmapLinearFilter;

const isMag = (f: number): f is THREE.MagnificationTextureFilter =>
    f === THREE.NearestFilter || f === THREE.LinearFilter;


export function loadClampedTexture(
    url: string,
    opts: LoadClampedOptions = {}
): Promise<THREE.Texture> {
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
                // Narrowing explícito: asignamos solo el tipo correcto para cada propiedad
                const minF: THREE.MinificationTextureFilter =
                    opts.minFilter ?? THREE.LinearMipmapLinearFilter;
                const magF: THREE.MagnificationTextureFilter =
                    opts.magFilter ?? THREE.LinearFilter;
                useTex.minFilter = minF;
                useTex.magFilter = magF;
                useTex.generateMipmaps = opts.generateMipmaps ?? true;
                useTex.anisotropy = Math.min(
                    opts.anisotropy ?? 4,
                    (THREE as any).WebGL1Renderer ? 4 : 16
                );
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
