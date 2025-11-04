/*  ===================================
    FILE: src/game/utils/state/store.ts
    =================================== */
import { create } from "zustand";
import { CFG } from "@/constants/config";
import { withAudioSync } from "./audioSync";
import { ASSETS } from "@/constants/assets";
import { audioManager } from "@/game/utils/audio/audio";

export type AudioVolumes = { music: number; sfx: number };
export type MissionCardMode = "intro" | "post-kill" | null;
export type Hand = "right" | "left";
export type AdsMode = "hold" | "toggle";
export type AccessOverlayItem = { id: number; index: number; text: string };

export type GameState = {
    // Flags UI/juego
    menuOpen: boolean;
    playing: boolean;
    loadingPct: number;     // 0..100
    globalMute: boolean;

    // Estado gameplay/HUD
    dronesDestroyed: number;
    dronesTotal: number;
    ammoInMag: number;
    ammoReserve: number;
    reloading: boolean;
    health: number;
    shield: number;
    crosshairOnDrone: boolean;
    missionCardMode: MissionCardMode;
    endDoorEnabled: boolean;
    allDronesDown: boolean;

    // Preferencias
    hand: Hand;
    adsMode: AdsMode;

    // Audio
    volumes: AudioVolumes;

    // === Acciones ===
    setMenuOpen: (v: boolean) => void;
    setPlaying: (v: boolean) => void;
    setLoadingPct: (v: number) => void;
    setGlobalMute: (v: boolean) => void;

    setCrosshairOnDrone: (v: boolean) => void;

    // Drones
    setDrones: (destroyed: number, total: number) => void;
    setDronesTotal: (n: number) => void;
    incDestroyed: () => void;

    // Overlay simple, sin cola ni temporizador
    accessOverlay: { visible: boolean; index: number; text: string };
    showAccessOverlay: (index: number, text: string) => void;
    hideAccessOverlay: () => void;

    // Vida/escudo
    setHealth: (n: number) => void;
    setShield: (n: number) => void;

    // Munición/recarga
    setAmmo: (mag: number, reserve: number) => void;
    consumeBullet: () => void;
    addAmmo: (n: number) => void;
    setReloading: (v: boolean) => void;

    // Misiones/puerta final
    setMissionCard: (m: MissionCardMode) => void;
    setEndDoorEnabled: (v: boolean) => void;

    // Marca que todos los drones ya han caído (no muestra la puerta)
    markAllDronesDown: () => void;

    // Audio
    setVolumes: (v: Partial<AudioVolumes>) => void;

    // Preferencias
    setHand: (h: Hand) => void;
    setAdsMode: (m: AdsMode) => void;

    // Resets
    resetGame: () => void;
    resetForNewRun: () => void;
};

// Helpers seguros con SSR
const readLocal = (k: string) => {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(k);
    } catch {
        return null;
    }
};
const writeLocal = (k: string, v: string) => {
    try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(k, v);
    } catch { }
};

// Normaliza "left" | "right" desde localStorage y/o CFG
const readHand = (): Hand => {
    const ls = (readLocal("game.hand") || "").toLowerCase();
    const cfg = (((CFG as any)?.player?.hand) || "").toLowerCase();
    const v = (ls || cfg) === "left" ? "left" : "right";
    return v as Hand;
};

const readAdsMode = (): AdsMode => {
    const cfgVal = ((CFG as any)?.look?.adsMode as string | undefined)?.toLowerCase();
    const lsVal = (readLocal("game.adsMode") || "").toLowerCase();
    const v = (lsVal || cfgVal || "toggle") as string;
    return v === "hold" ? "hold" : "toggle";
};

// ---- Estado base (de CONFIG) ----
const initialFromConfig = () => ({
    // Mostramos el menú al arrancar; tras el overlay se cierra con resetForNewRun()
    menuOpen: true,
    playing: false,
    loadingPct: 0,
    globalMute: false,

    dronesDestroyed: 0,
    dronesTotal: Math.max(0, CFG.gameplay?.dronesTotal ?? 0),

    ammoInMag: Math.max(0, CFG.gameplay?.playerMagSize ?? 10),
    ammoReserve: Math.max(0, CFG.gameplay?.playerAmmoTotal ?? 0),
    reloading: false,

    health: 100,
    shield: 100,
    crosshairOnDrone: false,
    missionCardMode: null as MissionCardMode,
    endDoorEnabled: false,
    allDronesDown: false,

    hand: readHand(),   // LS/CFG
    adsMode: readAdsMode(),

    volumes: {
        music: Math.max(0, Math.min(1, CFG.audio?.musicVolume ?? 0.8)),
        sfx: Math.max(0, Math.min(1, CFG.audio?.sfxVolume ?? 0.8)),
    } as AudioVolumes,
});

