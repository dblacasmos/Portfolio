// =======================================
// FILE: src/hooks/useUiClick.ts
// =======================================
import { useCallback, useEffect } from "react";
import { ASSETS } from "@/constants/assets";
import { audioManager } from "@/game/utils/audio/audio";

/**
 * Hook de click UI compartido:
 * - Pre-carga el sonido de botón (idempotente).
 * - Devuelve una función que reproduce el click usando el canal UI.
 */
export function useUiClick() {
    useEffect(() => {
        audioManager.loadMany([ASSETS.audio.buttonSound]).catch(() => { });
    }, []);

    return useCallback(() => {
        audioManager.playUi(ASSETS.audio.buttonSound);
    }, []);
}
