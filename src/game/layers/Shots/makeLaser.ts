// ================================================
// FILE: src/game/layers/Shots/makeLaser.ts
// ================================================
import * as THREE from "three";

export type Laser = {
    id: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    color: "red" | "green";
    ttl: number;        // vida total (s)
    growT: number;      // longitud visible actual (mundo)
    growSpeed: number;  // velocidad de crecimiento (m/s)
};

let laserId = 1;

export const makeLaser = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: Laser["color"] = "green",
    ttl: number = 0.22,       // duración del destello/haz
    growSpeed: number = 400   // ~metros/seg (ajusta a tu escala)
): Laser => ({
    id: laserId++,
    from: from.clone(),
    to: to.clone(),
    color,
    ttl,
    growT: 0,
    growSpeed,
});
