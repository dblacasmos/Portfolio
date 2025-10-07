/* ====================================
   FILE: src/game/layers/World/DomeSky.tsx
   ==================================== */
import * as React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CFG } from "@/constants/config";

type Props = {
    /** Centro XZ del mundo (la cúpula se ancla aquí) */
    center: THREE.Vector2;
    /** Radio horizontal de la cúpula (en X/Z) */
    radius: number;
    /** Altura del suelo (Y en el centro) */
    groundY: number;
    /** Altura visual de la cúpula (escala vertical) */
    height: number;
    /** URL de textura equirectangular opcional (sino, degradado ligero) */
    textureUrl?: string;
    /** Colores fallback cuando no hay textura */
    colorTop?: string;
    colorHorizon?: string;
    /** Generar envMap PMREM desde la textura (⚠️ VRAM). Por defecto desactivado. */
    useEnvMap?: boolean;
    /** Límite de tamaño para la textura (reduce VRAM). */
    maxTextureSize?: number; // p. ej. 2048
    /** Segments de la esfera (más = más suavidad = más VRAM) */
    segments?: { width?: number; height?: number };
};

/**
 * Media cúpula de cielo optimizada:
 * - Hemisphere real (thetaLength = PI/2)
 * - BackSide, sin blending, sin depthWrite (NO tiñe ni tapa edificios)
 * - depthTest apagado → se dibuja primero y los edificios pasan encima
 * - Opción de envMap con PMREM (off por defecto para ahorrar VRAM)
 * - Cap de resolución de textura para evitar VRAM excesiva
 */
