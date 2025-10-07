/* ====================================
   FILE: src/game/utils/video/VideoPlane.tsx
   ==================================== */

import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { QUALITY } from "@/game/utils/quality";
import { pickVideoSrc, type SrcMap } from "@/game/utils/video/selectVideoSource";

export type VideoPlaneProps = {
    /** Mapa de resoluciones disponibles. Al menos una URL. */
    srcSet: SrcMap;
    loop?: boolean;
    muted?: boolean;
    autoplay?: boolean;

    /** Ancho en unidades del plano. Altura = width / aspect. */
    width?: number;
    /** Aspect ratio (w/h). Por defecto 16/9. */
    aspect?: number;

    /** Transform opcional */
    position?: THREE.Vector3 | [number, number, number];
    rotation?: THREE.Euler | [number, number, number];
    scale?: number | [number, number, number];

    /** Orden de render y culling */
    renderOrder?: number;
    frustumCulled?: boolean;

    /** Callback cuando el vídeo y la textura están listos */
    onReady?: (videoEl: HTMLVideoElement, texture: THREE.VideoTexture) => void;
};

export const VideoPlane: React.FC<VideoPlaneProps> = ({
    srcSet,
    loop,
    muted,
    autoplay = true,
    width = 2,
    aspect = 16 / 9,
    position,
    rotation,
    scale,
    renderOrder,
    frustumCulled = true,
    onReady,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const texRef = useRef<THREE.VideoTexture | null>(null);

    // Obtiene las prefs del preset actual. Si no existe bandera global, usa "medium".
    const presetKey = (typeof window !== "undefined" && (window as any).__QUALITY__) || "medium";
    const pref = QUALITY[presetKey as keyof typeof QUALITY]?.video ?? QUALITY.medium.video;

    // Elige la URL de vídeo según el preset.
    const chosen = useMemo(() => {
        return pickVideoSrc(srcSet, { ...pref });
    }, [srcSet, pref]);

    // Crea y gestiona <video> + VideoTexture
    useEffect(() => {
        // Limpia recursos previos si los hubiera
        const disposePrev = () => {
            try {
                texRef.current?.dispose();
            } catch { }
            texRef.current = null;

            const v = videoRef.current;
            if (v) {
                try { v.pause(); } catch { }
                try { (v as any).src = ""; v.load(); } catch { }
            }
            videoRef.current = null;
        };

        disposePrev();

        const video = Object.assign(document.createElement("video"), {
            src: chosen,
            crossOrigin: "anonymous",
            loop: !!loop,
            muted: !!muted,
            playsInline: true,
            preload: "auto",
        }) as HTMLVideoElement;

        videoRef.current = video;

        const tex = new THREE.VideoTexture(video);
        tex.generateMipmaps = false; // ✅ menos VRAM y mejor rendimiento en vídeo
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        // Color space sRGB para vídeos SDR (visualmente correcto en UI/overlays)
        (tex as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;

        texRef.current = tex;

        const handleCanPlay = () => {
            onReady?.(video, tex);
            if (autoplay) {
                video.play().catch(() => {
                    /* en móvil puede requerir gesto del usuario */
                });
            }
        };

        video.addEventListener("canplay", handleCanPlay, { once: true });

        return () => {
            video.removeEventListener("canplay", handleCanPlay);
            disposePrev();
        };
    }, [chosen, loop, muted, autoplay, onReady]);

    const w = width;
    const h = Math.max(0.0001, width / Math.max(0.0001, aspect)); // evita degenerate geometry

    return (
        <mesh
            ref={meshRef}
            position={position as any}
            rotation={rotation as any}
            scale={scale as any}
            renderOrder={renderOrder}
            frustumCulled={frustumCulled}
        >
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial
                attach="material"
                map={texRef.current ?? undefined}
                toneMapped={false}
                transparent={false}
            />
        </mesh>
    );
};

export default VideoPlane;
