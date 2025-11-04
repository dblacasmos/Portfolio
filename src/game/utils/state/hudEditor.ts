/*  =======================================
    FILE: src/game/utils/state/hudEditor.ts
    =======================================*/
import { create } from "zustand";
import { CFG } from "@/constants/config";

export type DragMode = "move" | "resize";
export type OrthoId = "crosshair" | "ammo" | "health" | "shield" | "reload" | "counter" | "radar3d";
export type OrthoPos = { x: number; y: number };

type Dragging =
    | { kind: "r3f"; id: OrthoId; mode: DragMode }
    | { kind: null; id: null };

export type HudLayoutExport = {
    ortho: Partial<Record<OrthoId, OrthoPos>>;
    scale: Partial<Record<OrthoId, number>>;
};

type State = {
    enabled: boolean;
    dragMode: DragMode;
    dragging: Dragging;

    pos: Partial<Record<OrthoId, OrthoPos>>;
    scale: Partial<Record<OrthoId, number>>;

    reloadPreview: number; // 0..1
    selected: OrthoId | null;
    hovered: OrthoId | null;

    setEnabled: (v: boolean) => void;
    setDragMode: (m: DragMode) => void;
    startDragR3f: (id: OrthoId, mode: DragMode) => void;
    stopDrag: () => void;

    setPos: (id: OrthoId, p: OrthoPos) => void;
    setScale: (id: OrthoId, s: number) => void;
    nudgeScale: (id: OrthoId, mul: number) => void;

    setReloadPreview: (v: number) => void;
    setSelected: (id: OrthoId | null) => void;
    setHovered: (id: OrthoId | null) => void;

    resetAll: () => void;

    exportLayout: () => HudLayoutExport;
    setLayout: (layout: HudLayoutExport) => void;
    applyToCfg: () => void;

    listProfiles: () => string[];
    saveProfile: (name: string) => void;
    loadProfile: (name: string) => void;
};

const LS_KEY = "hud.layout.v3";
const LS_PROFILES = "hud.layout.v3.profiles";
const LS_ACTIVE = "hud.layout.v3.active";

function baseFromCfg() {
    const lo = (CFG.hud as any).layoutOverrides ?? {};
    const pos = (lo.ortho ?? {}) as Partial<Record<OrthoId, OrthoPos>>;
    const scale = (lo.scale ?? {}) as Partial<Record<OrthoId, number>>;
    return { pos, scale };
}

function readProfiles(): Record<string, HudLayoutExport> {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(LS_PROFILES) || "{}") || {}; } catch { return {}; }
}
function writeProfiles(map: Record<string, HudLayoutExport>) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_PROFILES, JSON.stringify(map)); } catch { }
}

function loadLS(): { pos: State["pos"]; scale: State["scale"] } {
    const seed = baseFromCfg();
    if (typeof window !== "undefined") {
        try {
            // Perfil activo
            const active = localStorage.getItem(LS_ACTIVE) || "";
            if (active) {
                const profiles = readProfiles();
                const lay = profiles[active];
                if (lay) {
                    return {
                        pos: { ...seed.pos, ...(lay.ortho ?? {}) },
                        scale: { ...seed.scale, ...(lay.scale ?? {}) },
                    };
                }
            }
            // Último layout suelto
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    pos: { ...seed.pos, ...(parsed.ortho ?? {}) },
                    scale: { ...seed.scale, ...(parsed.scale ?? {}) },
                };
            }
        } catch { /* seed abajo */ }
    }
    return seed;
}

function saveLS(s: Pick<State, "pos" | "scale">) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ortho: s.pos, scale: s.scale })); } catch { }
}

/** Toast corto en el editor */
function flash(text: string) {
    try { window.dispatchEvent(new CustomEvent("hud:toast", { detail: { text } })); } catch { }
}

/** Límites de escala por widget (para SHIFT+rueda) */
const MIN: Record<OrthoId, number> = {
    crosshair: 0.30, ammo: 0.35, health: 0.35, shield: 0.35,
    reload: 0.50, counter: 0.35, radar3d: 0.30,
};
const MAX: Record<OrthoId, number> = {
    crosshair: 3, ammo: 3, health: 3, shield: 3, reload: 3, counter: 3, radar3d: 4,
};

