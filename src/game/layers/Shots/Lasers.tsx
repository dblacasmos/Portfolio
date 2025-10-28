// ====================================
// FILE: src/game/layers/Shots/Lasers.tsx
// ====================================
import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CFG } from "@/constants/config";
import { setLayerRecursive } from "@/game/utils/three/layers";
import type { Laser } from "./makeLaser";
export { makeLaser } from "./makeLaser";
export type { Laser };

export const LaserSystem: React.FC<{
    lasers: Laser[];
    setLasers: React.Dispatch<React.SetStateAction<Laser[]>>;
    renderOrder?: number; // sobre escena, bajo arma/HUD
    layer?: number;       // capa opcional (default: SHOTS)
}> = ({ lasers, setLasers, renderOrder = 9000, layer = CFG.layers.SHOTS }) => {
    // Materiales con blending aditivo; depthTest on para recorte con geometría
    const matGreen = useMemo(
        () =>
            new THREE.LineBasicMaterial({
                color: 0x00ff66 as any,
                depthTest: true,
                depthWrite: false,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 1,
                toneMapped: false as any,
            }),
        []
    );
    const matRed = useMemo(
        () =>
            new THREE.LineBasicMaterial({
                color: 0xff3333 as any,
                depthTest: true,
                depthWrite: false,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 1,
                toneMapped: false as any,
            }),
        []
    );

    useFrame((_, dt) => {
        if (!lasers.length) return;
        setLasers((ls) => ls.map((l) => ({ ...l, ttl: l.ttl - dt })).filter((l) => l.ttl > 0));
    });

    return (
        <group
            renderOrder={renderOrder}
            frustumCulled={false}
            onUpdate={(g) => setLayerRecursive(g, layer)}
        >
            {lasers.map((l) => {
                const arr = new Float32Array([
                    l.from.x, l.from.y, l.from.z,
                    l.to.x, l.to.y, l.to.z,
                ]);
                return (
                    <lineSegments key={l.id} renderOrder={renderOrder} frustumCulled={false}>
                        <bufferGeometry attach="geometry">
                            <bufferAttribute
                                attach="attributes-position"
                                args={[arr, 3]}
                                onUpdate={(a) => (a.needsUpdate = true)}
                            />
                        </bufferGeometry>
                        <primitive attach="material" object={l.color === "green" ? matGreen : matRed} />
                    </lineSegments>
                );
            })}
        </group>
    );
};
