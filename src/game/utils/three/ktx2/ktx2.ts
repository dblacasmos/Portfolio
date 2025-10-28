/* ====================================
   FILE: src/game/utils/three/ktx2.ts
   ==================================== */
import * as THREE from "three";
// Import con extensión .js para bundlers ESM (Vite). El shim de tipos cubre ambas rutas.
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

let _ktx2: KTX2Loader | null = null;
let _basicTL: THREE.TextureLoader | null = null;

/** Llama una vez cuando tengas el WebGLRenderer (Game.tsx onCreated) */
export function initKTX2Loader(renderer: THREE.WebGLRenderer, transcoderPath = "/assets/basis/") {
  if (_ktx2) return _ktx2; // idempotente
  _ktx2 = new KTX2Loader().setTranscoderPath(transcoderPath);
  try { _ktx2.setWorkerLimit?.(1); } catch { }
  _ktx2.detectSupport(renderer);
  _basicTL = new THREE.TextureLoader();
  return _ktx2;
}

/** True si el KTX2Loader ya está inicializado (útil para enchufarlo en GLTFLoader) */
export function isKTX2Ready(): boolean {
  return !!_ktx2;
}

export function getKTX2() {
  if (!_ktx2) throw new Error("KTX2Loader no inicializado. Llama a initKTX2Loader(renderer).");
  return _ktx2;
}

/** Intenta cargar .ktx2 (si existe); si falla, hace fallback a TextureLoader estándar */
export function loadTextureSmart(
  url: string,
  onLoad?: (tex: THREE.Texture) => void,
  onProgress?: (ev: ProgressEvent<EventTarget>) => void,
  onError?: (err?: any) => void
) {
  const tryKTX = url.replace(/\.(png|jpe?g|webp|avif)$/i, ".ktx2");
  const useKTX = tryKTX.endsWith(".ktx2");
  const tl = _basicTL || (_basicTL = new THREE.TextureLoader());

  const fallback = () => tl.load(url, onLoad, onProgress, onError);

  if (!_ktx2 || !useKTX) return fallback();

  // HEAD opcional; si tu server no acepta HEAD, elimina este bloque y llama directamente a load()
  fetch(tryKTX, { method: "HEAD" })
    .then((r) => {
      if (!r.ok) throw 0;
      getKTX2().load(
        tryKTX,
        (t: THREE.CompressedTexture) => onLoad?.(t),
        onProgress,
        () => fallback()
      );
    })
    .catch(() => fallback());
}
