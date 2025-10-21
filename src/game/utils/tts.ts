//src/game/utils/tts.ts
const FEMALE_HINTS = /(female|mujer|helena|laura|sofia|sofía|carmen|elena|montserrat|sara|luisa)/i;
const GOOGLE_MALE_CODE = /\b(Neural2|Standard)\s*-\s*(B|D)\b/i;

/** Voz ES por defecto (prioriza Google y evita nombres femeninos si hay B/D “masculinos”). */
export function pickDefaultSpanishGoogleVoice(voices: SpeechSynthesisVoice[] | undefined) {
    if (!voices || !voices.length) return null;
    const googleEs = voices.filter((v) => /google/i.test(v.name) && /^es/i.test(v.lang || "es"));
    if (googleEs.length) {
        const maleish = googleEs.find((v) => GOOGLE_MALE_CODE.test(v.name) && !FEMALE_HINTS.test(v.name));
        if (maleish) return maleish;
        const anyGoogleEs = googleEs.find((v) => !FEMALE_HINTS.test(v.name));
        return anyGoogleEs ?? googleEs[0];
    }
    const anyEs = voices.find((v) => /^es/i.test(v.lang || "es") && !FEMALE_HINTS.test(v.name));
    return anyEs || voices[0];
}