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

/**
 * Sistema de render de láseres con geometrías persistentes por color.
 * Evita crear objetos por frame y reduce GC pressure.
 */
export const LaserSystem: React.FC<{
    lasers: Laser[];
    setLasers: React.Dispatch<React.SetStateAction<Laser[]>>;
    renderOrder?: number;
    layer?: number;
}> = ({ lasers, setLasers, renderOrder = 9000, layer = CFG.layers.SHOTS }) => {
    const matGreen = useMemo(
        () => new THREE.LineBasicMaterial({
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
        () => new THREE.LineBasicMaterial({
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

    const MAX_LASERS = 64;
    const greenPos = useMemo(() => new Float32Array(MAX_LASERS * 6), []);
    const redPos = useMemo(() => new Float32Array(MAX_LASERS * 6), []);

    const geoGreen = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(greenPos, 3));
        return g;
    }, [greenPos]);

    const geoRed = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(redPos, 3));
        return g;
    }, [redPos]);

    // Decaimiento TTL de los láseres
    useFrame((_, dt) => {
        if (!lasers.length) return;
        setLasers((ls) => ls.map((l) => ({ ...l, ttl: l.ttl - dt })).filter((l) => l.ttl > 0));
    });

    // Actualiza buffers por color (una sola geometría por color)
    useFrame(() => {
        let gCount = 0, rCount = 0;
        for (let i = 0; i < lasers.length; i++) {
            const l = lasers[i];
            if (l.color === "red") {
                if (rCount >= MAX_LASERS) continue; // clamp rojo
                const off = (rCount++) * 6;
                redPos[off + 0] = l.from.x; redPos[off + 1] = l.from.y; redPos[off + 2] = l.from.z;
                redPos[off + 3] = l.to.x; redPos[off + 4] = l.to.y; redPos[off + 5] = l.to.z;
            } else {
                if (gCount >= MAX_LASERS) continue; // clamp verde
                const off = (gCount++) * 6;
                greenPos[off + 0] = l.from.x; greenPos[off + 1] = l.from.y; greenPos[off + 2] = l.from.z;
                greenPos[off + 3] = l.to.x; greenPos[off + 4] = l.to.y; greenPos[off + 5] = l.to.z;
            }
        }

        geoGreen.setDrawRange(0, Math.min(gCount * 2, MAX_LASERS * 2));
        (geoGreen.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

        geoRed.setDrawRange(0, Math.min(rCount * 2, MAX_LASERS * 2));
        (geoRed.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    });

    return (
        <group
            renderOrder={renderOrder}
            frustumCulled={false}
            onUpdate={(g) => setLayerRecursive(g, layer)}
        >
            <lineSegments geometry={geoGreen} material={matGreen} />
            <lineSegments geometry={geoRed} material={matRed} />
        </group>
    );
};
