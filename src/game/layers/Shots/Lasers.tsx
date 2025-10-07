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
    renderOrder?: number;              // sobre escena, bajo arma/HUD
    layer?: number;                    // por defecto: SHOTS
    alwaysVisible?: boolean;           // si true, no hace depthTest (overlay)
    coreRadius?: number;               // radio del núcleo del haz
    glowRadius?: number;               // radio del halo (>= coreRadius)
    /**
   * hitTest: devuelve el punto de impacto (si lo hay) entre 'from' y 'to'.
   * Úsalo para colisionar con paredes. Si devuelve null/undefined, se usa 'to' original.
   * Ejemplo: (from, to) => raycastBVH(from, to) ?? null
   */
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
    // ————— Geometría compartida: cilindro unidad (largo=1), se escala a la longitud real
    const unitCylinder = useMemo(() => {
        // openEnded false -> tapas redondeadas con el shader
        const g = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
        // Orientamos el cilindro en +Z para facilitar "look-at"
        g.rotateX(Math.PI / 2);
        return g;
    }, []);

    // Sprite para flashes (quad 1x1 en XY)
    const unitQuad = useMemo(() => {
        const g = new THREE.PlaneGeometry(1, 1);
        return g;
    }, []);

    // ————— Material del haz: núcleo (más opaco)
    const coreMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible ? true : false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00ff66) }, // se sobreescribe por-láser
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

        // Gradial radial en sección transversal (x,y del cilindro tras el rotateX)
        float radialMask(vec2 p, float r){
          float d = length(p) / r;      // 0 centro, 1 borde
          // núcleo nítido con borde suave
          return clamp(1.0 - smoothstep(0.85, 1.0, d), 0.0, 1.0);
        }

        // Atenuación suave al inicio y fin (cap-taper)
        float endTaper(float z){
          // z en [-0.5, +0.5] aprox tras el escalado de instancia
          float a = smoothstep(-0.5, -0.45, z);
          float b = 1.0 - smoothstep(0.45, 0.5, z);
          return a * b;
        }

        void main(){
          // vPos: x,y = sección; z = eje largo
          float taper = endTaper(vPos.z);
          float core = radialMask(vPos.xy, uRadius);

          // rayado sutil animado a lo largo del eje z
          float stripes = 0.75 + 0.25 * sin(80.0*(vPos.z + 0.5) + 6.0*uTime);

          float alpha = core * taper * stripes * uIntensity;
          vec3 col = uColor;

          gl_FragColor = vec4(col, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible, coreRadius]);

    // ————— Material del halo: más ancho, más suave
    const glowMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible ? true : false,
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
          float d = length(p) / r; // 0 centro, 1 borde
          // halo más suave y más extendido
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

          // flicker leve global
          float flicker = 0.9 + 0.1 * sin(10.0*uTime);

          float alpha = glow * taper * uIntensity * flicker;
          vec3 col = uColor;

          gl_FragColor = vec4(col, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible, glowRadius]);

    // ————— Material para flashes (billboard)
    const flashMat = useMemo(() => {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: !alwaysVisible ? true : false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uColor: { value: new THREE.Color(0x00ff66) },
                uTime: { value: 0 },
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv * 2.0 - 1.0; // [-1,1]
          // face camera (billboard): ignoramos rotación del objeto manteniendo translate
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
          // suave con un poco de pulso
          float pulse = 0.85 + 0.15 * sin(25.0*uTime);
          float alpha = ring * pulse;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
            toneMapped: false as any,
        });
        return mat;
    }, [alwaysVisible]);

    // ————— Avance de tiempo para los shaders
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
                    // crecer en unidades de mundo (hasta longitud total real; se clamp-ea al dibujar)
                    growT: l.growT + l.growSpeed * dt,
                }))
                .filter((l) => l.ttl > 0)
        );
    });

    // Limpieza
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
                // 1) Resolver punto de impacto real (si hay hitTest)
                const desiredTo = (() => {
                    const h = hitTest?.(l.from, l.to);
                    return h ? h : l.to;
                })();
                const dirFull = new THREE.Vector3().subVectors(desiredTo, l.from);
                const fullLen = Math.max(0.0001, dirFull.length());
                const dirN = dirFull.clone().divideScalar(fullLen); // normalizado

                // 2) Longitud visible animada (crece desde el cañón)
                const visLen = Math.min(l.growT, fullLen);
                const currentTip = new THREE.Vector3().copy(l.from).addScaledVector(dirN, visLen);

                // 3) Orientación y posición del segmento visible
                const mid = new THREE.Vector3().copy(l.from).addScaledVector(dirN, visLen * 0.5);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirN);

                // Colores por tipo
                const color = l.color === "green" ? 0x00ff66 : 0xff3333;

                return (
                    <group key={l.id} position={mid} quaternion={q} renderOrder={renderOrder} frustumCulled={false}>
                        {/* —— Núcleo */}
                        <mesh geometry={unitCylinder} frustumCulled={false} scale={[coreRadius, coreRadius, visLen]}>
                            <primitive
                                attach="material"
                                object={coreMat}
                                onUpdate={(m: THREE.ShaderMaterial) => {
                                    m.uniforms.uColor.value.setHex(color);
                                }}
                            />
                        </mesh>

                        {/* —— Halo */}
                        <mesh geometry={unitCylinder} frustumCulled={false} scale={[glowRadius, glowRadius, visLen]}>
                            <primitive
                                attach="material"
                                object={glowMat}
                                onUpdate={(m: THREE.ShaderMaterial) => {
                                    m.uniforms.uColor.value.setHex(color);
                                }}
                            />
                        </mesh>

                        {/* —— Muzzle flash (más pequeño, en el cañón) */}
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

                        {/* —— Glow en la punta: si aún no llegó al impacto, muestra la punta viajando;
                        si ya llegó (visLen == fullLen), actúa como impact glow */}
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
