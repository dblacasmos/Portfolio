// ================================================
// FILE: src/game/layers/Shots/makeLaser.ts
// ================================================
import * as THREE from "three";

export type Laser = {
    id: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    color: "red" | "green";
    ttl: number;        // segundos restantes (vida total del destello/haz)
    growT: number;      // longitud visible actual (en unidades de mundo)
    growSpeed: number;  // velocidad de crecimiento del haz (unidades/seg)
};

let laserId = 1;

export const makeLaser = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: Laser["color"] = "green",
    ttl: number = 0.22,       // duración total del disparo
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
