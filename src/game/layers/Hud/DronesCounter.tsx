/*  ====================================
    FILE: src/game/layers/Hud/DronesCounter.tsx
    ==================================== */

import React, { useMemo, useLayoutEffect, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";
import { useGameStore } from "../../utils/state/store";
import { audioManager } from "../../utils/audio/audio";

type Props = {
    position: [number, number, number];
    scaleMul?: number;
    rotation?: [number, number, number];
};

const HUD_LAYER = CFG.layers.HUD;
const COMPLETE_DELAY_MS = 200; // delay tras ESC/CERRAR antes de empezar la aparición del rectángulo

const DronesCounterHud: React.FC<Props> = ({
    position,
    scaleMul = 1,
    rotation = [0, 0, 0], // espejo ortho como el resto del HUD
}) => {
    const destroyed = useGameStore((s) => s.dronesDestroyed);
    const totalFromStore = useGameStore((s) => s.dronesTotal);

    const { size: vp } = useThree();
    const aspect = vp.width / vp.height;
    const responsiveScale = CFG.hud.ui.scaleForAspect(aspect);
    const DPR = Math.min(CFG.hud.ui.dprMax, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

    // Total por configuración (fallback al store)
    const TOTAL = Math.max(1, CFG.gameplay?.dronesTotal ?? totalFromStore ?? 5);

    const dc = CFG.hud.dronesCounter as any;
    const CANVAS_PX: [number, number] = (dc.canvasPx ?? [340, 92]) as [number, number];
    const SIZE_W = (dc.size ?? 0.4) as number;

    // ---------- Máscara de números (única textura) ----------
    const { numMaskMap, msgMaskMap, planeSize, drawNumbersMask } = useMemo(() => {
        const [W0, H0] = CANVAS_PX;

        const planeW = SIZE_W * responsiveScale * scaleMul;
        const planeH = planeW * (H0 / W0);

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = Math.round(W0 * DPR);
        maskCanvas.height = Math.round(H0 * DPR);
        const mctx = maskCanvas.getContext("2d")!;
        mctx.scale(DPR, DPR);

        const maskTex = new THREE.CanvasTexture(maskCanvas);
        maskTex.flipY = true;
        // espejo X para coincidir con la rotación +π del mesh
        maskTex.wrapS = THREE.RepeatWrapping;
        maskTex.repeat.x = -1;
        maskTex.offset.x = 1;
        maskTex.minFilter = THREE.LinearFilter;
        maskTex.magFilter = THREE.LinearFilter;
        maskTex.generateMipmaps = false;
        (maskTex as any).colorSpace = THREE.SRGBColorSpace;

        const drawNumbersMask = (d: number, t: number) => {
            const W = W0, H = H0;
            mctx.clearRect(0, 0, W, H);
            const cx = W * 0.5;
            const cy = H * 0.56;
            const numSize = Math.max(18, Math.round(H * 0.64));
            const count = `${d}/${Math.max(1, t | 0)}`;

            // Sólo máscara (blanco = números, negro = resto)
            mctx.save();
            mctx.textAlign = "center";
            mctx.textBaseline = "middle";
            mctx.font = `900 ${numSize}px ui-monospace, SFMono-Regular, Menlo, Monaco`;
            mctx.fillStyle = "#fff";
            mctx.fillText(count, cx, cy);
            mctx.restore();

            maskTex.needsUpdate = true;
        };

        // ---- Máscara del mensaje "DIRIGETE AL PUNTO DE RECOGIDA" ----
        const msgCanvas = document.createElement("canvas");
        // Ancho extra para la línea larga; altura menor (no importa: se mapea al rectángulo)
        msgCanvas.width = Math.round(W0 * 1.6 * DPR);
        msgCanvas.height = Math.round(H0 * 0.5 * DPR);
        const msgctx = msgCanvas.getContext("2d")!;
        msgctx.scale(DPR, DPR);
        const MSG = "DIRIGETE AL PUNTO DE RECOGIDA";
        msgctx.clearRect(0, 0, msgCanvas.width, msgCanvas.height);
        msgctx.textAlign = "center";
        msgctx.textBaseline = "middle";
        const msgSize = Math.max(14, Math.round(H0 * 0.22));
        msgctx.font = `900 ${msgSize}px Orbitron, ui-monospace, SFMono-Regular, Menlo, Monaco`;
        msgctx.fillStyle = "#fff"; // blanco -> el shader lo tinta en cian
        msgctx.fillText(MSG, (W0 * 1.6) * 0.5, (H0 * 0.5) * 0.5);

        const msgTex = new THREE.CanvasTexture(msgCanvas);
        msgTex.flipY = true;
        msgTex.wrapS = THREE.RepeatWrapping;
        msgTex.repeat.x = -1; // espejo X como el panel
        msgTex.offset.x = 1;
        msgTex.minFilter = THREE.LinearFilter;
        msgTex.magFilter = THREE.LinearFilter;
        msgTex.generateMipmaps = false;
        (msgTex as any).colorSpace = THREE.SRGBColorSpace;

        return {
            numMaskMap: maskTex,
            msgMaskMap: msgTex,
            planeSize: [planeW, planeH] as [number, number],
            drawNumbersMask,
        };
    }, [DPR, responsiveScale, scaleMul, SIZE_W, CANVAS_PX]);

    // Repinta máscara cuando cambian datos o viewport
    useLayoutEffect(() => { drawNumbersMask(destroyed, TOTAL); }, [destroyed, TOTAL, drawNumbersMask]);
    useLayoutEffect(() => { drawNumbersMask(destroyed, TOTAL); }, [vp.width, vp.height, drawNumbersMask, destroyed, TOTAL]);

    useEffect(() => () => {
        try { numMaskMap?.dispose(); } catch { }
        try { (msgMaskMap as any)?.dispose?.(); } catch { }
    }, [numMaskMap, msgMaskMap]);

    // ---------- Sonido + micro-destello al subir ----------
    const prevDestroyed = useRef<number>(destroyed);
    const flash = useRef<number>(0);

    const PING_SRC: string | null =
        ((CFG as any)?.audio?.ui?.ping as string | undefined) ??
        ((CFG as any)?.audio?.ui?.click as string | undefined) ?? null;

    useEffect(() => {
        const d0 = prevDestroyed.current | 0;
        const d1 = destroyed | 0;
        if (d1 > d0) {
            if (PING_SRC) (audioManager as any)?.playSfx?.(PING_SRC);
            flash.current = 1.0; // subimos flash para efecto holográfico
        }
        prevDestroyed.current = d1;
    }, [destroyed]);

    // ---------- Shader uniforms ----------
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uFlash: { value: 0 },
        uAnim: { value: 0 },              // 0..1 → transición cápsula→rectángulo
        uMask: { value: numMaskMap },     // números 5/5
        uMsg: { value: msgMaskMap },      // mensaje "DIRIGETE..."
        // Colores coherentes con Dials
        uCyan: { value: new THREE.Color(CFG.hud.dials?.shieldColor ?? "#22D2EE") },
        uRed: { value: new THREE.Color(CFG.hud.dials?.healthColor ?? "#FF2D2D") },
        // Base/edge para leve estructura
        uBase: { value: new THREE.Color("#071019") },
        uEdge: { value: new THREE.Color("#0F1A24") },
        uRes: { value: new THREE.Vector2(planeSize[0], planeSize[1]) },
    }), [numMaskMap, msgMaskMap, planeSize]);

    const vertex = useMemo(() => /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `, []);

    const fragment = useMemo(() => /* glsl */`
    precision mediump float;
    precision mediump int;

    varying vec2 vUv;
    uniform sampler2D uMask; // números
    uniform sampler2D uMsg;  // texto "DIRIGETE..."
    uniform float uTime, uFlash, uAnim;
    uniform vec3 uCyan, uRed, uBase, uEdge;
    uniform vec2 uRes;

    // --- SDF helpers ---
    float sdRoundRect(vec2 p, vec2 b, float r){
      vec2 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }
    float ringSDF(vec2 p, vec2 b, float r, float th){
      float d = sdRoundRect(p, b, r);
      float o = smoothstep(0.003, 0.0, d);
      float i = smoothstep(0.003, 0.0, d + th);
      return max(o - i, 0.0);
    }
    float gauss(float x, float w){ return exp(-x*x / max(1e-6, w*w)); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = dot(i, vec2(127.1, 311.7));
      float b = dot(i + vec2(1.0,0.0), vec2(127.1, 311.7));
      float c = dot(i + vec2(0.0,1.0), vec2(127.1, 311.7));
      float d = dot(i + vec2(1.0,1.0), vec2(127.1, 311.7));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(fract(sin(a)*43758.5453123), fract(sin(b)*43758.5453123), u.x),
                 mix(fract(sin(c)*43758.5453123), fract(sin(d)*43758.5453123), u.x), u.y);
    }
    float spokes(vec2 p, float count, float width){
      float ang = atan(p.y, p.x);
      float s   = abs(sin(ang * count));
      float line = 1.0 - smoothstep(width, width + 0.05, s);
      return line;
    }

    void main(){
      // corregimos el espejo del mesh rotado π en Y
      vec2 uv = vec2(1.0 - vUv.x, vUv.y);
      float textMsgA = 0.0; // alpha acumulada del mensaje para componer transparencia

      // marco del panel en coords [0..1]
      vec2 mn = vec2(0.08, 0.18);
      vec2 mx = vec2(0.92, 0.82);
      vec2 ctr = (mn+mx)*0.5;
      vec2 sz  = (mx-mn);

      // coords relativas al centro
      vec2 p = (uv - ctr);

      // ======= SHAPES: píldora y rectángulo (rectángulo crecido) =======
      float hw = sz.x * 0.5;
      float hh = sz.y * 0.5;
      float rCapsule = hh;              // extremos circulares -> cápsula
      // Crecimiento del rectángulo (ancho +6%, alto +10%)
      vec2  growRect = vec2(1.62, 1.10);
      float hwG = hw * growRect.x;
      float hhG = hh * growRect.y;
      float rRect = hhG * 0.10;                 // esquinas suaves proporcionales
      vec2  bRect = vec2(hwG - rRect, hhG - rRect); // base rectángulo crecido
       vec2  bCaps    = vec2(hw - rCapsule, hh - rCapsule); // base cápsula

      // Alphas suaves para cada shape
      float dCaps  = sdRoundRect(p, bCaps, rCapsule);
      float dRect  = sdRoundRect(p, bRect, rRect);
      float aCaps  = smoothstep(0.004, -0.004, dCaps);
      float aRect  = smoothstep(0.004, -0.004, dRect);

      // ======== FX comunes ========
      float sweep = gauss(fract(uv.x + uv.y*0.35 + uTime*0.35) - 0.5, 0.22);
      float scan  = 0.12 * (0.5 + 0.5*sin(uv.y*520.0 + uTime*6.5));
      float grain = (noise(uv*vec2(450.0, 280.0) + uTime*0.5) - 0.5) * 0.08;
      float flashK = clamp(uFlash, 0.0, 1.0);
      float fxAmp = 0.92 + 0.45*sweep + scan + 0.65*flashK;

      // split cromático sólo para la fase "cápsula"
      float split = smoothstep(0.46, 0.54, uv.x);
      vec3 leftCol  = uRed;
      vec3 rightCol = uCyan;
      vec3 baseLR   = mix(leftCol, rightCol, split);

      // Fondo holográfico de cápsula
      vec3 holoCaps = baseLR * fxAmp + vec3(grain);
      float ringInnerCaps = ringSDF(p, vec2(bCaps.x-0.008, max(0.0,bCaps.y-0.008)), rCapsule-0.008, 0.008);
      holoCaps += ringInnerCaps * (uEdge * 1.25);
      float sp = spokes(p, 36.0, 0.06) * aCaps;
      vec3 spokeTint = mix(leftCol, rightCol, split);
      holoCaps = mix(holoCaps, holoCaps * 0.78, sp * 0.85);
      holoCaps += spokeTint * (0.10 * sp);

      // Fondo del rectángulo: rojo homogéneo (parpadeo) en TODA el área
      float blink = step(0.5, fract(uTime * 1.5));
      vec3 rectBase = uRed * (0.90 + 0.35 * float(blink)) + uEdge * 0.35;
      float ringRect = ringSDF(p, bRect, rRect, 0.012);
      vec3 rectWithEdge = mix(rectBase, rectBase * 1.2, ringRect * 0.75);

      // ======== Transición 0..1 (fade entre shapes y contenidos) ========
      float open = smoothstep(0.0, 1.0, uAnim);

      // Composición por shape
      vec3 color = vec3(0.0);
      color += holoCaps    * aCaps * (1.0 - open); // desaparece cápsula
      color += rectWithEdge* aRect * open;         // aparece rectángulo (toda el área)

      // ======== Números (desaparecen) ========
      float maskA = texture2D(uMask, vec2(1.0 - uv.x, uv.y)).a * (1.0 - open);
      vec3  numColBase = mix(rightCol, leftCol, split);
      vec3  numCol = numColBase * (fxAmp * 1.05);
      color = mix(color, numCol, maskA * aCaps * (1.0 - open));

      // ======== Mensaje en rectángulo (aparece, centrado) ========
      if (open > 0.001) {
        // Texto centrado dentro del rectángulo CRECIDO con un padding pequeño
        // Caja del rectángulo crecido en UV (centro ± half-extent crecido)
        vec2 rectHalf = vec2(hwG, hhG);
        vec2 rectMn   = ctr - rectHalf;
        vec2 rectMx   = ctr + rectHalf;
        // Padding interno relativo al tamaño del rectángulo crecido
        vec2 innerPad = vec2(0.04, 0.12); // 4% X, 12% Y
        vec2 msgMn = mix(rectMn, rectMx, innerPad);
        vec2 msgMx = mix(rectMn, rectMx, 1.0 - innerPad);
        vec2 mu = (uv - msgMn) / (msgMx - msgMn);
        float msgA = texture2D(uMsg, vec2(1.0 - mu.x, mu.y)).a;
        vec3  msgCol = uCyan * (1.10 + 0.40 * float(blink)); // cian parpadeando
        float insideMsgRect =
        // recorte del texto al área con padding; permitimos que el rectángulo sobresalga si crece
          step(msgMn.x, uv.x) * step(uv.x, msgMx.x) *
          step(msgMn.y, uv.y) * step(uv.y, msgMx.y);
        float msgMixA = msgA * insideMsgRect * aRect * open;
        color = mix(color, msgCol, msgMixA);
        textMsgA = msgMixA; // guarda contribución de alpha del texto
      }

      gl_FragColor = vec4(color, 1.0);
      // === Transparencia real: fuera de cápsula/rectángulo/texto → alpha 0 ===
      float alphaBase = max(aCaps * (1.0 - open), aRect * open);
      float alphaNums = maskA * aCaps * (1.0 - open);
      float finalA = clamp(max(alphaBase, max(alphaNums, textMsgA)), 0.0, 1.0);
      gl_FragColor = vec4(color, finalA);
    }
  `, []);

    const panelMat = useMemo(() => {
        const m = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
            side: THREE.DoubleSide,
        });
        return m;
    }, [uniforms, vertex, fragment]);

    // Limpieza
    useEffect(() => () => {
        try { panelMat.dispose(); } catch { }
    }, [panelMat]);

    // Animación de completado 0→1 con delay (desaparece cápsula + números / aparece rectángulo + mensaje)
    const completeAnim = useRef(0);
    const doneSinceMs = useRef<number | null>(null);

    // Tiempo + flash decay + anim
    useFrame((state, dt) => {
        panelMat.uniforms.uTime.value += dt;
        if (flash.current > 0) flash.current = Math.max(0, flash.current - 10.0 * dt);
        panelMat.uniforms.uFlash.value = flash.current;

        const isDone = destroyed >= TOTAL;

        // Gestiona timestamp para el delay de entrada del rectángulo
        const nowMs = state.clock.getElapsedTime() * 1000.0;
        if (isDone) {
            if (doneSinceMs.current === null) {
                doneSinceMs.current = nowMs; // marca momento de alcanzar 5/5 (tras ESC/CERRAR)
            }
        } else {
            doneSinceMs.current = null; // reset si vuelve a menos de TOTAL
        }

        const appearSec = (CFG as any)?.hud?.dronesCounter?.appearSec ?? 0.6;
        const disappearSec = (CFG as any)?.hud?.dronesCounter?.disappearSec ?? 0.5;

        // si aún no ha pasado el delay, mantenemos uAnim en 0
        let target = 0;
        if (isDone) {
            const elapsedSinceDone = (nowMs - (doneSinceMs.current ?? nowMs));
            target = elapsedSinceDone >= COMPLETE_DELAY_MS ? 1 : 0;
        } else {
            target = 0;
        }

        const speed = (target > completeAnim.current)
            ? (1.0 / Math.max(0.001, appearSec))
            : (1.0 / Math.max(0.001, disappearSec));

        // acercar anim hacia target
        const dir = Math.sign(target - completeAnim.current);
        completeAnim.current = Math.min(1, Math.max(0, completeAnim.current + dir * dt * speed));
        panelMat.uniforms.uAnim.value = completeAnim.current;
    });

    // Raycast no-op para que este HUD no interfiera con los picks
    const ignoreRaycast = useCallback(
        (_raycaster: THREE.Raycaster, _intersects: THREE.Intersection[]) => { },
        []
    );

    return (
        <group>
            <mesh
                position={position}
                rotation={rotation}
                frustumCulled={false}
                renderOrder={20000}
                onUpdate={(o) => o.layers.set(HUD_LAYER)}
                raycast={ignoreRaycast}
            >
                <planeGeometry args={planeSize} />
                <primitive object={panelMat} attach="material" />
            </mesh>
        </group>
    );
};

export default DronesCounterHud;
