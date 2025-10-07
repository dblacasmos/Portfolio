/* ====================================
   FILE: src/game/utils/three/fixThreeColorAlpha.ts
   ==================================== */
import * as THREE from "three";

/**
 * Parche defensivo: si alguien pasa "rgba(r,g,b,a)" a THREE.Color,
 * ignoramos el alfa para evitar el warning ruidoso.
 * El alfa debe gestionarse con material.opacity / transparent.
 */
let patched = false;
export function patchThreeColorAlphaWarning() {
    if (patched) return;
    patched = true;
    const orig = (THREE.Color.prototype as any).setStyle;
    (THREE.Color.prototype as any).setStyle = function (style: any) {
        if (typeof style === "string") {
            const m = style.match(
                /^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)\s*$/i
            );
            if (m) {
                const r = Math.max(0, Math.min(255, parseFloat(m[1]))) / 255;
                const g = Math.max(0, Math.min(255, parseFloat(m[2]))) / 255;
                const b = Math.max(0, Math.min(255, parseFloat(m[3]))) / 255;
                this.setRGB(r, g, b);
                return this;
            }
        }
        return orig.call(this, style);
    };
}
