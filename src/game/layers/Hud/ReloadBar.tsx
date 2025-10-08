import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";

type Props = {
  /** ¿Mostrar la barra? (si false, fade-out pero no se desmonta) */
  reloading: boolean;
  /** Progreso 0..1 externo; si es <=0 o >=1 se ignora y usamos fallback por tiempo. */
  progress: number;
  /** Posición del plano en coords ortográficas. */
  position?: [number, number, number];
  /** Rotación del plano (por defecto [0, Math.PI, 0] para corregir espejo) */
  rotation?: [number, number, number];
  /** Render order para que flote sobre el HUD */
  renderOrder?: number;
};

const HUD_LAYER = CFG.layers.HUD;

export default function ReloadBar({
  reloading,
  progress,
  position = [CFG.hud.reloadBar.x, CFG.hud.reloadBar.y, 0],
  rotation = [0, Math.PI, 0],
  renderOrder = 20001,
}: Props) {
  const aspect =
    typeof window !== "undefined"
      ? window.innerWidth / window.innerHeight
      : 16 / 9;
  const responsiveScale = CFG.hud.ui.scaleForAspect(aspect);
  const [pw, ph] = CFG.hud.reloadBar.size;
  const planeSize = [pw * responsiveScale, ph * responsiveScale] as [number, number];

  // Fallback temporal si no llega progreso “usable”
  const reloadStartMsRef = useRef<number>(0);
  const prevReloadingRef = useRef<boolean>(false);
  const durationMs = Math.max(50, Number((CFG as any)?.reload?.timeMs ?? 2000));

  useEffect(() => {
    if (reloading && !prevReloadingRef.current) reloadStartMsRef.current = performance.now();
    prevReloadingRef.current = reloading;
  }, [reloading]);

  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },  // 0..1
      uOpacity: { value: 0 },   // fade in/out panel
      uCyan: { value: new THREE.Color(CFG.hud.colors?.neonCyan ?? "#22D3EE") },
      uRed: { value: new THREE.Color(CFG.hud.colors?.dangerRed ?? "#FF3B41") },
      uBase: { value: new THREE.Color("#0A0F14") },
      uEdge: { value: new THREE.Color("#22303C") },
      uRes: { value: new THREE.Vector2(planeSize[0], planeSize[1]) },
    };

    const vertex = /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragment = /* glsl */ `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      uniform vec3  uCyan;
      uniform vec3  uRed;
      uniform vec3  uBase;
      uniform vec3  uEdge;
      uniform vec2  uRes;

      float inRect(vec2 uv, vec2 mn, vec2 mx){
        return step(mn.x, uv.x) * step(mn.y, uv.y) * step(uv.x, mx.x) * step(uv.y, mx.y);
      }
      float edgeRect(vec2 uv, vec2 mn, vec2 mx, float th){
        float o = inRect(uv, mn, mx);
        float i = inRect(uv, mn + vec2(th), mx - vec2(th));
        return max(o - i, 0.0);
      }
      float gauss(float x, float w){ return exp(-x*x / max(1e-5, w*w)); }
      float remap(float x, float a, float b, float c, float d){
        float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
        return mix(c, d, t);
      }
      vec3 ramp(float t){ // rojo -> cian
        t = clamp(t, 0.0, 1.0);
        float k = smoothstep(0.05, 0.95, t);
        return mix(uRed, uCyan, k);
      }
      float gloss(vec2 uv, float xCenter, float width){
        return gauss(uv.x - xCenter, width);
      }

      void main(){
        // El plano en HUD va rotado (0,PI,0), corrijo espejo aquí
        vec2 uv = vec2(1.0 - vUv.x, vUv.y);

        if (uOpacity <= 0.002) discard;

        vec2 outerMn = vec2(0.035, 0.12);
        vec2 outerMx = vec2(0.965, 0.88);
        if (inRect(uv, outerMn, outerMx) < 0.5) discard;

        float gy  = smoothstep(outerMn.y, outerMx.y, uv.y);
        vec3  col = mix(uBase*0.90, uBase*1.12, gy);
        col += gauss(uv.y - mix(outerMn.y, outerMx.y, 0.5), 0.18) * vec3(0.04,0.06,0.09);

        float ed1 = edgeRect(uv, outerMn, outerMx, 0.010);
        float ed2 = edgeRect(uv, outerMn + vec2(0.014), outerMx - vec2(0.014), 0.006);
        col += ed1 * (uEdge * 1.35);
        col += ed2 * (uCyan * 0.15);

        vec2 trackMn = vec2(0.12, 0.56);
        vec2 trackMx = vec2(0.88, 0.80);
        float track   = inRect(uv, trackMn, trackMx);
        float trackEd = edgeRect(uv, trackMn, trackMx, 0.006);
        col += trackEd * (uEdge*1.6 + vec3(0.02,0.05,0.09));

        float vNorm = remap(uv.y, trackMn.y+0.006, trackMx.y-0.006, 0.0, 1.0);
        float glass = 1.0 - smoothstep(0.0, 1.0, min(vNorm, 1.0 - vNorm));
        col += track * (vec3(0.10,0.16,0.22) * glass * 0.25);

        // Progreso IZQ→DER, ROJO→CIAN
        float p     = clamp(uProgress, 0.0, 1.0);
        float xL    = trackMn.x + 0.010;
        float xR    = trackMx.x - 0.010;
        float headX = mix(xL, xR, p);
        float inside = inRect(uv, vec2(xL, trackMn.y+0.006), vec2(xR, trackMx.y-0.006));
        float filled = step(uv.x, headX) * inside;

        vec3 fillC = ramp(p);
        float coreV = gauss(vNorm - 0.5, 0.22);
        vec3  fill  = mix(fillC*0.50, fillC*1.12, coreV);

        float headGlow  = gauss(uv.x - headX, 0.022) * inside;
        float headTrail = gauss(uv.x - (headX - 0.045), 0.055) * inside;

        float sweep1X = mix(xL, headX, fract(uTime*0.35));
        float sweep2X = mix(xL, headX, fract(uTime*0.22 + 0.37));
        float s1 = gloss(uv, sweep1X, 0.020) * filled * smoothstep(0.10, 0.90, vNorm);
        float s2 = gloss(uv, sweep2X, 0.032) * filled * smoothstep(0.10, 0.90, vNorm);
        float sweeps = (s1*0.7 + s2*0.55);

        float coreLine = gauss(vNorm - 0.5, 0.04) * filled;

        col = mix(col, fill, filled * 0.95);
        col += sweeps    * (fillC * 0.65);
        col += coreLine  * (fillC * 0.55);
        col += headTrail * (fillC * 0.48);
        col += headGlow  * (fillC * 1.15);

        float innerEd = edgeRect(uv, trackMn + vec2(0.006), trackMx - vec2(0.006), 0.004);
        col += innerEd * (fillC * 0.08) * filled;

        gl_FragColor = vec4(col, uOpacity);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    return mat;
  }, [planeSize[0], planeSize[1]]);

  // Animación / sincronización
  useFrame((_, dt) => {
    (material.uniforms.uTime.value as number) += dt;

    const ext = Number(progress);
    const useExternal = Number.isFinite(ext) && ext > 0 && ext < 1;

    let targetProg: number;
    if (useExternal) {
      targetProg = ext;
    } else {
      const elapsed = Math.max(0, performance.now() - reloadStartMsRef.current);
      targetProg = reloading ? Math.min(1, elapsed / durationMs) : 0;
    }

    const cur = material.uniforms.uProgress.value as number;
    material.uniforms.uProgress.value = THREE.MathUtils.damp(cur, targetProg, 10, dt);

    const curOp = material.uniforms.uOpacity.value as number;
    const toOp = reloading ? 1 : 0;
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(curOp, toOp, reloading ? 12 : 8, dt);
  });

  useEffect(() => () => { try { (material as any).dispose?.(); } catch { } }, [material]);

  return (
    <group>
      <mesh
        position={position}
        rotation={rotation}
        frustumCulled={false}
        renderOrder={renderOrder}
        onUpdate={(o) => o.layers.set(HUD_LAYER)}
      >
        <planeGeometry args={planeSize} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}
