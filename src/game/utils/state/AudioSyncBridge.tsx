import { useEffect } from "react";
import { useGameStore } from "./store";
import { audioManager } from "../audio/audio";
import { CFG } from "@/constants/config";

function calcDesiredMute(s: { globalMute: boolean; loadingPct: number }) {
    const muteByFlag = !!s.globalMute;
    const muteByLoading =
        !!(CFG.audio?.muteDuringLoading) && s.loadingPct > 0 && s.loadingPct < 100;
    return muteByFlag || muteByLoading;
}

export default function AudioSyncBridge() {
    // Selectores mínimos para no re-renderizar de más:
    const music = useGameStore((s) => s.volumes.music);
    const sfx = useGameStore((s) => s.volumes.sfx);
    const menuOpen = useGameStore((s) => s.menuOpen);
    const globalMute = useGameStore((s) => s.globalMute);
    const loadingPct = useGameStore((s) => s.loadingPct);

    // Volúmenes
    useEffect(() => {
        try { audioManager.setMusicVol(Math.max(0, Math.min(1, music))); } catch { }
    }, [music]);

    useEffect(() => {
        try { audioManager.setSfxVol(Math.max(0, Math.min(1, sfx))); } catch { }
    }, [sfx]);

    // Ducking de menú
    useEffect(() => {
        try {
            const duckM = CFG.audio?.duckMenu?.musicTo ?? 0.2;
            const duckS = CFG.audio?.duckMenu?.sfxTo ?? 0.1;
            if (menuOpen) audioManager.enterMenuMode(duckM, duckS);
            else audioManager.exitMenuMode();
        } catch { }
    }, [menuOpen]);

    // Mute global (flag + loading)
    useEffect(() => {
        try { audioManager.setGlobalMute(calcDesiredMute({ globalMute, loadingPct })); } catch { }
    }, [globalMute, loadingPct]);

    // Sincronización inicial (al montar)
    useEffect(() => {
        try {
            audioManager.setMusicVol(Math.max(0, Math.min(1, music)));
            audioManager.setSfxVol(Math.max(0, Math.min(1, sfx)));
            if (menuOpen) {
                const duckM = CFG.audio?.duckMenu?.musicTo ?? 0.2;
                const duckS = CFG.audio?.duckMenu?.sfxTo ?? 0.1;
                audioManager.enterMenuMode(duckM, duckS);
            }
            audioManager.setGlobalMute(calcDesiredMute({ globalMute, loadingPct }));
        } catch { }
    }, []); // solo una vez

    return null;
}
