// =======================================
// FILE: src/hooks/useUiClick.ts
// =======================================

import { useCallback, useEffect } from "react";
import { ASSETS } from "../constants/assets";
import { audioManager } from "../game/utils/audio/audio";

/**
 * Hook de click UI compartido:
 * - Pre-carga el sonido de botón (idempotente).
 * - Devuelve una función que reproduce el click usando el canal UI del audioManager.
 */
export function useUiClick() {
    useEffect(() => {
        // Precarga segura (si ya está cargado, no pasa nada).
        audioManager.loadMany([ASSETS.audio.buttonSound]).catch(() => { });
    }, []);

    return useCallback(() => {
        audioManager.playUi(ASSETS.audio.buttonSound);
    }, []);
}