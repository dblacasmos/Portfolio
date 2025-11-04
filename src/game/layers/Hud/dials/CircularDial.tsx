/*  ================================================
    FILE: src/game/layers/Hud/dials/CircularDial.tsx
    ================================================ */
import React, { useMemo, useRef, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CFG } from "@/constants/config";

type Props = {
    /** 0..100 */
    value: number;
    label: string;
    position: [number, number, number];
    size?: number;
    rotation?: [number, number, number];
    /** Color base del dial (emisión) */
    color?: string;

    /** Paleta crítica (se activa por debajo de criticalThreshold) */
    criticalA?: string;             // color A (ej. naranja o cian)
    criticalB?: string;             // color B (ej. rojo o índigo)
    criticalThreshold?: number;     // 0..1 (por defecto 0.2)

    /** Capa de render; por defecto HUD */
    layer?: number;

    /** Si un padre espeja en X (π en Y), activa para corregir sin tocar matrices */
    flipX?: boolean;
};

/**
 * Dial circular procedural (sin texturas), con:
 * - Anillo exterior que se vacía con el valor (0..100).
 * - Glow/emisión + sweep animado y marcas radiales.
 * - Ring interior de “energía” con flicker.
 * - Paleta crítica pulsante bajo umbral.
 * - Texto central con porcentaje y etiqueta.
 */