type BaseState = ReturnType<typeof initialFromConfig>;
const INITIAL: BaseState = initialFromConfig();

export const useGameStore = create<GameState>()(
    withAudioSync((set, get) => ({
        ...INITIAL,

        // ---- Mutators básicos ----
        setMenuOpen: (v) => set({ menuOpen: v }),
        setPlaying: (v) => set({ playing: v }),
        setLoadingPct: (v) => set({ loadingPct: Math.max(0, Math.min(100, v)) }),
        setGlobalMute: (v) => set({ globalMute: !!v }),

        setCrosshairOnDrone: (v) => set({ crosshairOnDrone: v }),

        // ---- Drones ----
        setDrones: (destroyed, total) => {
            const d = Math.max(0, Math.min(total, destroyed));
            const t = Math.max(0, total);
            set({
                dronesDestroyed: d,
                dronesTotal: t,
                allDronesDown: d >= t && t > 0,
            });
        },

        setDronesTotal: (n) => {
            const d = get().dronesDestroyed;
            const total = Math.max(0, n);
            set({
                dronesTotal: total,
                allDronesDown: d >= total && total > 0,
            });
        },

        incDestroyed: () => {
            const total = get().dronesTotal;
            const next = Math.min(total, get().dronesDestroyed + 1);
            set({
                dronesDestroyed: next,
                allDronesDown: next >= total && total > 0,
            });
        },

        accessOverlay: { visible: false, index: 0, text: "" },
        showAccessOverlay: (index, text) => {
            set({ accessOverlay: { visible: true, index, text } });
        },
        hideAccessOverlay: () => {
            set({ accessOverlay: { ...get().accessOverlay, visible: false } });
        },

        // ---- Vida/escudo ----
        setHealth: (n) => set({ health: Math.max(0, Math.min(100, n)) }),
        setShield: (n) => set({ shield: Math.max(0, Math.min(100, n)) }),

        // ---- Munición/recarga ----
        setAmmo: (mag, reserve) =>
            set({
                ammoInMag: Math.max(0, mag | 0),
                ammoReserve: Math.max(0, reserve | 0),
            }),

        consumeBullet: () => {
            const m = get().ammoInMag;
            if (m > 0) {
                // Sonido de disparo cuando se consume una bala
                try { audioManager.playSfx(ASSETS.audio.shotLaser, 0.75); } catch { }
                set({ ammoInMag: m - 1 });
            }
        },

        addAmmo: (n) => set((s) => ({ ammoReserve: Math.max(0, s.ammoReserve + (n | 0)) })),
        setReloading: (v) => set({ reloading: v }),

        // ---- Misiones / puerta ----
        setMissionCard: (m) => set({ missionCardMode: m }),
        setEndDoorEnabled: (v) => set({ endDoorEnabled: v }),
        markAllDronesDown: () => {
            const d = get().dronesDestroyed;
            const t = get().dronesTotal;
            set({ allDronesDown: d >= t && t > 0 });
        },

        // ---- Audio ----
        setVolumes: (v) => set((s) => ({ volumes: { ...s.volumes, ...v } })),

        // ---- Preferencias ----
        setHand: (h) => {
            const v: Hand = h === "left" ? "left" : "right";
            set({ hand: v });
            writeLocal("game.hand", v);
            try { window.dispatchEvent(new CustomEvent("hand-changed", { detail: { hand: v } })); } catch { }
        },

        setAdsMode: (m) => {
            const mode: AdsMode = m === "hold" ? "hold" : "toggle";
            set({ adsMode: mode });
            writeLocal("game.adsMode", mode);
            try { window.dispatchEvent(new CustomEvent("ads-mode", { detail: { mode } })); } catch { }
        },

        // ---- Resets ----
        resetGame: () =>
            set({
                ...initialFromConfig(),
                menuOpen: true,
                playing: false,
                loadingPct: 0,
            }),

        resetForNewRun: () =>
            set({
                ...initialFromConfig(),
                menuOpen: false,
                playing: true,
                loadingPct: 0,
            }),
    }))
);

// DEBUG rápido en consola
if (typeof window !== "undefined") {
    (window as any).gameState = () => useGameStore.getState();
    (window as any).setGame = (p: Partial<GameState>) => useGameStore.setState(p);
}
