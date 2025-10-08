// ====================================
// FILE: src/game/layers/Shots/Lasers.tsx
// ====================================
import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";
import { setLayerRecursive } from "@/game/utils/three/layers";
import type { Laser } from "./makeLaser";

export { makeLaser } from "./makeLaser";
export type { Laser };

type LaserSystemProps = {
    lasers: Laser[];
    setLasers: React.Dispatch<React.SetStateAction<Laser[]>>;
    renderOrder?: number;
    layer?: number;
    /** Si true: no hace depthTest (overlay por delante del mundo). */
    alwaysVisible?: boolean;
    coreRadius?: number;
    glowRadius?: number;
    /** Punto de impacto a partir de from→to (para colisionar con paredes). */
    hitTest?: (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3 | null | undefined;
};

const DEFAULTS = {
    coreRadius: 0.01,
    glowRadius: 0.035,
};

export const LaserSystem: React.FC<LaserSystemProps> = ({
    lasers,
    setLasers,
    renderOrder = 9000,
    layer = CFG.layers.SHOTS,
    alwaysVisible = true,
    coreRadius = DEFAULTS.coreRadius,
    glowRadius = DEFAULTS.glowRadius,
    hitTest,
}) => {
    // Geometría compartida: cilindro (orientado a +Z)
    const unitCylinder = useMemo(() => {
        const g = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
        g.rotateX(Math.PI / 2);
        return g;
    }, []);

    // Quad 1x1 para flashes
    const unitQuad = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

    // Material del núcleo
    const coreMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00ff66) },
                uRadius: { value: coreRadius },
                uIntensity: { value: 1.0 },
            },
            vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main(){
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vPos;
        uniform vec3 uColor;
        uniform float uRadius;
        uniform float uIntensity;
        uniform float uTime;

        float radialMask(vec2 p, float r){
          float d = length(p) / r;
          return clamp(1.0 - smoothstep(0.85, 1.0, d), 0.0, 1.0);
        }
        float endTaper(float z){
          float a = smoothstep(-0.5, -0.45, z);
          float b = 1.0 - smoothstep(0.45, 0.5, z);
          return a * b;
        }
        void main(){
          float taper = endTaper(vPos.z);
          float core = radialMask(vPos.xy, uRadius);
          float stripes = 0.75 + 0.25 * sin(80.0*(vPos.z + 0.5) + 6.0*uTime);
          float alpha = core * taper * stripes * uIntensity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible, coreRadius]);

    // Material del halo
    const glowMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00ff66) },
                uRadius: { value: glowRadius },
                uIntensity: { value: 0.8 },
            },
            vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main(){
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vPos;
        uniform vec3 uColor;
        uniform float uRadius;
        uniform float uIntensity;
        uniform float uTime;

        float radialGlow(vec2 p, float r){
          float d = length(p) / r;
          return 1.0 - smoothstep(0.2, 1.0, d);
        }
        float endTaper(float z){
          float a = smoothstep(-0.5, -0.45, z);
          float b = 1.0 - smoothstep(0.45, 0.5, z);
          return a * b;
        }
        void main(){
          float taper = endTaper(vPos.z);
          float glow = radialGlow(vPos.xy, uRadius);
          float flicker = 0.9 + 0.1 * sin(10.0*uTime);
          float alpha = glow * taper * uIntensity * flicker;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible, glowRadius]);

    // Material para flashes
    const flashMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uColor: { value: new THREE.Color(0x00ff66) },
                uTime: { value: 0 },
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv * 2.0 - 1.0;
          vec4 worldPos = modelMatrix * vec4(0.0,0.0,0.0,1.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float size = 1.0;
          vec3 pos = worldPos.xyz + right * position.x * size + up * position.y * size;
          gl_Position = projectionMatrix * viewMatrix * vec4(pos,1.0);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uTime;
        void main(){
          float d = length(vUv);
          float ring = smoothstep(1.0, 0.0, d);
          float pulse = 0.85 + 0.15 * sin(25.0*uTime);
          float alpha = ring * pulse;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible]);

    // Avance de tiempo en shaders + decay/crecimiento de lasers
    useFrame((_, dt) => {
        (coreMat.uniforms.uTime.value as number) += dt;
        (glowMat.uniforms.uTime.value as number) += dt;
        (flashMat.uniforms.uTime.value as number) += dt;

        if (!lasers.length) return;
        setLasers((ls) =>
            ls
                .map((l) => ({
                    ...l,
                    ttl: l.ttl - dt,
                    growT: l.growT + l.growSpeed * dt,
                }))
                .filter((l) => l.ttl > 0)
        );
    });

    // Limpieza de recursos
    useEffect(() => {
        return () => {
            unitCylinder.dispose();
            unitQuad.dispose();
            coreMat.dispose();
            glowMat.dispose();
            flashMat.dispose();
        };
    }, [unitCylinder, unitQuad, coreMat, glowMat, flashMat]);

    return (
        <group
            renderOrder={renderOrder}
            frustumCulled={false}
            onUpdate={(g) => setLayerRecursive(g, layer)}
        >
            {lasers.map((l) => {
                // 1) Resolver impacto real
                const desiredTo = (() => {
                    const h = hitTest?.(l.from, l.to);
                    return h ? h : l.to;
                })();
                const dirFull = new THREE.Vector3().subVectors(desiredTo, l.from);
                const fullLen = Math.max(0.0001, dirFull.length());
                const dirN = dirFull.clone().divideScalar(fullLen);

                // 2) Longitud visible animada
                const visLen = Math.min(l.growT, fullLen);

                // 3) Transform
                const mid = new THREE.Vector3().copy(l.from).addScaledVector(dirN, visLen * 0.5);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirN);

                const color = l.color === "green" ? 0x00ff66 : 0xff3333;

                return (
                    <group key={l.id} position={mid} quaternion={q} renderOrder={renderOrder} frustumCulled={false}>
                        {/* Núcleo */}
                        <mesh geometry={unitCylinder} frustumCulled={false} scale={[coreRadius, coreRadius, visLen]}>
                            <primitive
                                attach="material"
                                object={coreMat}
                                onUpdate={(m: THREE.ShaderMaterial) => {
                                    m.uniforms.uColor.value.setHex(color);
                                }}
                            />
                        </mesh>

                        {/* Halo */}
                        <mesh geometry={unitCylinder} frustumCulled={false} scale={[glowRadius, glowRadius, visLen]}>
                            <primitive
                                attach="material"
                                object={glowMat}
                                onUpdate={(m: THREE.ShaderMaterial) => {
                                    m.uniforms.uColor.value.setHex(color);
                                }}
                            />
                        </mesh>

                        {/* Muzzle flash */}
                        <group position={new THREE.Vector3(0, 0, -visLen * 0.5)}>
                            <mesh geometry={unitQuad} frustumCulled={false} renderOrder={renderOrder + 1} scale={[coreRadius * 1.6, coreRadius * 1.6, 1]}>
                                <primitive
                                    attach="material"
                                    object={flashMat}
                                    onUpdate={(m: THREE.ShaderMaterial) => {
                                        m.uniforms.uColor.value.setHex(color);
                                    }}
                                />
                            </mesh>
                        </group>

                        {/* Glow en la punta (o impacto) */}
                        <group position={new THREE.Vector3(0, 0, visLen * 0.5)}>
                            <mesh
                                geometry={unitQuad}
                                frustumCulled={false}
                                renderOrder={renderOrder + 1}
                                scale={[
                                    (visLen >= fullLen ? coreRadius * 2.2 : coreRadius * 1.3),
                                    (visLen >= fullLen ? coreRadius * 2.2 : coreRadius * 1.3),
                                    1,
                                ]}
                            >
                                <primitive
                                    attach="material"
                                    object={flashMat}
                                    onUpdate={(m: THREE.ShaderMaterial) => {
                                        m.uniforms.uColor.value.setHex(color);
                                    }}
                                />
                            </mesh>
                        </group>
                    </group>
                );
            })}
        </group>
    );
};