export function CircularDial({
    value,
    label,
    position,
    size = CFG.hud.dials.size,
    rotation = [0, 0, 0], // orientación normal por defecto (no espejo)
    color = CFG.hud.colors.neonCyan,
    criticalA,
    criticalB,
    criticalThreshold = 0.2,
    layer = CFG.layers.HUD,
    flipX = false,
}: Props) {
    // Nota: no guardo DPR/aspect en estado para evitar relayouts; el HUD ya se recalcula al cambiar viewport.
    const DPR = Math.min(
        CFG.hud.ui.dprMax,
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    );
    const aspect =
        typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 16 / 9;
    const responsiveScale = CFG.hud.ui.scaleForAspect(aspect);

    const groupRef = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const textMainMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const textSubMatRef = useRef<THREE.MeshBasicMaterial>(null);

    // Fuerza la capa HUD en todo el árbol (llamado una vez via onUpdate)
    const applyLayer = useCallback((root: THREE.Object3D | null, layerIdx: number) => {
        if (!root) return;
        root.layers.set(layerIdx);
        root.traverse((o) => o.layers.set(layerIdx));
    }, []);

    const baseCol = useMemo(() => new THREE.Color(color), [color]);
    const critACol = useMemo(() => new THREE.Color(criticalA ?? color), [criticalA, color]);
    const critBCol = useMemo(() => new THREE.Color(criticalB ?? color), [criticalB, color]);
    const tmpCol = useMemo(() => new THREE.Color(), []);

    const uniforms = useMemo(() => {
        return {
            uTime: { value: 0 },
            uValue: { value: THREE.MathUtils.clamp(value / 100, 0, 1) },
            uColor: { value: new THREE.Vector3(baseCol.r, baseCol.g, baseCol.b) },
            uCritA: { value: new THREE.Vector3(critACol.r, critACol.g, critACol.b) },
            uCritB: { value: new THREE.Vector3(critBCol.r, critBCol.g, critBCol.b) },
            uCritTh: { value: criticalThreshold },
            uOpacity: { value: 1.0 },

            // Geometría/máscara del dial (relativos al quad 1x1)
            uRadius: { value: 0.72 },
            uThickness: { value: 0.14 },
            uGlow: { value: 1.0 },
            uTick: { value: 0.25 },
            uBackground: { value: 0.25 },
            uStartAngle: { value: -Math.PI / 2 }, // arranca arriba
            uPx: { value: 1 / (DPR * 1024) },     // suavizado aproximado

            // Corrección de espejo horizontal opcional
            uFlipX: { value: flipX ? 1.0 : 0.0 },
        };
    }, [value, baseCol, critACol, critBCol, criticalThreshold, DPR, flipX]);

    useFrame((_, dt) => {
        // Anim shader
        uniforms.uTime.value += dt;
        const target = THREE.MathUtils.clamp(value / 100, 0, 1);
        uniforms.uValue.value = THREE.MathUtils.damp(uniforms.uValue.value, target, 6, dt);

        // Tint texto con el mismo esquema crítico
        const v = uniforms.uValue.value;
        const th = uniforms.uCritTh.value;
        const danger = THREE.MathUtils.clamp((th - v) / Math.max(th, 1e-6), 0, 1);
        const lfo = 0.5 + 0.5 * Math.sin(uniforms.uTime.value * 8.0);
        tmpCol.copy(critACol).lerp(critBCol, lfo); // mezcla A→B
        tmpCol.lerp(baseCol, 1 - danger);          // mezcla hacia base si no crítico

        textMainMatRef.current?.color.copy(tmpCol);
        textSubMatRef.current?.color.copy(tmpCol);
    });

    const vert = /* glsl */ `
    varying vec2 vUvN; // uv normalizado [-1..1]
    varying vec2 vUv;  // [0..1]
    void main() {
      vUv = uv;
      vUvN = uv * 2.0 - 1.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

    const frag = /* glsl */ `
    precision highp float;

    varying vec2 vUvN;
    varying vec2 vUv;

    uniform float uTime;
    uniform float uValue;
    uniform vec3  uColor;
    uniform vec3  uCritA;
    uniform vec3  uCritB;
    uniform float uCritTh;
    uniform float uOpacity;

    uniform float uRadius;
    uniform float uThickness;
    uniform float uGlow;
    uniform float uTick;
    uniform float uBackground;
    uniform float uStartAngle;
    uniform float uPx;
    uniform float uFlipX;

    float angle01(vec2 p) {
      float a = atan(p.y, p.x) - uStartAngle;
      a = mod(a + 6.28318530718, 6.28318530718);
      return a / 6.28318530718;
    }

    float band(float d, float r0, float r1, float aa) {
      return smoothstep(r0 - aa, r0 + aa, d) * (1.0 - smoothstep(r1 - aa, r1 + aa, d));
    }

    float hash11(float x){ return fract(sin(x*123.4567)*345.6789); }

    void main() {
      vec2 p = vUvN;
      // espejo opcional
      p.x *= mix(1.0, -1.0, step(0.5, uFlipX));

      float r = length(p);
      float ang = angle01(p);

      // Fondo + scanlines
      float lines = abs(fract((p.y*0.5+0.5)*120.0 + uTime*0.35) - 0.5);
      lines = smoothstep(0.47, 0.5, lines);
      float scan = (1.0 - lines) * 0.15;

      float vignette = 1.0 - smoothstep(0.97, 1.12, r);

      // Paleta/umbral
      float danger = clamp((uCritTh - uValue) / max(uCritTh, 1e-6), 0.0, 1.0);
      float lfo = 0.5 + 0.5 * sin(uTime * 8.0);
      vec3 critCol = mix(uCritA, uCritB, lfo);
      vec3 baseCol = mix(uColor, critCol, danger);

      // Anillo principal
      float innerR = uRadius - uThickness * 0.5;
      float outerR = uRadius + uThickness * 0.5;
      float ringMask = band(r, innerR, outerR, uPx * 700.0);

      // Progreso por ángulo
      float fill = step(ang, uValue);

      // Marcas
      float minor = abs(fract(ang * 60.0) - 0.5);
      minor = 1.0 - smoothstep(0.48, 0.52, minor);
      float major = abs(fract(ang * 12.0) - 0.5);
      major = 1.0 - smoothstep(0.40, 0.60, major);
      float ticks = mix(minor, major, 0.65) * ringMask * uTick;

      // Barrido
      float sweep = smoothstep(0.0, 0.12, abs(ang - fract(uTime * 0.12))) * ringMask * 0.75;

      // Borde del progreso
      float edgeAng = abs(ang - uValue);
      float edgePulse = smoothstep(0.00, 0.03 + 0.01*sin(uTime*5.0), 0.03 - edgeAng);
      float edgeGlow = edgePulse * ringMask * (1.0 + 0.8 * danger);

      // Ring interior de energía
      float eR = uRadius - uThickness * (1.10 + 0.05*sin(uTime*2.0));
      float eTh = 0.045 + 0.015*sin(uTime*1.7 + 2.0);
      float energyRing = band(r, eR - eTh, eR + eTh, uPx * 900.0);
      float segs = step(0.82, fract(ang*24.0 + uTime*0.25));
      energyRing *= (1.0 - segs) * (0.85 + 0.35 * danger);

      // Flicker sutil
      float flickBase = (0.02 + 0.03*(1.0-uValue)) * (0.5 + 0.5*sin(uTime*40.0 + 6.2831*hash11(ang)));
      float flickCrit = danger * 0.06 * (0.5 + 0.5*sin(uTime*18.0));
      float flick = flickBase + flickCrit;

      // Composición
      float baseGlow = uBackground * (1.0 - smoothstep(0.0, 0.9, r)) + scan;
      vec3 c =
            baseCol * (baseGlow * 0.7)
          + baseCol * (ringMask * 0.12)
          + baseCol * (ticks * 0.55)
          + baseCol * (sweep * 0.55)
          + baseCol * (ringMask * fill * 0.95)
          + baseCol * (energyRing * 0.85)
          + baseCol * (edgeGlow * uGlow * 1.35)
          + baseCol * flick;

      float alpha = (ringMask * 0.9 + baseGlow * 0.35 + ticks * 0.8 + sweep * 0.8 + energyRing * 0.9) * uOpacity;
      alpha *= vignette;

      // Recorte externo
      float outer = 1.0 - smoothstep(1.0, 1.08, r);
      alpha *= outer;

      gl_FragColor = vec4(c, clamp(alpha, 0.0, 1.0));
    }
  `;

    const scale = useMemo<[number, number, number]>(
        () => [size * responsiveScale, size * responsiveScale, 1],
        [size, responsiveScale]
    );

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
            frustumCulled={false}
            onUpdate={(g) => applyLayer(g, layer)}
        >
            {/* Quad procedural */}
            <mesh frustumCulled={false} renderOrder={30000}>
                <planeGeometry args={[1, 1, 1, 1]} />
                <shaderMaterial
                    ref={matRef as any}
                    args={[{ uniforms, vertexShader: vert, fragmentShader: frag }]}
                    transparent
                    depthWrite={false}
                    depthTest={false}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Texto central */}
            <Text
                position={[0, -0.02, 0.001]}
                fontSize={0.22}
                anchorX="center"
                anchorY="middle"
                depthOffset={-1}
                outlineWidth={0.005}
                outlineColor="black"
                renderOrder={30001}
                frustumCulled={false}
            >
                {`${Math.round(THREE.MathUtils.clamp(value, 0, 999))}`}
                <meshBasicMaterial
                    ref={textMainMatRef as any}
                    color={color}
                    transparent
                    opacity={0.95}
                    toneMapped={false}
                    depthTest={false}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </Text>

            {/* Subtítulo */}
            <Text
                position={[0, 0.34, 0.001]}
                fontSize={0.08}
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.04}
                depthOffset={-1}
                renderOrder={30001}
                frustumCulled={false}
            >
                {label.toUpperCase()}
                <meshBasicMaterial
                    ref={textSubMatRef as any}
                    color={color}
                    transparent
                    opacity={0.85}
                    toneMapped={false}
                    depthTest={false}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </Text>

            {/* Halo central suave */}
            <mesh renderOrder={29999} frustumCulled={false} scale={[0.55, 0.55, 1]} position={[0, 0, -0.001]}>
                <circleGeometry args={[0.5, 64]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.06}
                    toneMapped={false}
                    depthTest={false}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

export default CircularDial;
