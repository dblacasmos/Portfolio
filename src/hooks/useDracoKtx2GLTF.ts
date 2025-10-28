/*  =============================
    FILE: src/hooks/useDracoGLTF.ts
    ============================= */
import { useGLTF } from "@react-three/drei";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Group } from "three";
import { CFG } from "@/constants/config";
import { isKTX2Ready, getKTX2 } from "@/game/utils/three/ktx2/ktx2";

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
         // Si KTX2 ya fue inicializado en Game.tsx, enchúfalo al GLTFLoader.
        if (typeof loader.setKTX2Loader === "function" && isKTX2Ready()) {
            loader.setKTX2Loader(getKTX2());
        }
    };
}

/** Hook de carga GLTF con DRACO + Meshopt */
export function useDracoGLTF(url: string, options: Options = {}): GLTFLike {
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

    (useGLTF as any).preload(
        url,
        undefined,
        undefined,
        withDecoders({ dracoPath, meshopt })
    );
};