const SEED = loadLS();

export const useHudEditorStore = create<State>((set, get) => ({
    enabled: false,
    dragMode: "move",
    dragging: { kind: null, id: null },

    pos: SEED.pos ?? {},
    scale: SEED.scale ?? {},

    reloadPreview: 0.7,
    selected: null,
    hovered: null,

    setEnabled: (v) => set({ enabled: v }),
    setDragMode: (m) => set({ dragMode: m }),
    startDragR3f: (id, mode) => set({ dragging: { kind: "r3f", id, mode }, selected: id }),
    stopDrag: () => set({ dragging: { kind: null, id: null } }),

    setPos: (id, p) => {
        set((st) => {
            const pos = { ...(st.pos ?? {}), [id]: { x: p.x, y: p.y } };
            const next = { ...st, pos };
            saveLS(next);
            return next;
        });
    },

    setScale: (id, s) => {
        set((st) => {
            const min = MIN[id] ?? 0.25;
            const max = MAX[id] ?? 4;
            const scale = { ...(st.scale ?? {}), [id]: Math.max(min, Math.min(max, s)) };
            const next = { ...st, scale };
            saveLS(next);
            return next;
        });
    },

    nudgeScale: (id, mul) => set((st) => {
        const prev = st.scale?.[id] ?? 1;
        const min = MIN[id] ?? 0.25;
        const max = MAX[id] ?? 4;
        const next = Math.min(max, Math.max(min, prev * mul));
        const scale = { ...(st.scale ?? {}), [id]: next };
        const out = { ...st, scale };
        saveLS(out);
        return out;
    }),

    setReloadPreview: (v) => set({ reloadPreview: Math.max(0, Math.min(1, v)) }),
    setSelected: (id) => set({ selected: id }),
    setHovered: (id) => set({ hovered: id }),

    resetAll: () => {
        set(() => {
            try { localStorage.removeItem(LS_KEY); } catch { }
            flash("Cargando..."); // al restaurar, simula cargar defaults
            return { pos: {}, scale: {} } as any;
        });
    },

    exportLayout: () => {
        const st = get();
        return { ortho: st.pos ?? {}, scale: st.scale ?? {} };
    },

    setLayout: (layout) => {
        set(() => {
            const next = { pos: layout.ortho ?? {}, scale: layout.scale ?? {} } as Partial<State> as State;
            saveLS({ pos: next.pos, scale: next.scale });
            flash("Cargando...");
            return next;
        });
    },

    applyToCfg: () => {
        const st = get();
        const hud: any = CFG.hud as any;
        if (!hud.layoutOverrides) hud.layoutOverrides = {};
        hud.layoutOverrides.ortho = { ...(hud.layoutOverrides.ortho ?? {}), ...(st.pos ?? {}) };
        hud.layoutOverrides.scale = { ...(hud.layoutOverrides.scale ?? {}), ...(st.scale ?? {}) };
        saveLS({ pos: st.pos ?? {}, scale: st.scale ?? {} });
    },

    listProfiles: () => Object.keys(readProfiles()).sort(),

    saveProfile: (name: string) => {
        const map = readProfiles();
        map[name] = get().exportLayout();
        writeProfiles(map);
        try { localStorage.setItem(LS_ACTIVE, name); } catch { }
        flash("Guardando...");
    },

    loadProfile: (name: string) => {
        const map = readProfiles();
        const lay = map[name];
        if (!lay) return;
        get().setLayout(lay);
        get().applyToCfg();
        try { localStorage.setItem(LS_ACTIVE, name); } catch { }
        // setLayout ya dispara "Cargando..."
    },
}));

// Aplica inmediatamente el layout a CFG al importar en cliente
try {
    if (typeof window !== "undefined") {
        const st = useHudEditorStore.getState();
        st.applyToCfg();
    }
} catch { /* noop */ }
