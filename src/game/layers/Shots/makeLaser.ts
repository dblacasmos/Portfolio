// ================================================
// FILE: src/game/layers/Shots/makeLaser.ts
// ================================================
import * as THREE from "three";

export type Laser = {
    id: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    color: "red" | "green";
    ttl: number; // segundos restantes
};

let laserId = 1;

export const makeLaser = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: Laser["color"] = "green",
): Laser => ({
    id: laserId++,
    from: from.clone(),
    to: to.clone(),
    color,
    ttl: 0.2,
});
