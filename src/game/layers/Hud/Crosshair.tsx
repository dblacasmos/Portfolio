import React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";

type Props = {
    position?: [number, number, number];
    /** Escala extra opcional (además de CFG.hud.crosshair.size) */
    scale?: number;
    /** 0..1 intensidad de separación de la cruz (recoil/spread). */
    spread?: number;
    /** 0..1 nivel de zoom (ADS). */
    zoom?: number;
    /** Si el raycast topa con enemigo (tinta roja). */
    overTarget?: boolean;
    /** Rumbo del jugador en radianes (para el overlay N/E/S/O). */
    headingRad?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Dibuja el crosshair en un canvas (una textura) para ahorrar drawcalls.
 * Nota: eliminé utilidades duplicadas no usadas (p. ej. lerpHex).
 */
function drawCrosshairToCanvas(
    canvas: HTMLCanvasElement,
    tSec: number,
    opts: {
        spread: number;
        zoom: number;
        overTarget: boolean;
        headingRad: number;
        cfg: any;
    }
) {
    const { spread, zoom, overTarget, headingRad, cfg } = opts;

    // No cambiar tamaño aquí: provoca re-subida incompatible
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.47;

    // Paleta coherente con el HUD
    const C_CYAN = cfg.color ?? (CFG.hud?.colors?.neonCyan ?? "#22D3EE");
    const C_RED = CFG.hud?.colors?.dangerRed ?? "#ff3b3b";
    const color = overTarget ? C_RED : C_CYAN;

    const glow = Math.max(0, cfg.glow ?? 14);

    // Aros
    const ring = (r: number, w: number, a = 1) => {
        ctx.save();
        ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = w;
        (ctx as any).shadowColor = color; (ctx as any).shadowBlur = glow * (0.8 + 0.6 * zoom);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    };
    ring(R * 0.98, 4, 0.95);
    ring(R * 0.86, 3, 0.9);

    // Ticks radiales
    const tickW = 3;
    const tickLen = Math.max(10, R * 0.07);
    const segGap = Math.max(6, R * 0.025);
    const segs = 7;

    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = tickW;
    (ctx as any).shadowColor = color; (ctx as any).shadowBlur = glow * 0.8;

    const drawSegmentLine = (angleRad: number) => {
        const dx = Math.cos(angleRad), dy = Math.sin(angleRad);
        for (let i = 0; i < segs; i++) {
            const d0 = R * 0.86 - i * (segGap + tickLen);
            const d1 = Math.max(0, d0 - tickLen);
            if (d1 <= 0) break;
            ctx.beginPath();
            ctx.moveTo(cx + dx * d0, cy + dy * d0);
            ctx.lineTo(cx + dx * d1, cy + dy * d1);
            ctx.stroke();
        }
    };
    drawSegmentLine(0);
    drawSegmentLine(Math.PI);
    drawSegmentLine(Math.PI * 0.5);
    drawSegmentLine(-Math.PI * 0.5);
    ctx.restore();

    // Brackets + punto
    const gapBase = Math.max(6, R * 0.06);
    const gap = gapBase + spread * (R * 0.08);
    const arm = Math.max(12, R * 0.12);
    const bw = Math.max(3, R * 0.018);

    const bracket = (dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * gap, cy + dy * gap);
        ctx.lineTo(cx + dx * (gap + arm), cy + dy * gap);
        ctx.moveTo(cx + dx * gap, cy + dy * gap);
        ctx.lineTo(cx + dx * gap, cy + dy * (gap + arm));
        ctx.stroke();
    };

    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = bw;
    (ctx as any).shadowColor = color; (ctx as any).shadowBlur = glow;

    bracket(1, 1);
    bracket(-1, 1);
    bracket(1, -1);
    bracket(-1, -1);

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, R * 0.012), 0, Math.PI * 2);
    ctx.fillStyle = color;
    (ctx as any).shadowBlur = glow * 0.6;
    ctx.fill();
    ctx.restore();

    // Overlay N/E/S/O con “breathing”
    const deg = ((450 - (headingRad * 180) / Math.PI) % 360 + 360) % 360;
    const jitterAmp = (1.2 + 0.6 * Math.sin(tSec * 2.1)) * (2 + zoom * 6);
    const jitter = (seed: number) => (Math.sin(tSec * 3.173 + seed * 12.9898) * 43758.5453) % 1 * 2 - 1;

    const fontBig = `900 ${Math.round(R * 0.12)}px ui-monospace, SFMono-Regular, Menlo, Monaco`;
    const fontSmall = `700 ${Math.round(R * 0.08)}px ui-monospace, SFMono-Regular, Menlo, Monaco`;

    const drawCard = (txt: string, degTxt: string, ang: number, rMul: number, seed: number) => {
        const r = R * 0.86 * rMul;
        const x = cx + Math.cos(ang) * r + jitterAmp * jitter(seed);
        const y = cy + Math.sin(ang) * r + jitterAmp * jitter(seed + 1);
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        (ctx as any).shadowColor = color;
        (ctx as any).shadowBlur = glow * (0.5 + 0.5 * zoom);
        ctx.fillStyle = color;

        ctx.font = fontBig;
        ctx.globalAlpha = 0.88;
        ctx.fillText(txt, x, y);

        ctx.font = fontSmall;
        ctx.globalAlpha = 0.75;
        ctx.fillText(degTxt, x, y + Math.sign(Math.sin(ang)) * R * 0.06);
        ctx.restore();
    };

    const fmt = (n: number) => n.toFixed(0).padStart(3, "0");
    drawCard("N", fmt(deg), -Math.PI * 0.5, 0.60, 11);
    drawCard("S", fmt((deg + 180) % 360), Math.PI * 0.5, 0.60, 23);
    drawCard("E", fmt((deg + 90) % 360), 0, 0.60, 31);
    drawCard("W", fmt((deg + 270) % 360), Math.PI, 0.60, 47);

    // Scanline circular con zoom
    if (zoom > 0.001) {
        const k = clamp01(zoom);
        ctx.save();
        const g = ctx.createRadialGradient(cx, cy, R * 0.86 * 0.25, cx, cy, R * 0.98);
        g.addColorStop(0, "rgba(255,255,255,0.00)");
        g.addColorStop(1, overTarget ? "rgba(255,60,60,0.09)" : "rgba(34,211,238,0.09)");
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.75 * k;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.98, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 0.35 * k;
        ctx.strokeStyle = overTarget ? "rgba(255,60,60,0.6)" : "rgba(34,211,238,0.6)";
        ctx.lineWidth = 2;
        const a0 = (tSec * 0.9) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.86 * 0.92, a0, a0 + Math.PI * 0.35);
        ctx.stroke();
        ctx.restore();
    }
}

