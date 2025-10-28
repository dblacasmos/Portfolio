/* ====================================
   FILE: src/game/graphics/quality.ts
   ==================================== */
import { CFG } from "@/constants/config";

// --- Helper de escritura segura en CFG (evita TS2540 y objetos readonly) ---
function setCfg<T extends object>(obj: T, keyPath: (string | number | symbol)[], value: any) {
    let target: any = obj;
    for (let i = 0; i < keyPath.length - 1; i++) {
        const k = keyPath[i];
        target = target?.[k];
        if (target == null) return; // ruta inexistente: no hacemos nada
    }
    const last = keyPath[keyPath.length - 1];
    try {
        // Intento 1: redefinir propiedad (por si es non-writable)
        Object.defineProperty(target, last, { value, configurable: true, writable: true });
    } catch { }
    try {
        // Intento 2: asignación directa
        (target as any)[last] = value;
    } catch { }
}

export type QualityMode = "low" | "medium" | "high" | "auto";

type Preset = { dprMax: number; maxTextureSize: number };
const PRESETS: Record<Exclude<QualityMode, "auto">, Preset> = {
    low: { dprMax: 1.0, maxTextureSize: 1024 },
    medium: { dprMax: 1.1, maxTextureSize: 2048 },
    high: { dprMax: 1.5, maxTextureSize: 4096 },
};

const STORAGE_KEY = "game.qualityMode";

let current: QualityMode = ((): QualityMode => {
    const v = (typeof localStorage !== "undefined" ? (localStorage.getItem(STORAGE_KEY) || "") : "").toLowerCase();
    return (["low", "medium", "high", "auto"] as QualityMode[]).includes(v as QualityMode)
        ? (v as QualityMode)
        : "medium";
})();

function applyPreset(p: Preset) {
    // Mutamos CFG de forma segura para que el Canvas lo recoja en el siguiente render
    setCfg(CFG as any, ["hud", "ui", "dprMax"], p.dprMax);
    setCfg(CFG as any, ["render", "maxTextureSize"], p.maxTextureSize);
}

export function getQuality(): QualityMode {
    return current;
}

export function setQuality(mode: QualityMode) {
    current = mode;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { }
    if (mode !== "auto") applyPreset(PRESETS[mode]);
    // Avisamos al resto del juego (Game.tsx escucha esto para remount suave del Canvas)
    try { window.dispatchEvent(new CustomEvent("quality-changed", { detail: { mode } })); } catch { }
}

// ---- Auto (regulado por FPS) ----
// Histéresis para evitar "flapping"
let upHold = 0;
let downHold = 0;
const UP_HOLD_FRAMES = 30;    // ~0.5s a 60fps
const DOWN_HOLD_FRAMES = 20;  // ~0.33s a 60fps

function nextFrom(currentFixed: Exclude<QualityMode, "auto">, dir: 1 | -1): Exclude<QualityMode, "auto"> {
    const order: Exclude<QualityMode, "auto">[] = ["low", "medium", "high"];
    const i = order.indexOf(currentFixed);
    const j = Math.max(0, Math.min(order.length - 1, i + dir));
    return order[j];
}

export function feedAutoFpsSample(fps: number) {
    if (current !== "auto") return;

    // Mapeamos CFG -> nombre preset actual más cercano
    let cur: Exclude<QualityMode, "auto"> = "medium";
    const dpr = (CFG as any)?.hud?.ui?.dprMax ?? PRESETS.medium.dprMax;
    const mts = (CFG as any)?.render?.maxTextureSize ?? PRESETS.medium.maxTextureSize;
    if (dpr <= PRESETS.low.dprMax && mts <= PRESETS.low.maxTextureSize) cur = "low";
    else if (dpr >= PRESETS.high.dprMax && mts >= PRESETS.high.maxTextureSize) cur = "high";

    // Umbrales
    const wantDown = fps < 45; // cae rendimiento -> bajar
    const wantUp = fps > 70; // holgura -> subir

    if (wantDown && cur !== "low") {
        downHold++; upHold = 0;
        if (downHold >= DOWN_HOLD_FRAMES) {
            cur = nextFrom(cur, -1);
            applyPreset(PRESETS[cur]);
            downHold = 0;
            try { window.dispatchEvent(new CustomEvent("quality-changed", { detail: { mode: "auto" } })); } catch { }
        }
        return;
    }
    if (wantUp && cur !== "high") {
        upHold++; downHold = 0;
        if (upHold >= UP_HOLD_FRAMES) {
            cur = nextFrom(cur, +1);
            applyPreset(PRESETS[cur]);
            upHold = 0;
            try { window.dispatchEvent(new CustomEvent("quality-changed", { detail: { mode: "auto" } })); } catch { }
        }
        return;
    }
    // estable
    upHold = 0; downHold = 0;
}

// Al cargar, aplicamos preset si no es auto
if (current !== "auto") {
    applyPreset(PRESETS[current]);
}

export const Quality = {
    get: getQuality,
    set: setQuality,
    feedAutoFpsSample,
    presets: PRESETS,
};

export default Quality;
