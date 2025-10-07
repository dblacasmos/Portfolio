/* =========================================================
  FILE: src/game/layers/World/EndDoor.tsx
  - Reproduce 1 vez el vídeo completo
  - Captura los últimos N segundos en memoria (frames)
  - Bucle PERFECTO de ese tramo vía CanvasTexture (sin saltos)
  - Chroma key azul en shader
============================================================ */
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CFG } from "../../../constants/config";
import { ASSETS } from "@/constants/assets";
import { setLayerRecursive } from "../../utils/three/layers";
import { audioManager } from "../../utils/audio/audio";

type EndDoorProps = {
    center: THREE.Vector2;
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    groundY: number;
    url?: string;
    width?: number;
    minHeight?: number;
    heightAboveGround?: number;
    layer?: number;
};

const FALLBACK_URL = "/assets/video/endDoor.mp4";

export default function EndDoor({
    center,
    position,
    lookAt,
    groundY,
    url,
    width = (CFG as any)?.endDoor?.width ?? 2.6,
    minHeight = (CFG as any)?.endDoor?.minHeight ?? 0.9,
    heightAboveGround = (CFG as any)?.endDoor?.heightAboveGround ?? 0.5,
    layer = CFG.layers.WORLD,
    // notificar el mesh al exterior (Radar fallback)
    onReady,
}: EndDoorProps & { onReady?: (mesh: THREE.Object3D) => void }) {
    const groupRef = useRef<THREE.Group>(null!);
    const meshRef = useRef<THREE.Mesh>(null!);
    const { gl } = useThree();

    // URL del vídeo
    const videoUrl = useMemo(() => {
        const cfgUrl = (CFG as any)?.endDoor?.url as string | undefined;
        const fromAssets =
            (ASSETS?.video?.endDoor as string | undefined) ??
            (ASSETS as any)?.video?.endDoor;
        return url ?? cfgUrl ?? fromAssets ?? FALLBACK_URL;
    }, [url]);

    // Parámetros del bucle perfecto
    const tailSeconds = Math.max(0.25, (CFG as any)?.endDoor?.tailSeconds ?? 2.0);
    const tailFps = Math.max(8, Math.min(60, (CFG as any)?.endDoor?.tailFps ?? 30));

    /* ------------------ Fase 1: reproducir vídeo y capturar cola ------------------ */
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [aspect, setAspect] = useState(16 / 9);

    // Textura activa en el shader (al principio: VideoTexture; después: CanvasTexture)
    const activeTexRef = useRef<THREE.Texture | null>(null);

    // VideoTexture (fase 1)
    const [videoTex, setVideoTex] = useState<THREE.VideoTexture | null>(null);

    // Canvas para reproducir el bucle perfecto (fase 2)
    const playCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasTex, setCanvasTex] = useState<THREE.CanvasTexture | null>(null);

    // Buffer de frames capturados
    const framesRef = useRef<ImageBitmap[]>([]);
    const loopRafRef = useRef<number | null>(null);
    const bufferReadyRef = useRef(false);
    const loopStartPerfRef = useRef(0);

    // Handle de audio (portal loop)
    const portalStopRef = useRef<null | (() => void)>(null);

    // Intenta leer el mismo volumen que explosionDron desde varias rutas comunes;
    // permite override por CFG.endDoor.portalVolume.
    const getExplosionDronVolume = () => {
        const cfg = (CFG as any);
        const fromEndDoor = cfg?.endDoor?.portalVolume;
        if (typeof fromEndDoor === "number") return Math.max(0, Math.min(1, fromEndDoor));
        const fromAudio1 = cfg?.audio?.explosionDronVolume;
        const fromAudio2 = cfg?.audio?.sfx?.explosionDronVolume;
        const fromAudio3 = cfg?.audio?.volumes?.explosionDron;
        const v = [fromAudio1, fromAudio2, fromAudio3].find((x) => typeof x === "number");
        return typeof v === "number" ? Math.max(0, Math.min(1, v as number)) : 0.9; // fallback razonable
    };

    // Reproduce y gestiona el bucle del sonido del portal
    useEffect(() => {
        // Arranca al montar el componente (EndDoor activa)
        let stopped = false;
        const vol = getExplosionDronVolume();
        try {
            // Preferimos el audioManager (maneja WebAudio/gain, etc.)
            // Implementaciones comunes aceptan { loop: true } o devuelven un handle con stop()
            const maybeHandle: any = (audioManager as any)?.playSfx?.(ASSETS.audio.portal, vol, { loop: true });
            if (maybeHandle && typeof maybeHandle.stop === "function") {
                portalStopRef.current = () => { if (!stopped) { stopped = true; maybeHandle.stop(); } };
            } else {
                // Fallback manual con <audio> si no hay soporte de loop en playSfx
                const el = new Audio(ASSETS.audio.portal as string);
                el.loop = true;
                el.volume = vol;
                el.crossOrigin = "anonymous";
                el.play().catch(() => { });
                portalStopRef.current = () => { if (!stopped) { stopped = true; try { el.pause(); el.src = ""; } catch { } } };
            }
        } catch {
            portalStopRef.current = () => { stopped = true; };
        }

        // Parar al recibir el evento de entrada a la puerta (antes de redirigir)
        const onEntered = () => { try { portalStopRef.current?.(); } catch { } };
        window.addEventListener("enddoor-entered", onEntered as any);

        return () => {
            window.removeEventListener("enddoor-entered", onEntered as any);
            try { portalStopRef.current?.(); } catch { }
            portalStopRef.current = null;
        };
    }, []);

    useEffect(() => {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.loop = false;          // primera reproducción ÚNICA
        video.muted = true;
        video.playsInline = true;
        // Evita reservar red/memoria de más: sólo metadatos hasta que arranque.
        video.preload = "metadata";
        videoRef.current = video;

        // Delay de arranque (ms) para el primer play
        const startDelayMs = Math.max(0, (CFG as any)?.endDoor?.startDelayMs ?? 2000);
        let startTimer: number | null = null;

        // Crea VideoTexture para la fase 1
        const vt = new THREE.VideoTexture(video);
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.generateMipmaps = false;
        (vt as any).colorSpace = THREE.SRGBColorSpace;
        setVideoTex(vt);
        activeTexRef.current = vt;

        const onLoadedMeta = () => {
            const a =
                video.videoWidth > 0 && video.videoHeight > 0
                    ? video.videoWidth / video.videoHeight
                    : 16 / 9;
            setAspect(a);
        };

        // Captura de los últimos N segundos
        let captureRunning = false;
        let captureRaf: number | null = null;
        const captureCanvas = document.createElement("canvas");
        const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: false })!;
        const startCapture = () => {
            if (captureRunning) return;
            captureRunning = true;

            const W = video.videoWidth || 1280;
            const H = video.videoHeight || 720;
            captureCanvas.width = W;
            captureCanvas.height = H;

            const frames: ImageBitmap[] = [];
            framesRef.current = frames;

            // target intervalo entre frames
            const frameDt = 1000 / tailFps;
            let lastMs = performance.now();

            const pump = () => {
                if (!captureRunning) return;
                const now = performance.now();
                if (now - lastMs >= frameDt - 1) {
                    // dibuja frame actual del vídeo a canvas y almacena ImageBitmap
                    try {
                        captureCtx.drawImage(video, 0, 0, W, H);
                        // crear bitmap (más eficiente que ImageData)
                        // @ts-ignore
                        const toBitmap = (window as any).createImageBitmap || window.createImageBitmap;
                        if (toBitmap) {
                            toBitmap(captureCanvas).then((bmp: ImageBitmap) => {
                                frames.push(bmp);
                            }).catch(() => { /* ignore */ });
                        }
                    } catch { /* ignore draw errors during seek */ }
                    lastMs = now;
                }
                captureRaf = requestAnimationFrame(pump);
            };
            pump();
        };

        const stopCapture = () => {
            captureRunning = false;
            if (captureRaf) cancelAnimationFrame(captureRaf);
            captureRaf = null;
        };

        const onTimeUpdate = () => {
            const dur = video.duration || 0;
            if (!dur || bufferReadyRef.current) return;
            // inicia captura cuando entras en la ventana de cola
            if (video.currentTime >= Math.max(0, dur - tailSeconds - 0.05)) {
                startCapture();
            }
        };

        const onEnded = async () => {
            stopCapture();

            // Recorta a máximo los últimos N segundos en frames (por si arrancó un poco antes)
            const maxFrames = Math.max(1, Math.round(tailSeconds * tailFps));
            const frames = framesRef.current;
            // Si capturó más, nos quedamos con los últimos
            if (frames.length > maxFrames) {
                framesRef.current = frames.slice(frames.length - maxFrames);
                // libera bitmaps antiguos
                frames.slice(0, frames.length - maxFrames).forEach((b) => b.close?.());
            }
            bufferReadyRef.current = true;

            // Prepara CanvasTexture para reproducción sin saltos
            const W = video.videoWidth || 1280;
            const H = video.videoHeight || 720;
            const playCanvas = document.createElement("canvas");
            playCanvas.width = W;
            playCanvas.height = H;
            playCanvasRef.current = playCanvas;

            const ct = new THREE.CanvasTexture(playCanvas);
            ct.minFilter = THREE.LinearFilter;
            ct.magFilter = THREE.LinearFilter;
            ct.generateMipmaps = false;
            (ct as any).colorSpace = THREE.SRGBColorSpace;
            setCanvasTex(ct);

            // Cambia a CanvasTexture en el shader
            activeTexRef.current = ct;

            // Detén el vídeo y libera recursos
            try { video.pause(); } catch { }
            // no borres de inmediato el src para no vaciar el último frame antes del swap
            setTimeout(() => { try { video.src = ""; video.load(); } catch { } }, 0);

            // Arranca el bucle perfecto
            const ctx = playCanvas.getContext("2d")!;
            const seq = framesRef.current;
            const N = Math.max(1, seq.length);
            loopStartPerfRef.current = performance.now();

            const loop = () => {
                const now = performance.now();
                const elapsed = now - loopStartPerfRef.current; // ms
                const idx = Math.floor((elapsed / 1000) * tailFps) % N;
                const bmp = seq[idx];
                if (bmp) {
                    try {
                        // limpia y pinta el bitmap actual
                        ctx.clearRect(0, 0, playCanvas.width, playCanvas.height);
                        // drawImage(ImageBitmap) es muy barato
                        // @ts-ignore
                        ctx.drawImage(bmp, 0, 0, playCanvas.width, playCanvas.height);
                        ct.needsUpdate = true;
                    } catch { /* ignore */ }
                }
                loopRafRef.current = requestAnimationFrame(loop);
            };
            loop();
        };

        video.addEventListener("loadedmetadata", onLoadedMeta);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);

        // inicia reproducción
        void video.play().catch(() => { });

        return () => {
            video.removeEventListener("loadedmetadata", onLoadedMeta);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("ended", onEnded);

            if (loopRafRef.current) cancelAnimationFrame(loopRafRef.current);

            // libera frames capturados
            framesRef.current.forEach((b) => b.close?.());
            framesRef.current = [];

            try { video.pause(); } catch { }
            try { video.src = ""; video.load(); } catch { }

            videoTex?.dispose();
            canvasTex?.dispose();
            videoRef.current = null;
            activeTexRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoUrl, tailSeconds, tailFps]);

    // Cambia el sampler del shader según la textura activa
    useEffect(() => {
        const tex = activeTexRef.current;
        if (!tex) return;
        if (matRef.current) {
            (matRef.current.uniforms.uMap as any).value = tex;
            matRef.current.needsUpdate = true;
        }
    }, [videoTex, canvasTex]);

    // Tamaño del plano
    const planeW = width;
    const planeH = Math.max(minHeight, width / Math.max(0.0001, aspect));

    /* ------------------ Shader CHROMA KEY (azul) ------------------ */
    const matRef = useRef<THREE.ShaderMaterial>(null!);
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            uniforms: {
                uMap: { value: null as any }, // se rellena en runtime con activeTexRef
                uKeyColor: { value: new THREE.Color((CFG as any)?.endDoor?.key?.color ?? "#0b198c") },
                uTolerance: { value: (CFG as any)?.endDoor?.key?.tolerance ?? 0.35 },
                uSmooth: { value: (CFG as any)?.endDoor?.key?.smooth ?? 0.12 },
                uDespill: { value: (CFG as any)?.endDoor?.key?.despill ?? 0.35 },
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uMap;
        uniform vec3 uKeyColor;
        uniform float uTolerance, uSmooth, uDespill;

        float colorDist(vec3 a, vec3 b){ vec3 d=a-b; return sqrt(dot(d,d)); }

        void main(){
          vec4 c = texture2D(uMap, vUv);
          float d = colorDist(c.rgb, uKeyColor);
          float keep = smoothstep(uTolerance - uSmooth, uTolerance + uSmooth, d);

          // Despill azul
          vec3 keyN = normalize(uKeyColor + 1e-6);
          float spill = (1.0 - keep) * uDespill;
          vec3 rgb = mix(c.rgb, c.rgb - keyN * spill, spill);

          gl_FragColor = vec4(rgb, keep);
          if (gl_FragColor.a <= 0.01) discard;
        }
      `,
            toneMapped: false as any,
        });
    }, []);

    useEffect(() => { matRef.current = material; }, [material]);

    /* ------------------ Colocación/orientación ------------------ */
    useEffect(() => {
        const g = groupRef.current;
        if (!g) return;

        g.layers.set(layer);
        setLayerRecursive(g, layer);

        // DEV: forzar visible si se desea (útil para ajustar sin gameplay)
        const devForce = Boolean((CFG as any)?.endDoor?.devForceVisible);
        if (devForce) {
            try {
                g.visible = true;
                g.traverse?.((n: any) => n.visible = true);
            } catch { }
        }

        const y = Math.max(position.y, groundY + heightAboveGround);
        g.position.set(position.x, y, position.z);

        g.lookAt(lookAt);
        g.updateMatrixWorld();

        // 🔗 Exponer el mesh para que el Radar pueda leerlo si no recibe getEndDoorMesh
        try {
            onReady?.(meshRef.current);
            (window as any).__endDoorMesh = meshRef.current;
            (window as any).__endDoorGroup = groupRef.current;
        } catch { }

        return () => {
            try {
                if ((window as any).__endDoorMesh === meshRef.current) {
                    delete (window as any).__endDoorMesh;
                }
                if ((window as any).__endDoorGroup === groupRef.current) {
                    delete (window as any).__endDoorGroup;
                }
            } catch { }
        };
    }, [position, lookAt, groundY, heightAboveGround, layer, onReady]);

    // Asegurar flags del material
    useEffect(() => {
        const m = meshRef.current?.material as THREE.ShaderMaterial | undefined;
        if (!m) return;
        (m as any).toneMapped = false;
        m.needsUpdate = true;
    }, [gl]);

    return (
        <group ref={groupRef}>
            <mesh
                ref={meshRef}
                frustumCulled={false}
                renderOrder={1500}
                onUpdate={(o) => o.layers.set(layer)}
            >
                <planeGeometry args={[planeW, planeH]} />
                <primitive attach="material" object={material} />
            </mesh>
        </group>
    );
}
