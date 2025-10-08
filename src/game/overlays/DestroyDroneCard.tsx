/* =========================================================
   FILE: src/game/overlays/DestroyDroneCard.tsx
   PURPOSE: Tarjeta modal (HTML) tras destruir cada dron.
            - Reproduce video ASSETS.video.avatarMission
            - TTS en español (con selector de voz)
            - Texto 1..5 según dron destruido
            - Cierre manual (ESC o botón)
            - Pausa música mientras está activa
            - Funciona igual en fullscreen o no
            - Configurable vía CFG.hud.destroyDroneCard
========================================================= */

import React from "react";
import { createPortal } from "react-dom";
import { ASSETS } from "@/constants/assets";
import { useGameStore } from "../utils/state/store";
import { audioManager } from "../utils/audio/audio";
import { CFG } from "../../constants/config";
// Reutilizamos el selector común para evitar duplicidades
import VoiceSelect from "./VoiceSelect";

/* ===================== Utiles ===================== */

const FEMALE_HINTS = /(female|mujer|helena|laura|sofia|sofía|carmen|elena|montserrat|sara|luisa)/i;
const GOOGLE_MALE_CODE = /\b(Neural2|Standard)\s*-\s*(B|D)\b/i;

function pickDefaultSpanishGoogleVoice(voices: SpeechSynthesisVoice[] | undefined) {
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

function rgbaFromHex(hex: string, alpha = 1) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/* ===================== Textos por dron ===================== */

const TXT1 = `Accediendo al archivo número 1
Estado: Desclasificado
Sujeto: David Blanco
Operación: Graduado ESO
Origen: IES Velázquez, Móstoles
A los 18, por necesidad familiar, ingresa en Fuerzas Armadas.
Servicio: 2004–2012 | Base: Madrid.
Despliegues clave: Bosnia, Afganistán, Líbano — logística-humanitaria y liderazgo en zona hostil.
Rasgos operativos: disciplina férrea, adaptación instantánea, trabajo en equipo.
Rol: Cabo–Apoyo — reabastece, abre rutas seguras y potencia la coordinación del escuadrón.
Habilidad adquirida: “Corredor Humanitario”.
Fin del archivo.`;

const TXT2 = `Accediendo al archivo número 2
Estado: Desclasificado
Sujeto: David Blanco
Operación: Acceso Universidad + de (25)
Periodo: 2013–2014 | Lugar: UNED
Transición: tras servicio militar, reorientación académica.
Entrenamiento: estudio autónomo, gestión del tiempo, método analítico, constancia.
Rol: Estratega Académico
Habilidad: “Briefing Exprés”
Fin del archivo.`;

const TXT3 = `Accediendo al archivo número 3
Estado: Desclasificado
Sujeto: David Blanco
Operación: Certificado Profesional Vigilancia y Escolta
Origen: Academia SEF
Periodo: 2014–2015
Despliegue civil: — Vigilante de Seguridad en organización "Securitas" (Madrid, 2016–2018), aplicando medidas preventivas y protocolos; reducción de incidentes 33% mediante mejora continua y análisis de riesgos.
Rasgos operativos: observación táctica, respuesta rápida, gestión de amenazas en entorno urbano.
Rol: Centinela Urbano — control de perímetro, ping de amenazas y refuerzo de entrada.
Habilidad: “Zona Segura”.
Fin del archivo.`;

const TXT4 = `Accediendo al archivo número 4
Estado: Desclasificado
Sujeto: David Blanco
Operación: Técnico Auxiliar de Intervención
Organización: Fundación Siglo XXI
Periodo: 2018–Actualidad | Lugar: Madrid
Logros clave: coordinación de equipos multidisciplinares; protocolos preventivos con –47% de incidentes; gestión de emergencias en entornos sensibles.
Rasgos operativos: sangre fría en situaciones de estrés, comunicación crítica, mando en crisis.
Rol: Interventor Táctico — estabiliza zonas calientes conflictivas.
Habilidad: “Protocolo Alfa-47” (paquete de intervención que reduce daño, acelera curación y revela amenazas por tiempo limitado).
Fin del archivo.`;

const TXT5 = `Accediendo al archivo número 5
Estado: Desclasificado
Sujeto: David Blanco
Operación: Formación en curso
Programa: Grado Superior DAM — 2.º curso — UAX (2024–2025)
Especialidad paralela: Big Data & IA
Contexto: compagina trabajo operativo actual con estudio avanzado: arquitectura multiplataforma, analítica de datos, automatización y modelos de IA.
Rasgos operativos: aprendizaje continuo, pensamiento sistémico, decisiones guiadas por datos.
Rol: Analista Multiplataforma.
Habilidad: “Overwatch de Datos”.
Fin del archivo.`;

/* ===================== DestroyDroneCard ===================== */

const DestroyDroneCard: React.FC = () => {
    const C = (CFG as any)?.hud?.destroyDroneCard ?? {};
    const access = useGameStore((s) => s.accessOverlay);
    const hideAccessOverlay = (useGameStore as any).getState().hideAccessOverlay as () => void;

    const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
    const [selectedURI, setSelectedURI] = React.useState<string | null>(null);
    const [typed, setTyped] = React.useState<string>("");
    const [speaking, setSpeaking] = React.useState(false);
    const [showClose, setShowClose] = React.useState(false);

    const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    // Portal en fullscreen: montamos el overlay dentro del elemento en fullscreen (o body si no)
    const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null);

    // Control fino
    const sessionRef = React.useRef(0);
    const boundariesSeenRef = React.useRef(false);
    const startedRef = React.useRef(false);
    const ttsFinishedRef = React.useRef(false);
    const charIdxRef = React.useRef(0);
    const writerRunningRef = React.useRef(false);
    const writerRafRef = React.useRef<number | null>(null);
    const visibleRef = React.useRef(false);

    // Layout responsive (apila en narrow)
    const [isNarrow, setIsNarrow] = React.useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth < 860 : false));
    React.useEffect(() => {
        const onResize = () => setIsNarrow(window.innerWidth < 860);
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Texto según índice (1..5)
    const fullText = React.useMemo(() => {
        const i = access.index | 0;
        if (i === 1) return TXT1;
        if (i === 2) return TXT2;
        if (i === 3) return TXT3;
        if (i === 4) return TXT4;
        if (i === 5) return TXT5;
        return "";
    }, [access.index]);

    /* ===== Cursor y bloqueo de ESC menú mientras esté visible ===== */
    React.useEffect(() => {
        visibleRef.current = access.visible;
        if (!access.visible) return;
        try { (window as any).__squelchMenuEsc = true; } catch { }
        try {
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor", "hud-cursor");
        } catch { }
        return () => { try { (window as any).__squelchMenuEsc = false; } catch { } };
    }, [access.visible]);

    /* ===== Pausar música mientras esté activo ===== */
    React.useEffect(() => {
        if (!access.visible) return;
        let resume: (() => void) | null = null;
        try {
            const am: any = audioManager;
            if (typeof am?.pauseMusic === "function" && typeof am?.resumeMusic === "function") {
                am.pauseMusic(); resume = () => am.resumeMusic();
            } else if (am?.music?.pause) {
                const wasPaused = !!am.music.paused;
                am.music.pause();
                resume = () => { if (!wasPaused) am.music.play?.(); };
            } else if (Array.isArray(am?.tracks)) {
                const resumeList: Array<() => void> = [];
                am.tracks.forEach((t: any) => {
                    if (t?.type === "music" && typeof t?.pause === "function") {
                        const wasPaused = !!t.paused; t.pause();
                        resumeList.push(() => { if (!wasPaused) t.play?.(); });
                    }
                });
                resume = () => resumeList.forEach((fn) => fn());
            } else {
                const prev: number = am?.getMasterVolume?.() ?? am?.getVolume?.() ?? (typeof am?.masterVolume === "number" ? am.masterVolume : 1);
                if (am?.setMasterVolume) am.setMasterVolume(0);
                else if (am?.setVolume) am.setVolume(0);
                else if ("masterVolume" in am) (am as any).masterVolume = 0;
                resume = () => {
                    if (am?.setMasterVolume) am.setMasterVolume(prev);
                    else if (am?.setVolume) am.setVolume(prev);
                    else if ("masterVolume" in am) (am as any).masterVolume = prev;
                };
            }
        } catch { }
        return () => { try { resume?.(); } catch { } };
    }, [access.visible]);

    /* ===== Voces ===== */
    React.useEffect(() => {
        const load = () => setVoices(window.speechSynthesis.getVoices());
        load();
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);

    React.useEffect(() => {
        if (!access.visible || !voices.length) return;
        const def = pickDefaultSpanishGoogleVoice(voices);
        setSelectedURI(def?.voiceURI ?? null);
    }, [access.visible, voices]);

    /* ===== Reset DURO al abrir ===== */
    React.useEffect(() => {
        if (!access.visible) return;
        sessionRef.current++;
        const sid = sessionRef.current;

        try { window.speechSynthesis.cancel(); } catch { }
        startedRef.current = false;
        ttsFinishedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        charIdxRef.current = 0;

        setTyped("");
        setSpeaking(false);
        setShowClose(false);

        // Crear portal dentro del root inmersivo o del fullscreen target (si no es el canvas), o body.
        try {
            const fsRootFromWin = (window as any).__fsRoot?.current as HTMLElement | null;
            const fsEl = document.fullscreenElement as HTMLElement | null;
            const target =
                fsRootFromWin ||
                document.getElementById("fs-root") ||
                ((fsEl && fsEl.tagName !== "CANVAS") ? fsEl : null) ||
                (document.querySelector("[data-immersive-root]") as HTMLElement | null) ||
                document.body;

            const holder = document.createElement("div");
            holder.style.position = "fixed";
            holder.style.inset = "0";
            holder.style.zIndex = "2147483647";
            holder.style.pointerEvents = "none";
            target.appendChild(holder);
            setPortalEl(holder);
        } catch {
            setPortalEl(document.body);
        }

        return () => {
            if (sid === sessionRef.current) {
                try { window.speechSynthesis.cancel(); } catch { }
                try {
                    if (portalEl && portalEl.parentElement) portalEl.parentElement.removeChild(portalEl);
                } catch { }
                setPortalEl(null);
                if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
                writerRunningRef.current = false;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [access.visible]);

    /* ===== Vídeo ===== */
    const ensureVideoPlaying = React.useCallback(() => {
        try { videoRef.current?.play().catch(() => { }); } catch { }
    }, []);

    React.useEffect(() => {
        if (!access.visible) return;
        ensureVideoPlaying();
        const onVis = () => { if (!document.hidden) ensureVideoPlaying(); };
        document.addEventListener("visibilitychange", onVis, true);
        return () => document.removeEventListener("visibilitychange", onVis, true);
    }, [access.visible, ensureVideoPlaying]);

    /* ===== Typewriter ===== */
    const startWriter = React.useCallback(() => {
        if (writerRunningRef.current) return;
        if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
        writerRunningRef.current = true;

        const baseMs = 30;
        const pause = 160;
        let t0 = 0;
        const sid = sessionRef.current;

        const tick = (t: number) => {
            if (sid !== sessionRef.current || !visibleRef.current) {
                writerRunningRef.current = false;
                if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
                return;
            }
            // Espera a que TTS arranque, o sigue si ya terminó
            if (!startedRef.current && !ttsFinishedRef.current) { writerRafRef.current = requestAnimationFrame(tick); return; }
            if (boundariesSeenRef.current && !ttsFinishedRef.current) { writerRafRef.current = requestAnimationFrame(tick); return; }

            if (!t0) t0 = t;
            const dt = t - t0;

            if (dt >= baseMs && charIdxRef.current < fullText.length) {
                const ch = fullText[charIdxRef.current] ?? "";
                charIdxRef.current += 1;
                setTyped(fullText.slice(0, charIdxRef.current));
                t0 = t + (/[.,;:!?]/.test(ch) ? pause : 0);
            }

            if (charIdxRef.current < fullText.length) {
                writerRafRef.current = requestAnimationFrame(tick);
            } else {
                writerRunningRef.current = false;
                setSpeaking(false);
                setTimeout(() => setShowClose(true), 350);
            }
        };

        writerRafRef.current = requestAnimationFrame(tick);
        return () => {
            if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
        };
    }, [fullText]);

    /* ===== Forzar finalización + silencio (para ESC/botón) ===== */
    const forceCompleteAndSilence = React.useCallback(() => {
        try { window.speechSynthesis.cancel(); } catch { }
        startedRef.current = true;
        ttsFinishedRef.current = true;
        boundariesSeenRef.current = false;

        charIdxRef.current = fullText.length;
        setTyped(fullText);
        setSpeaking(false);
        setShowClose(true);

        try { videoRef.current?.pause(); } catch { }

        if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
        writerRunningRef.current = false;
    }, [fullText]);

    /* ===== TTS ===== */
    React.useEffect(() => {
        if (!access.visible) return;

        const sid = sessionRef.current;

        requestAnimationFrame(() => { if (sid === sessionRef.current) startWriter(); });

        const speakWith = (voice: SpeechSynthesisVoice | null) => {
            try { window.speechSynthesis.cancel(); } catch { }
            // Si no hay TTS disponible, solo mostramos el texto con el writer
            if (!("speechSynthesis" in window)) {
                startedRef.current = true;
                ttsFinishedRef.current = true;
                return;
            }

            const u = new SpeechSynthesisUtterance(fullText);
            u.lang = voice?.lang || "es-ES";
            if (voice) u.voice = voice;
            u.rate = 1.06;
            u.pitch = 0.92;
            u.volume = 1.0;

            u.onstart = () => {
                if (sid !== sessionRef.current) return;
                startedRef.current = true;
                setSpeaking(true);
                ensureVideoPlaying();
            };

            u.onboundary = (ev: any) => {
                if (sid !== sessionRef.current || !startedRef.current) return;
                boundariesSeenRef.current = true;
                const idx = Math.min(fullText.length, (ev.charIndex ?? 0) + 1);
                if (idx > charIdxRef.current) {
                    charIdxRef.current = idx;
                    setTyped(fullText.slice(0, charIdxRef.current));
                }
            };

            const onFinish = () => {
                if (sid !== sessionRef.current) return;
                ttsFinishedRef.current = true;
                setSpeaking(false);
                try { videoRef.current?.pause(); } catch { }
            };
            u.onend = onFinish;
            u.onerror = onFinish;

            utterRef.current = u;
            try { window.speechSynthesis.speak(u); } catch { onFinish(); }
        };

        const startTTS = () => {
            const voice =
                (selectedURI && voices.find((v) => v.voiceURI === selectedURI)) ||
                pickDefaultSpanishGoogleVoice(voices) ||
                null;
            speakWith(voice);
        };

        requestAnimationFrame(() => { if (sid === sessionRef.current) startTTS(); });

        return () => {
            try { window.speechSynthesis.cancel(); } catch { }
            utterRef.current = null;
            try {
                if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
            } catch { }
        };
    }, [access.visible, fullText, voices, selectedURI, ensureVideoPlaying, startWriter]);

    /* ===== Cerrar (ESC o botón) ===== */
    const closeCard = React.useCallback(() => {
        // 1) Completar y silenciar
        forceCompleteAndSilence();

        // 2) Reinicia sesión y limpia
        sessionRef.current++;
        try { window.speechSynthesis.cancel(); } catch { }
        try { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } } catch { }
        if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
        writerRunningRef.current = false;

        // 3) Reset flags
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;
        charIdxRef.current = 0;
        setTyped("");
        setSpeaking(false);
        setShowClose(false);

        // 4) Menú cerrado / playing on
        try { useGameStore.getState().setMenuOpen?.(false); } catch { }

        // 5) Señales + esconder overlay
        try {
            window.dispatchEvent(new CustomEvent("destroy-drone-card-closed", { detail: { index: access.index | 0 } }));
        } catch { }
        hideAccessOverlay();

        try {
            useGameStore.getState().setPlaying?.(true);
            setTimeout(() => { try { useGameStore.getState().setMenuOpen?.(false); } catch { } }, 0);
        } catch { }
    }, [forceCompleteAndSilence, hideAccessOverlay, access.index]);

    React.useEffect(() => {
        if (!access.visible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeCard();
            }
        };
        window.addEventListener("keydown", onKey, { passive: false, capture: true });
        return () => {
            window.removeEventListener("keydown", onKey, true);
            if (writerRafRef.current != null) { cancelAnimationFrame(writerRafRef.current); writerRafRef.current = null; }
            writerRunningRef.current = false;
        };
    }, [access.visible, closeCard]);

    const spanishVoices = React.useMemo(
        () => voices.filter((v) => /^es/i.test(v.lang || "es") || /spanish|español/i.test(`${v.name} ${v.voiceURI}`)),
        [voices]
    );

    if (!access.visible) return null;

    /* ===== CFG y layout ===== */
    const widthPx: number = C.widthPx ?? 900;
    const heightPct: number = C.heightPct ?? 70;
    const marginTopPx: number = C.marginTopPx ?? 48;
    const marginLeftPx: number = C.marginLeftPx ?? 0;
    const yOffsetPx: number = C.yOffsetPx ?? 0;

    const cardBgColor = rgbaFromHex(C.cardBgColor ?? "#9e2940", C.cardBgOpacity ?? 0.35);
    const cardBorderColor: string = C.cardBorderColor ?? "rgba(248,113,113,0.35)";
    const cardShadowInset: string = C.cardShadowInset ?? "0 0 40px rgba(248,113,113,.18) inset";

    const contentPadX: number = C.contentPadX ?? 20;
    const contentPadY: number = C.contentPadY ?? 20;

    const gapX: number = C.gapX ?? 16;

    const videoWidthPx: number = C.videoWidthPx ?? 400;
    const videoBg = rgbaFromHex(C.videoBgColor ?? "#062e3a", C.videoBgOpacity ?? 0.7);
    const videoMarginTopPx: number = C.videoMarginTopPx ?? 0;
    const videoMarginLeftPx: number = C.videoMarginLeftPx ?? 0;
    const videoMarginBottomPx: number = C.videoMarginBottomPx ?? 16;

    const textMarginLeftPx: number = (C as any).textMarginLeftPx ?? 0;
    const textMarginRightPx: number = C.textMarginRightPx ?? 0;

    const rawTextWidth: number | null = C.textWidthPx ?? null;
    const autoTextWidth =
        widthPx - 2 * contentPadX - videoWidthPx - gapX - textMarginRightPx - textMarginLeftPx;
    const textWidthPx: number = Math.max(160, rawTextWidth ?? autoTextWidth);

    const textBg = rgbaFromHex(C.textBgColor ?? "#062e3a", C.textBgOpacity ?? 0.7);
    const textMarginTopPx: number = C.textMarginTopPx ?? videoMarginTopPx;
    const textMarginBottomPx: number = C.textMarginBottomPx ?? 16;

    // Tipografía
    const fontFamily: string =
        C.fontFamily ??
        "'Orbitron', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif";
    const textColor: string = C.textColor ?? "#7ef9ff";
    const textSizePx: number = C.textSizePx ?? 13;
    const lineHeight: number = C.lineHeight ?? 1.5;
    const textPaddingX: number = C.textPaddingX ?? 16;
    const textPaddingY: number = C.textPaddingY ?? 12;

    // Chips header
    const headerSpeakingBg: string = C.headerSpeakingBg ?? "rgba(52,211,153,0.15)";
    const headerSpeakingRing: string = C.headerSpeakingRing ?? "rgba(110,231,183,0.30)";
    const headerIdleBg: string = C.headerIdleBg ?? "rgba(255,255,255,0.10)";
    const headerIdleRing: string = C.headerIdleRing ?? "rgba(255,255,255,0.20)";

    const title = `Acceso a archivo nº${Math.min(5, Math.max(1, access.index | 0))}`;

    // Tamaños responsivos de la tarjeta
    const maxCardWidth = Math.min(widthPx, Math.max(360, Math.floor(window.innerWidth * 0.96)));

    // Nodo del overlay (portal)
    const overlayNode = (
        <div
            className="fixed inset-0 z-40 flex items-start justify-center"
            style={{ paddingTop: marginTopPx, pointerEvents: "auto" }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Card principal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative rounded-2xl overflow-hidden"
                style={{
                    width: maxCardWidth,
                    height: `${Math.max(40, Math.min(100, heightPct))}%`,
                    transform: `translate(${marginLeftPx}px, ${yOffsetPx}px)`,
                    background: cardBgColor,
                    border: `1px solid ${cardBorderColor}`,
                    boxShadow: cardShadowInset,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-3" style={{ padding: "14px 20px 8px 20px" }}>
                    <div className="text-white/90 font-semibold">{title}</div>

                    <div className="flex items-center gap-2">
                        <div
                            className="text-[11px] px-2 py-1 rounded-md ring-1"
                            style={{
                                background: speaking ? headerSpeakingBg : headerIdleBg,
                                color: speaking ? "rgb(167 243 208)" : "white",
                                borderColor: "transparent",
                                outline: "none",
                                boxSizing: "border-box",
                                boxShadow: `0 0 0 1px ${speaking ? headerSpeakingRing : headerIdleRing} inset`,
                            }}
                        >
                            {speaking ? "Transmitiendo..." : "Listo"}
                        </div>

                        {spanishVoices.length > 1 && (
                            <VoiceSelect
                                voices={spanishVoices}
                                selectedURI={selectedURI}
                                onPick={(uri) => setSelectedURI(uri)}
                                title="Seleccionar voz (ES)"
                            />
                        )}
                    </div>
                </div>

                {/* Contenido */}
                <div
                    className="h-full"
                    style={{
                        paddingLeft: contentPadX,
                        paddingRight: contentPadX,
                        paddingBottom: contentPadY,
                    }}
                >
                    {/* Grid: en narrow apila (1 col), si no, vídeo izquierda y texto derecha */}
                    <div
                        className={`grid h-full ${isNarrow ? "grid-cols-1" : ""}`}
                        style={
                            isNarrow
                                ? { rowGap: gapX }
                                : {
                                    gridTemplateColumns: `minmax(240px, ${videoWidthPx}px) ${Math.max(160, textWidthPx)}px`,
                                    columnGap: gapX,
                                    alignItems: "stretch",
                                }
                        }
                    >
                        {/* IZQ: vídeo */}
                        <div
                            className="rounded-xl overflow-hidden border relative"
                            style={{
                                background: videoBg,
                                borderColor: "rgba(255,255,255,0.10)",
                                marginTop: videoMarginTopPx,
                                marginLeft: videoMarginLeftPx,
                                marginBottom: videoMarginBottomPx,
                            }}
                        >
                            <video
                                ref={videoRef}
                                src={ASSETS.video.avatarMission}
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 pointer-events-none opacity-[.10] [background:repeating-linear-gradient(transparent_0_2px,rgba(255,255,255,.08)_2px_3px)]" />
                            <div className="absolute top-2 left-2 text-[10px] tracking-widest text-cyan-200/90">
                                MENSAJE ENTRANTE...
                            </div>
                        </div>

                        {/* DER: texto */}
                        <div
                            className="rounded-xl border flex flex-col"
                            style={{
                                background: textBg,
                                borderColor: "rgba(255,255,255,0.10)",
                                marginTop: textMarginTopPx,
                                marginRight: textMarginRightPx,
                                marginBottom: textMarginBottomPx,
                                marginLeft: textMarginLeftPx,
                            }}
                        >
                            {/* Banda identidad */}
                            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-3 bg-black/10">
                                <div className="w-8 h-8 rounded-lg bg-cyan-400/20 grid place-items-center ring-1 ring-cyan-300/30">
                                    <div className="size-3 rounded-full bg-emerald-300 animate-pulse" />
                                </div>
                                <div className="text-cyan-200/90 text-sm">OPERADOR — Acceso de archivos</div>
                            </div>

                            {/* Texto + cursor */}
                            <div className="flex-1" style={{ padding: `${textPaddingY}px ${textPaddingX}px` }}>
                                <div
                                    className="whitespace-pre-wrap"
                                    style={{ color: textColor, fontFamily, fontSize: `${textSizePx}px`, lineHeight }}
                                >
                                    {typed}
                                    {speaking && <span className="opacity-60 animate-pulse">▌</span>}
                                </div>

                                {/* ESC */}
                                <div className="mt-8 text-[11px] text-cyan-200/80 animate-pulse select-none">
                                    Pulsa <span className="font-semibold text-cyan-100">ESC</span> para CERRAR
                                </div>

                                {/* Botón cerrar */}
                                <div className="flex justify-end" style={{ paddingTop: 24 }}>
                                    {showClose ? (
                                        <button
                                            onClick={closeCard}
                                            className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-300/40 text-cyan-100 text-sm"
                                        >
                                            CERRAR
                                        </button>
                                    ) : (
                                        <div style={{ height: 36 }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(overlayNode, portalEl ?? document.body);
};

export default DestroyDroneCard;
