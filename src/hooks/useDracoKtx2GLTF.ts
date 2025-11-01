/*  =============================
    FILE: src/hooks/useDracoGLTF.ts
    ============================= */
import { useGLTF } from "@react-three/drei";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Group } from "three";
import { CFG } from "@/constants/config";
import { isKTX2Ready, getKTX2 } from "@/game/utils/three/ktx2/ktx2";

export type GLTFLike = { scene: Group } & Record<string, any>;

export type Options = {
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

/** Extiende GLTFLoader con DRACO + Meshopt (+KTX2 si está listo) */
function withDecoders(opts: Required<Pick<Options, "dracoPath" | "meshopt">>) {
    return (loader: any) => {
        loader.setDRACOLoader?.(getDraco(opts.dracoPath));
        if (opts.meshopt !== false && typeof loader.setMeshoptDecoder === "function") {
            loader.setMeshoptDecoder(sharedMeshopt);
        }
        if (typeof loader.setKTX2Loader === "function" && isKTX2Ready()) {
            loader.setKTX2Loader(getKTX2());
        }
    };
}

// ===== Tipado del "hook-función" con método estático preload =====
export interface UseDracoGLTFFn {
    (url: string, options?: Options): GLTFLike;
    preload: (url: string, options?: Options) => void;
}

// Implementación real
const _useDracoImpl = (url: string, options: Options = {}): GLTFLike => {
    const dracoPath = options.dracoPath ?? DEFAULT_DRACO_PATH;
    const meshopt = options.meshopt !== false;
    const gltf = useGLTF(
        url,
        undefined,
        undefined,
        withDecoders({ dracoPath, meshopt })
    ) as unknown as GLTFLike;
    return gltf;
};

const _preload = (url: string, options: Options = {}) => {
    const dracoPath = options.dracoPath ?? DEFAULT_DRACO_PATH;
    const meshopt = options.meshopt !== false;
    (useGLTF as any).preload(
        url,
        undefined,
        undefined,
        withDecoders({ dracoPath, meshopt })
    );
};

export const useDracoGLTF: UseDracoGLTFFn = Object.assign(_useDracoImpl, { preload: _preload });
export default useDracoGLTF;
