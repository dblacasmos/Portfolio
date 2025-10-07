/*  =============================
    FILE: src/hooks/useDracoGLTF.ts
    ============================= */
import { useGLTF } from "@react-three/drei";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Group } from "three";
import { CFG } from "@/constants/config";
import { getKTX2Optional, isKTX2Ready, getKTX2 } from "@/game/utils/three/ktx2/ktx2";

type GLTFLike = { scene: Group } & Record<string, any>;

type Options = {
    /** Ruta al decoder Draco en /public (por defecto: "<base>/draco/") */
    dracoPath?: string;
    /** Usa Meshopt (por defecto: true) */
    meshopt?: boolean;
};

// Fallback sensato si no hay path en config
const BASE = (import.meta.env?.BASE_URL ?? "/");
const DEFAULT_DRACO_PATH = (CFG as any)?.decoders?.dracoPath ?? BASE + "draco/";

// —— Singletons globales (no duplicar instancias) ——
let sharedDraco: DRACOLoader | null = null;
const sharedMeshopt = MeshoptDecoder as any;

function getDraco(path: string) {
    if (!sharedDraco) sharedDraco = new DRACOLoader();
    sharedDraco.setDecoderPath(path.endsWith("/") ? path : path + "/");
    return sharedDraco;
}

/** Extiende GLTFLoader con DRACO + Meshopt (sin KTX2) */
function withDecoders(opts: Required<Pick<Options, "dracoPath" | "meshopt">>) {
    return (loader: any) => {
        loader.setDRACOLoader?.(getDraco(opts.dracoPath));

        if (opts.meshopt !== false && typeof loader.setMeshoptDecoder === "function") {
            loader.setMeshoptDecoder(sharedMeshopt);
        }

        // Adjunta KTX2Loader si está listo (idempotente, sin romper si no lo está)
        const ktx2 = getKTX2Optional?.();
        if (typeof loader.setKTX2Loader === "function" && (ktx2 || isKTX2Ready?.())) {
            try {
                loader.setKTX2Loader(ktx2 ?? getKTX2());
            } catch {
                // todavía no inicializado: seguimos sin bloquear la carga
            }
        }
    };
}

/** Hook de carga GLTF con DRACO + Meshopt */
export function useDracoGLTF(url: string, options: Options = {}): GLTFLike {
    // Si KTX2 aún no está listo, suspendemos hasta recibir el evento.
    if (!isKTX2Ready?.()) {
        throw new Promise<void>((resolve) => {
            const once = () => { window.removeEventListener("ktx2-ready", once); resolve(); };
            window.addEventListener("ktx2-ready", once, { once: true });
        });
    }
    const dracoPath = options.dracoPath ?? DEFAULT_DRACO_PATH;
    const meshopt = options.meshopt !== false;

    const gltf = useGLTF(
        url,
        undefined,
        undefined,
        withDecoders({ dracoPath, meshopt })
    ) as unknown as GLTFLike;

    return gltf;
}

/** Preload: adjunta decodificadores para acelerar la 1ª carga */
(useDracoGLTF as any).preload = (url: string, options: Options = {}) => {
    const dracoPath = options.dracoPath ?? DEFAULT_DRACO_PATH;
    const meshopt = options.meshopt !== false;
    const doPreload = () =>
        (useGLTF as any).preload(url, undefined, undefined, withDecoders({ dracoPath, meshopt }));

    // Evita: "setKTX2Loader must be called..." si KTX2 aún no está inicializado
    if (!isKTX2Ready?.()) {
        const once = () => { try { doPreload(); } finally { window.removeEventListener("ktx2-ready", once); } };
        window.addEventListener("ktx2-ready", once, { once: true });
        return;
    }
    doPreload();
};
