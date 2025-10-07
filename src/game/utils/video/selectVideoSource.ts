/* ====================================
   FILE: src/game/utils/video/selectVideoSource.ts
   ==================================== */

export type SrcMap = { h1080?: string; h720?: string; h480?: string };
export type VideoPref = { maxHeight: number; preferHevc?: boolean };

/**
 * Elige la mejor URL de vídeo según las preferencias de calidad.
 * - ≥1080 → intenta 1080, luego 720, luego 480
 * - ≥720  → intenta 720,  luego 480
 * - <720  → intenta 480,  luego 720
 */
export function pickVideoSrc(map: SrcMap, pref: VideoPref): string {
    const order =
        pref.maxHeight >= 1080
            ? ["h1080", "h720", "h480"]
            : pref.maxHeight >= 720
                ? ["h720", "h480"]
                : ["h480", "h720"];

    for (const k of order) {
        const url = (map as any)[k];
        if (url) return url;
    }
    // Fallback por si falta todo
    return map.h480 ?? map.h720 ?? map.h1080 ?? "";
}

export default pickVideoSrc;
