import React, { useLayoutEffect, useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";

type Props = {
    mag: number;                          // balas en cargador
    magSize?: number;                     // capacidad del cargador
    reserve: number;                      // balas en reserva
    reloading: boolean;                   // estado de recarga (solo anim visual)
    position: [number, number, number];   // posición HUD (m)
    size?: number;                        // ancho panel (m)
    rotation?: [number, number, number];  // rotación del plano
    uiScale?: number;                     // nitidez interna
    stretchX?: number;                    // estirar en X (1 = original)
};

const C_CYAN = CFG.hud.colors.neonCyan;
const C_RED = CFG.hud.colors.dangerRed;
const C_ORANGE = "#ff8a00";

/** LERP de color hex sencillo */
function lerpHex(a: string, b: string, t: number) {
    const ah = a.replace("#", ""), bh = b.replace("#", "");
    const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
    const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
    const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
    const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
    const b2 = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
    return `#${r}${g}${b2}`;
}

/** rampa 3 puntos: rojo -> naranja -> cian */
function rampAmmoColor(frac01: number) {
    const t = Math.max(0, Math.min(1, frac01));
    if (t < 0.5) return lerpHex(C_RED, C_ORANGE, t / 0.5);
    return lerpHex(C_ORANGE, C_CYAN, (t - 0.5) / 0.5);
}

export function AmmoBar({
    mag,
    magSize = CFG.reload.clipSize,
    reserve,
    reloading,
    position,
    size = CFG.hud.ammo.size,
    rotation = [Math.PI, 0, 0],
    uiScale = 1,
    stretchX = CFG.hud.ammo.stretchX,
}: Props) {
    const DPR = Math.min(CFG.hud.ui.dprMax, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const aspect = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 16 / 9;
    const responsiveScale = CFG.hud.ui.scaleForAspect(aspect);

    // === Overlay procedural (scanlines + sweep + pulsos) ===
    const overlayRef = useRef<THREE.ShaderMaterial | null>(null);
    const overlayColor = useRef(new THREE.Color(C_CYAN));
    const critical = (mag / Math.max(1, magSize)) < 0.2;

    useFrame((_, dt) => {
        if (!overlayRef.current) return;
        (overlayRef.current.uniforms.uTime.value as number) += dt;
        (overlayRef.current.uniforms.uReload.value as number) = reloading ? 1 : 0;
        (overlayRef.current.uniforms.uCrit.value as number) = critical ? 1 : 0;
        // El color se sincroniza cuando cambian cantidades (useLayoutEffect de draw).
    });

    const { map, glowMap, planeSize, draw } = useMemo(() => {
        const K = uiScale;
        const [W0, H0] = CFG.hud.ammo.canvasPx;
        const W = Math.round(W0 * K);
        const H = Math.round(H0 * K);
        const sx = (n: number) => n * K * stretchX;
        const sy = (n: number) => n * K;

        const planeSize: [number, number] = [size * responsiveScale, size * responsiveScale * (H0 / W0)];

        // Canvas base
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        const ctx = canvas.getContext("2d")!;
        ctx.scale(DPR, DPR);
        ctx.imageSmoothingEnabled = true;

        // Canvas de glow (menos resolución = ahorra VRAM)
        const glowCanvas = document.createElement("canvas");
        const GDR = Math.max(1, Math.round(DPR * 0.6));
        glowCanvas.width = Math.round(W * GDR);
        glowCanvas.height = Math.round(H * GDR);
        const gctx = glowCanvas.getContext("2d")!;
        gctx.scale(GDR, GDR);
        gctx.imageSmoothingEnabled = true;

        // Texturas
        const tex = new THREE.CanvasTexture(canvas);
        tex.flipY = false;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false; (tex as any).colorSpace = THREE.SRGBColorSpace;

        const glowTex = new THREE.CanvasTexture(glowCanvas);
        glowTex.flipY = false;
        glowTex.wrapS = THREE.ClampToEdgeWrapping;
        glowTex.wrapT = THREE.ClampToEdgeWrapping;
        glowTex.minFilter = THREE.LinearFilter; glowTex.magFilter = THREE.LinearFilter;
        glowTex.generateMipmaps = false; (glowTex as any).colorSpace = THREE.SRGBColorSpace;

        // Grosores
        const SW = CFG.hud.ammo.stroke * K;
        const GLOW = CFG.hud.ammo.glow * K;

        const stroke = (path: Path2D, color: string, sw = SW, glow = GLOW) => {
            ctx.save();
            ctx.shadowColor = color; ctx.shadowBlur = glow;
            ctx.lineWidth = sw; ctx.strokeStyle = color;
            ctx.stroke(path);
            ctx.restore();
        };

        // Emisión en canvas glow
        const glowFill = (path: Path2D, color: string, blur = 22 * K, alpha = 0.65) => {
            gctx.save();
            gctx.globalAlpha = alpha;
            gctx.shadowColor = color;
            gctx.shadowBlur = blur;
            gctx.fillStyle = color;
            gctx.fill(path);
            gctx.restore();
        };
        const glowStroke = (path: Path2D, color: string, sw = SW * 0.6, blur = 16 * K, alpha = 0.55) => {
            gctx.save();
            gctx.globalAlpha = alpha;
            gctx.shadowColor = color;
            gctx.shadowBlur = blur;
            gctx.lineWidth = sw;
            gctx.strokeStyle = color;
            gctx.stroke(path);
            gctx.restore();
        };

        function draw(m: number, mSize: number, r: number) {
            const W = Math.round(W0 * K);
            const H = Math.round(H0 * K);
            ctx.clearRect(0, 0, W, H);
            gctx.clearRect(0, 0, W, H);

            // Color dinámico (rojo→naranja→cian)
            const frac = Math.max(0, Math.min(1, mSize ? m / mSize : 0));
            const color = rampAmmoColor(frac);

            // Triángulo izquierdo (placa)
            const tri = new Path2D();
            tri.moveTo(sx(12), sy(186));
            tri.lineTo(sx(148), sy(40));
            tri.lineTo(sx(284), sy(186));
            tri.closePath();

            ctx.save();
            ctx.shadowColor = color; ctx.shadowBlur = 26 * K;
            ctx.fillStyle = color; ctx.fill(tri);
            ctx.restore();
            stroke(tri, color);
            glowFill(tri, color);

            // Texto mag/total
            const total = m + r;
            const label = `${m}/${total}`;
            const cx = (sx(12) + sx(148) + sx(284)) / 3;
            const cy = (sy(186) + sy(40) + sy(186)) / 3 + sy(6);

            ctx.save();
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = `900 ${CFG.hud.ammo.fontMagLabelPx * K}px ui-monospace, SFMono-Regular, Menlo, Monaco`;
            ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, Math.round(2 * K));
            ctx.strokeText(label, cx, cy);
            ctx.shadowColor = color; ctx.shadowBlur = 14 * K;
            ctx.fillStyle = "#000"; ctx.fillText(label, cx, cy);
            ctx.restore();

            // Emisión del texto
            gctx.save();
            gctx.globalAlpha = 0.35;
            gctx.shadowColor = color; gctx.shadowBlur = 10 * K;
            gctx.font = `900 ${CFG.hud.ammo.fontMagLabelPx * K}px ui-monospace, SFMono-Regular, Menlo, Monaco`;
            gctx.textAlign = "center"; gctx.textBaseline = "middle";
            gctx.fillStyle = color;
            gctx.fillText(label, cx, cy);
            gctx.restore();

            // Superior
            const top = new Path2D();
            top.moveTo(sx(170), sy(44));
            top.lineTo(sx(368), sy(44));
            top.lineTo(sx(388), sy(62));
            top.lineTo(sx(676), sy(62));
            top.lineTo(sx(720), sy(110));
            top.lineTo(sx(268), sy(110));
            top.lineTo(sx(246), sy(88));
            top.lineTo(sx(210), sy(88));
            top.closePath();
            ctx.fillStyle = color; ctx.fill(top); stroke(top, color);
            glowFill(top, color, 18 * K, 0.5);

            // Barra inferior (pista)
            const bottom = new Path2D();
            bottom.moveTo(sx(277), sy(126));
            bottom.lineTo(sx(730), sy(126));
            bottom.lineTo(sx(790), sy(188));
            bottom.lineTo(sx(300), sy(188));
            bottom.lineTo(sx(282), sy(168));
            bottom.lineTo(sx(240), sy(126));
            bottom.closePath();
            stroke(bottom, color);
            ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(bottom); ctx.restore();

            // Segmentos
            const pad = sx(10);
            const x0 = sx(316), x1 = sx(746);
            const y0 = sy(146), y1 = sy(170);
            const usableW = x1 - x0 - pad;
            const segW = usableW / Math.max(1, mSize);
            const skew = sx(-14);

            for (let i = 0; i < mSize; i++) {
                const x = x0 + i * segW;
                const seg = new Path2D();
                seg.moveTo(x + skew, y0);
                seg.lineTo(x + segW - pad + skew, y0);
                seg.lineTo(x + segW - pad - skew, y1);
                seg.lineTo(x - skew, y1);
                seg.closePath();

                if (i < m) {
                    ctx.save();
                    ctx.shadowColor = color; ctx.shadowBlur = 12 * K;
                    ctx.fillStyle = color; ctx.fill(seg);
                    ctx.restore();

                    ctx.save(); ctx.lineWidth = Math.max(1, SW * 0.6); ctx.strokeStyle = color; ctx.stroke(seg); ctx.restore();

                    glowFill(seg, color, 14 * K, 0.5);
                    glowStroke(seg, color, SW * 0.5, 10 * K, 0.35);
                } else {
                    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(seg); ctx.restore();
                    ctx.save(); ctx.lineWidth = 1.4 * K; ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.stroke(seg); ctx.restore();
                }
            }

            // Señal crítica
            if (frac < 0.2) {
                const chevron = new Path2D();
                chevron.moveTo(x0 - sx(18), y0);
                chevron.lineTo(x0 - sx(4), (y0 + y1) / 2);
                chevron.lineTo(x0 - sx(18), y1);
                chevron.closePath();
                stroke(chevron, color, SW * 0.8, GLOW * 1.2);
                glowFill(chevron, color, 24 * K, 0.7);
            }

            (tex as any).needsUpdate = true;
            (glowTex as any).needsUpdate = true;

            return color; // devuelvo color actual para overlay procedural
        }

        return { map: tex, glowMap: glowTex, planeSize, draw };
    }, [DPR, size, uiScale, stretchX, responsiveScale]);

    // Primer pintado + redibujos
    useLayoutEffect(() => {
        const c = (draw as any)(mag, magSize, reserve) as string | void;
        if (typeof c === "string") overlayColor.current.set(c);
    }, [mag, magSize, reserve, draw]);

    // Limpieza de texturas en un único efecto
    useEffect(() => {
        return () => {
            try { map?.dispose(); } catch { }
            try { glowMap?.dispose(); } catch { }
        };
    }, [map, glowMap]);

    // === Overlay procedural ===
    const overlayVS = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
    const overlayFS = /* glsl */`
    precision highp float;
    varying vec2 vUv;

    uniform float uTime;
    uniform vec3  uColor;
    uniform float uCrit;   // 1 si crítico
    uniform float uReload; // 1 si recargando

    float scan(vec2 uv){
      float l = abs(fract(uv.y*160.0 + uTime*0.35) - 0.5);
      return smoothstep(0.48, 0.5, l);
    }
    float sweep(vec2 uv){
      float d = fract((uv.x+uv.y)*0.75 + uTime*0.6);
      return smoothstep(0.80, 0.98, d);
    }

    void main(){
      float s = (1.0 - scan(vUv)) * 0.08;
      float w = sweep(vUv) * 0.12;

      float crit = uCrit * (0.08 + 0.07 * (0.5 + 0.5 * sin(uTime * 8.0)));
      float reload = uReload * (0.06 + 0.05 * (0.5 + 0.5 * sin(uTime * 12.0)));

      float a = s + w + crit + reload;
      gl_FragColor = vec4(uColor * a, a);
    }
  `;

    const overlayMat = useMemo(() => new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: overlayVS,
        fragmentShader: overlayFS,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: overlayColor.current.clone() },
            uCrit: { value: critical ? 1 : 0 },
            uReload: { value: reloading ? 1 : 0 },
        }
    }), []); // instanciado una vez

    // Sync color overlay al redibujar
    useLayoutEffect(() => {
        (overlayMat.uniforms.uColor.value as THREE.Color).copy(overlayColor.current);
    }, [overlayMat, mag, magSize, reserve]);

    return (
        <>
            {/* Base */}
            <mesh
                position={position}
                rotation={rotation}
                frustumCulled={false}
                renderOrder={20000}
                onUpdate={(o) => o.layers.set(CFG.layers.HUD)}
            >
                <planeGeometry args={planeSize} />
                <meshBasicMaterial
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                    map={map}
                    opacity={1}
                />
            </mesh>

            {/* Emisión (glow) */}
            <mesh
                position={position}
                rotation={rotation}
                frustumCulled={false}
                renderOrder={20001}
                onUpdate={(o) => o.layers.set(CFG.layers.HUD)}
            >
                <planeGeometry args={planeSize} />
                <meshBasicMaterial
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                    map={glowMap}
                    blending={THREE.AdditiveBlending}
                    opacity={0.9}
                />
            </mesh>

            {/* Overlay procedural */}
            <mesh
                position={position}
                rotation={rotation}
                frustumCulled={false}
                renderOrder={20002}
                onUpdate={(o) => o.layers.set(CFG.layers.HUD)}
            >
                <planeGeometry args={planeSize} />
                <shaderMaterial ref={overlayRef as any} args={[overlayMat]} />
            </mesh>
        </>
    );
}

export default AmmoBar;
