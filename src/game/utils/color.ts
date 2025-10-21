// =======================================
// FILE: src/game/utils/color.ts
// =======================================
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function lerpHex(a: string, b: string, t: number) {
    const hex = (s: string) => s.replace("#", "").padStart(6, "0").slice(0, 6);
    const ah = hex(a), bh = hex(b);
    const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
    const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
    const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
    const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
    const b2 = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
    return `#${r}${g}${b2}`;
}

// Hex (#rrggbb) -> rgba(r,g,b,a) seguro
export function rgbaFromHex(hex: string, alpha = 1) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r},${g},${b},${a})`;
}

// rojo -> naranja -> cian (para AmmoBar)
export function rampAmmoColor(frac01: number) {
    const C_RED = "#ff3b3b";
    const C_ORANGE = "#ff8a00";
    const C_CYAN = "#22d3ee";
    const t = clamp01(frac01);
    return t < 0.5 ? lerpHex(C_RED, C_ORANGE, t / 0.5) : lerpHex(C_ORANGE, C_CYAN, (t - 0.5) / 0.5);
}
