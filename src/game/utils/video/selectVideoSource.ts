/* ====================================
   FILE: src/game/utils/video/selectVideoSource.ts
   ==================================== */

export type SrcMap = { h1080?: string; h720?: string; h480?: string };
export type VideoPref = { maxHeight: number; preferHevc?: boolean };

type SrcKey = keyof SrcMap; // "h1080" | "h720" | "h480"
const ORDER_1080 = ["h1080", "h720", "h480"] as const;
const ORDER_720 = ["h720", "h480"] as const;
const ORDER_480 = ["h480", "h720"] as const;

/**
 * Elige la mejor URL de vídeo según las preferencias de calidad.
 * - ≥1080 → intenta 1080, luego 720, luego 480
 * - ≥720  → intenta 720,  luego 480
 * - <720  → intenta 480,  luego 720
 */
export function pickVideoSrc(map: SrcMap, pref: VideoPref): string {
    const order: readonly SrcKey[] =
        pref.maxHeight >= 1080
            ? ORDER_1080
            : pref.maxHeight >= 720
                ? ORDER_720
                : ORDER_480;

    for (const k of order) {
        const url = map[k];
        if (url) return url;
    }
    // Fallback por si falta todo
    return map.h480 ?? map.h720 ?? map.h1080 ?? "";
}

export default pickVideoSrc;
