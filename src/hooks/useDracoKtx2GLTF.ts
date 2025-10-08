/*  =============================
    FILE: src/hooks/useDracoKtx2GLTF.ts
    ============================= */
import { useGLTF } from "@react-three/drei";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Group } from "three";
import { CFG } from "@/constants/config";
import { getKTX2Optional, isKTX2Ready, getKTX2 } from "@/game/utils/three/ktx2/ktx2";
import { useGameStore } from "@/game/utils/state/store";

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

// —— Singletons globales (evita duplicar instancias) ——
let sharedDraco: DRACOLoader | null = null;
const sharedMeshopt = MeshoptDecoder as any;

function getDraco(path: string) {
    if (!sharedDraco) sharedDraco = new DRACOLoader();
    sharedDraco.setDecoderPath(path.endsWith("/") ? path : path + "/");
    return sharedDraco;
}

/** Extiende GLTFLoader con DRACO + Meshopt (+ KTX2 si está listo). */
function withDecoders(opts: Required<Pick<Options, "dracoPath" | "meshopt">>) {
    return (loader: any) => {
        loader.setDRACOLoader?.(getDraco(opts.dracoPath));

        if (opts.meshopt !== false && typeof loader.setMeshoptDecoder === "function") {
            loader.setMeshoptDecoder(sharedMeshopt);
        }

        // Adjunta KTX2Loader si está listo (idempotente, sin romper si no lo está)
        const ktx2 = getKTX2Optional?.();
        if (typeof loader.setKTX2Loader === "function" && (ktx2 || isKTX2Ready?.())) {
            try { loader.setKTX2Loader(ktx2 ?? getKTX2()); } catch { /* noop */ }
        }
    };
}

/** Hook de carga GLTF con DRACO + Meshopt (+ KTX2 si procede). Soporta Suspense. */
export function useDracoGLTF(url: string, options: Options = {}): GLTFLike {
    // Suspende hasta que KTX2 esté listo, evitando warnings de setKTX2Loader.
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

    // Si llegamos aquí, el recurso ha cargado (desmuta si usas muteDuringLoading).
    try {
        Promise.resolve().then(() => {
            const s = useGameStore.getState();
            if ((s as any).loadingPct !== 100) s.setLoadingPct(100);
        });
    } catch { }

    return gltf;
}

/** Preload con decodificadores listos (evita parones en la 1ª carga). */
(useDracoGLTF as any).preload = (url: string, options: Options = {}) => {
    const dracoPath = options.dracoPath ?? DEFAULT_DRACO_PATH;
    const meshopt = options.meshopt !== false;
    const doPreload = () =>
        (useGLTF as any).preload(url, undefined, undefined, withDecoders({ dracoPath, meshopt }));

    if (!isKTX2Ready?.()) {
        const once = () => { try { doPreload(); } finally { window.removeEventListener("ktx2-ready", once); } };
        window.addEventListener("ktx2-ready", once, { once: true });
        return;
    }
    doPreload();

    try {
        Promise.resolve().then(() => {
            const s = useGameStore.getState();
            if ((s as any).loadingPct !== 100) s.setLoadingPct(100);
        });
    } catch { }
};