export default function DomeSky({
    center,
    radius,
    groundY,
    height,
    textureUrl,
    colorTop = "#0d1b2a",
    colorHorizon = "#1b263b",
    useEnvMap = false,
    maxTextureSize = 2048,
    segments = { width: 56, height: 36 },
}: Props) {
    const meshRef = React.useRef<THREE.Mesh>(null!);
    const matRef = React.useRef<THREE.MeshBasicMaterial>(null!);
    const { gl, scene } = useThree();

    // ------- Geometría hemisférica --------
    // SphereGeometry(radius, widthSeg, heightSeg, phiStart, phiLength, thetaStart, thetaLength)
    // theta 0..π (0 = polo norte). Para media cúpula: 0 .. π/2
    const wSeg = Math.max(8, Math.floor(segments.width ?? 56));
    const hSeg = Math.max(6, Math.floor(segments.height ?? 36));
    const geoArgs = React.useMemo<[number, number, number, number, number, number, number]>(
        () => [radius, wSeg, hSeg, 0, Math.PI * 2, 0, Math.PI / 2],
        [radius, wSeg, hSeg]
    );

    // Escala vertical: adaptamos el “alto” sin mover el borde al suelo
    const yScale = React.useMemo(() => Math.max(0.1, height / Math.max(1, radius)), [height, radius]);

    // ------- Textura SKY (cap VRAM + mipmapping) -------
    const finalUrl = React.useMemo<string | undefined>(() => {
        const cfgUrl =
            (CFG as any)?.dome?.skySource ??
            (CFG as any)?.skySource ??
            (CFG as any)?.sky?.source;
        return textureUrl ?? cfgUrl;
    }, [textureUrl]);

    const [tex, setTex] = React.useState<THREE.Texture | null>(null);

    React.useEffect(() => {
        let alive = true;
        let created: THREE.Texture | null = null;

        const applyTextureTuning = (t: THREE.Texture) => {
            // sRGB para cielos pintados
            (t as any).colorSpace = THREE.SRGBColorSpace;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            t.anisotropy = Math.min(4, (gl.capabilities as any).getMaxAnisotropy?.() ?? 4);
            t.generateMipmaps = true;
            t.wrapS = THREE.ClampToEdgeWrapping;
            t.wrapT = THREE.ClampToEdgeWrapping;
            t.needsUpdate = true;
        };

        // Fallback: degradado ligero en DataTexture (casi gratis en VRAM)
        const makeGradientTexture = () => {
            const size = 128;
            const data = new Uint8Array(size * size * 4);
            const top = new THREE.Color(colorTop);
            const hor = new THREE.Color(colorHorizon);
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = (x / (size - 1)) * 2 - 1;
                    const dy = (y / (size - 1)) * 2 - 1;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    const t = Math.min(1, Math.max(0, r));
                    const c = top.clone().lerp(hor, t);
                    const i = (y * size + x) * 4;
                    data[i] = c.r * 255;
                    data[i + 1] = c.g * 255;
                    data[i + 2] = c.b * 255;
                    data[i + 3] = 255;
                }
            }
            const dt = new THREE.DataTexture(data, size, size);
            (dt as any).colorSpace = THREE.SRGBColorSpace;
            dt.needsUpdate = true;
            return dt;
        };

        if (!finalUrl) {
            const dt = makeGradientTexture();
            created = dt;
            setTex(dt);
            return () => {
                if (!alive) return;
                created?.dispose?.();
            };
        }

        const loader = new THREE.TextureLoader();
        loader.load(
            finalUrl,
            (t) => {
                if (!alive) return;

                // Si la textura es muy grande, la reducimos para ahorrar VRAM
                const img = t.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
                const w = (img as any).width ?? 0;
                const h = (img as any).height ?? 0;

                let useTex: THREE.Texture = t;
                if (w > maxTextureSize || h > maxTextureSize) {
                    const scale = Math.min(maxTextureSize / Math.max(1, w), maxTextureSize / Math.max(1, h));
                    const tw = Math.max(1, Math.floor(w * scale));
                    const th = Math.max(1, Math.floor(h * scale));
                    const canvas = document.createElement("canvas");
                    canvas.width = tw;
                    canvas.height = th;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img as any, 0, 0, tw, th);
                    const ct = new THREE.CanvasTexture(canvas);
                    useTex = ct;
                    // Liberar la textura original del loader (ya no la usamos)
                    t.dispose();
                }

                applyTextureTuning(useTex);
                created = useTex;
                setTex(useTex);
            },
            undefined,
            () => {
                if (!alive) return;
                // Fallback a degradado si falla la carga
                const dt = makeGradientTexture();
                created = dt;
                setTex(dt);
            }
        );

        return () => {
            alive = false;
            created?.dispose?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalUrl, colorTop, colorHorizon, gl, maxTextureSize]);

    // ------- EnvMap opcional via PMREM (desactivado por defecto) -------
    const pmrem = React.useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
    React.useEffect(() => () => pmrem.dispose(), [pmrem]);

    const envRTRef = React.useRef<THREE.WebGLRenderTarget | null>(null);
    React.useEffect(() => {
        if (!useEnvMap || !tex) {
            // limpiar si estaba activo
            if (useEnvMap === false) scene.environment = null;
            envRTRef.current?.dispose?.();
            envRTRef.current = null;
            return;
        }
        // Nota: esto duplica memoria; úsalo solo si es imprescindible en tu lookdev.
        const rt = pmrem.fromEquirectangular(tex);
        envRTRef.current = rt;
        scene.environment = rt.texture;
        return () => {
            envRTRef.current?.dispose?.();
            envRTRef.current = null;
            if (scene.environment === rt.texture) scene.environment = null;
        };
    }, [useEnvMap, tex, pmrem, scene]);

    // ------- Material & Render Order (NO tiñe edificios) -------
    React.useEffect(() => {
        const mesh = meshRef.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;

        // Pintar de los PRIMEROS en el pase WORLD (antes que la City)
        // y sin escribir en el z-buffer → la city se dibuja encima sin bleed.
        mesh.renderOrder = -10000;
        mesh.layers.set(CFG.layers.WORLD);

        mat.side = THREE.BackSide;
        mat.transparent = false;
        mat.depthWrite = false;
        mat.depthTest = false;
        (mat as any).toneMapped = false;
        (mat as any).fog = false;

        if (tex) {
            mat.map = tex;
            mat.color.set(0xffffff);
        } else {
            mat.map = null;
            // un ligero tinte por si no hay textura (ya usamos degradado SRGB)
            mat.color.set(0xffffff);
        }
        mat.needsUpdate = true;
    }, [tex]);

    return (
        <mesh
            ref={meshRef}
            position={[center.x, groundY, center.y]}
            scale={[1, yScale, 1]}
            frustumCulled={false}
        >
            <sphereGeometry args={geoArgs} />
            <meshBasicMaterial ref={matRef} />
        </mesh>
    );
}
