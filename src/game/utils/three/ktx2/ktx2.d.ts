// src/game/utils/three/ktx2/ktx2.d.ts
// Tipos mínimos para KTX2Loader tanto con y sin extensión ".js"
declare module 'three/examples/jsm/loaders/KTX2Loader' {
    import type { Loader, LoadingManager, CompressedTexture, WebGLRenderer } from 'three';
    export class KTX2Loader extends Loader {
        constructor(manager?: LoadingManager);
        setTranscoderPath(path: string): this;
        setWorkerLimit(limit: number): this;
        detectSupport(renderer: WebGLRenderer): this;
        load(
            url: string,
            onLoad: (texture: CompressedTexture) => void,
            onProgress?: (event: ProgressEvent<EventTarget>) => void,
            onError?: (err?: unknown) => void
        ): void;
    }
}

declare module 'three/examples/jsm/loaders/KTX2Loader.js' {
    import type { Loader, LoadingManager, CompressedTexture, WebGLRenderer } from 'three';
    export class KTX2Loader extends Loader {
        constructor(manager?: LoadingManager);
        setTranscoderPath(path: string): this;
        setWorkerLimit(limit: number): this;
        detectSupport(renderer: WebGLRenderer): this;
        load(
            url: string,
            onLoad: (texture: CompressedTexture) => void,
            onProgress?: (event: ProgressEvent<EventTarget>) => void,
            onError?: (err?: unknown) => void
        ): void;
    }
}
