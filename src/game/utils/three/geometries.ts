// src/game/utils/three/geometries.ts
import * as THREE from "three";

let _unitPlane: THREE.PlaneGeometry | null = null;

/**
 * Devuelve un plano 1x1 compartido para HUD/FX.
 * Escala el mesh (mesh.scale.set(w,h,1)) en lugar de crear geometrías nuevas.
 */
export function getUnitPlane(): THREE.PlaneGeometry {
    if (!_unitPlane) {
        _unitPlane = new THREE.PlaneGeometry(1, 1, 1, 1);
        _unitPlane.computeVertexNormals();
    }
    return _unitPlane;
}
