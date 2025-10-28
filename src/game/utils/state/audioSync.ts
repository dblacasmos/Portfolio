// ===============================================
// FILE: src/game/utils/state/audioSync.ts
// ===============================================
import { StateCreator } from "zustand";
import { audioManager } from "../audio/audio";
import { CFG } from "@/constants/config";

type HasAudioAndMenu = {
    volumes: { music: number; sfx: number };
    menuOpen: boolean;
    globalMute: boolean;
    loadingPct: number;
};

// decide si debemos mutear globalmente
const calcDesiredMute = (s: HasAudioAndMenu) => {
    const muteByFlag = !!s.globalMute;
    const muteByLoading =
        !!(CFG.audio?.muteDuringLoading) && s.loadingPct > 0 && s.loadingPct < 100;
    return muteByFlag || muteByLoading;
};

export const withAudioSync =
    <T extends HasAudioAndMenu>(config: StateCreator<T>): StateCreator<T> =>
        (set, get, api) => {
            // Wrapper compatible con las 2 sobrecargas de Zustand (replace true/false)
            const setWithSync = ((partial: any, replace?: boolean) => {
                const prev = get();
                (set as any)(partial, replace);
                const next = get();

                // --- Volúmenes ---
                if (prev.volumes.music !== next.volumes.music) {
                    audioManager.setMusicVol(Math.max(0, Math.min(1, next.volumes.music)));
                }
                if (prev.volumes.sfx !== next.volumes.sfx) {
                    audioManager.setSfxVol(Math.max(0, Math.min(1, next.volumes.sfx)));
                }

                // --- Ducking de menú ---
                if (prev.menuOpen !== next.menuOpen) {
                    const duckM = CFG.audio?.duckMenu?.musicTo ?? 0.2;
                    const duckS = CFG.audio?.duckMenu?.sfxTo ?? 0.1;
                    if (next.menuOpen) audioManager.enterMenuMode(duckM, duckS);
                    else audioManager.exitMenuMode();
                }

                // --- Mute global (flag + loading opcional) ---
                if (prev.globalMute !== next.globalMute || prev.loadingPct !== next.loadingPct) {
                    audioManager.setGlobalMute(calcDesiredMute(next));
                }
            }) as typeof set;

            // Crear el estado real usando nuestro set envuelto
            const initialState = config(setWithSync, get, api);

            // Sincronización inicial (microtask para correr tras la creación del store)
            Promise.resolve().then(() => {
                const s = api.getState() as T;
                audioManager.setMusicVol(Math.max(0, Math.min(1, s.volumes.music)));
                audioManager.setSfxVol(Math.max(0, Math.min(1, s.volumes.sfx)));
                if (s.menuOpen) {
                    const duckM = CFG.audio?.duckMenu?.musicTo ?? 0.2;
                    const duckS = CFG.audio?.duckMenu?.sfxTo ?? 0.1;
                    audioManager.enterMenuMode(duckM, duckS);
                }
                audioManager.setGlobalMute(calcDesiredMute(s));
            });

            return initialState;
        };