export const Crosshair: React.FC<Props> = ({
    position = [0, 0, 0],
    scale = 1,
    spread = 0,
    zoom = 0,
    overTarget = false,
    headingRad = 0,
}) => {
    const cfg = CFG.hud.crosshair || {};
    const dims = (cfg.canvasPx ?? [512, 512]) as [number, number];

    const texture = React.useMemo(() => {
        const [W, H] = dims;
        const canvas = document.createElement("canvas");
        // ✅ Fijar tamaño ANTES de crear/subir la textura
        canvas.width = W; canvas.height = H;
        const tex = new THREE.CanvasTexture(canvas);
        // HUD 2D: no necesitamos “mirror hack”
        tex.flipY = false;
        // Textura dinámica: sin mipmaps, filtros lineales
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 0;
        // Color space moderno (r152+):
        // @ts-ignore – mantener compatibilidad
        tex.colorSpace = (THREE as any).SRGBColorSpace ?? undefined;
        tex.needsUpdate = true;
        return tex;
        // Si cambian dimensiones, recreamos textura (no redimensionamos)
    }, [dims[0], dims[1]]);

    // Redibujo cada frame (para jitter, sweep, zoom)
    useFrame((state) => {
        const c = (texture.image as HTMLCanvasElement) || undefined;
        if (!c) return;
        drawCrosshairToCanvas(c, state.clock.elapsedTime, { spread, zoom, overTarget, headingRad, cfg });
        texture.needsUpdate = true;
    });

    const sView = (CFG.hud.crosshair.size || 0.22) * (CFG.hud.ui?.scale ?? 1) * scale;
    const additive = true;

    return (
        <mesh position={position} renderOrder={20000} frustumCulled={false}>
            <planeGeometry args={[sView, sView]} />
            <meshBasicMaterial
                map={texture}
                transparent
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
                blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

export default Crosshair;
