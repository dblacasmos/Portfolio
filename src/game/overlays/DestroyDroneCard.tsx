/* =========================================================
   FILE: src/game/overlays/DestroyDroneCard.tsx
   PURPOSE: Tarjeta modal (HTML) tras destruir cada dron.
            - Reproduce video ASSETS.video.avatarMission
            - TTS en español
            - Escribe texto 1..5 según dron destruido
            - Cierre SOLO manual (ESC o botón CERRAR)
            - Pausa música mientras está activa
            - Funciona igual en fullscreen o no
            - Lee todos los ajustes de CFG.hud.destroyDroneCard
========================================================= */

import React from "react";
import { ASSETS } from "@/constants/assets";
import { useGameStore } from "../utils/state/store";
import { audioManager } from "../utils/audio/audio";
import { CFG } from "../../constants/config";
import { createPortal } from "react-dom";

/* ===================== Utiles ===================== */

const FEMALE_HINTS =
    /(female|mujer|helena|laura|sofia|sofía|carmen|elena|montserrat|sara|luisa)/i;
const GOOGLE_MALE_CODE = /\b(Neural2|Standard)\s*-\s*(B|D)\b/i;

function pickDefaultSpanishGoogleVoice(voices: SpeechSynthesisVoice[] | undefined) {
    if (!voices || !voices.length) return null;

    const googleEs = voices.filter(
        (v) => /google/i.test(v.name) && /^es/i.test(v.lang || "es")
    );

    if (googleEs.length) {
        const maleish = googleEs.find(
            (v) => GOOGLE_MALE_CODE.test(v.name) && !FEMALE_HINTS.test(v.name)
        );
        if (maleish) return maleish;

        const anyGoogleEs = googleEs.find((v) => !FEMALE_HINTS.test(v.name));
        if (anyGoogleEs) return anyGoogleEs;

        return googleEs[0];
    }

    const anyEs = voices.find(
        (v) => /^es/i.test(v.lang || "es") && !FEMALE_HINTS.test(v.name)
    );
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

const TXT1 =
    `Accediendo al archivo número 1
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

const TXT2 =
    `Accediendo al archivo número 2
Estado: Desclasificado
Sujeto: David Blanco
Operación: Acceso Universidad + de (25)
Periodo: 2013–2014 | Lugar: UNED
Transición: tras servicio militar, reorientación académica.
Entrenamiento: estudio autónomo, gestión del tiempo, método analítico, constancia.
Rol: Estratega Académico
Habilidad: “Briefing Exprés”
Fin del archivo.`;

const TXT3 =
    `Accediendo al archivo número 3
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

const TXT4 =
    `Accediendo al archivo número 4
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

const TXT5 =
    `Accediendo al archivo número 5
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
    const hideAccessOverlay = (useGameStore as any).getState()
        .hideAccessOverlay as () => void;

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

    /* ===== Cursor: mostrar cursor ROBOT mientras el overlay está visible ===== */
    React.useEffect(() => {
        visibleRef.current = access.visible;
        if (!access.visible) return;
        // Squelch: mientras el overlay esté visible, bloquea ESC del menú
        try { (window as any).__squelchMenuEsc = true; } catch { }
        try {
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor", "hud-cursor");
        } catch { }
        return () => {
            // Al desmontar, deja de bloquear ESC del menú
            try { (window as any).__squelchMenuEsc = false; } catch { }
        };
    }, [access.visible]);

    /* ===== Pausar música mientras esté activo ===== */
    React.useEffect(() => {
        if (!access.visible) return;
        let resume: (() => void) | null = null;
        try {
            const am: any = audioManager;
            if (
                typeof am?.pauseMusic === "function" &&
                typeof am?.resumeMusic === "function"
            ) {
                am.pauseMusic();
                resume = () => am.resumeMusic();
            } else if (am?.music && typeof am.music.pause === "function") {
                const wasPaused = !!am.music.paused;
                am.music.pause();
                resume = () => {
                    if (!wasPaused) am.music.play?.();
                };
            } else if (Array.isArray(am?.tracks)) {
                const resumeList: Array<() => void> = [];
                am.tracks.forEach((t: any) => {
                    if (t?.type === "music" && typeof t?.pause === "function") {
                        const wasPaused = !!t.paused;
                        t.pause();
                        resumeList.push(() => {
                            if (!wasPaused) t.play?.();
                        });
                    }
                });
                resume = () => resumeList.forEach((fn) => fn());
            }
        } catch { }

        return () => {
            try { resume?.(); } catch { }
        };
    }, [access.visible]);

    /* ===== Video ===== */
    const ensureVideoPlaying = React.useCallback(() => {
        try {
            videoRef.current?.play().catch(() => { });
        } catch { }
    }, []);

    React.useEffect(() => {
        if (!access.visible) return;
        ensureVideoPlaying();
        const onVis = () => { if (!document.hidden) ensureVideoPlaying(); };
        document.addEventListener("visibilitychange", onVis, true);
        return () => document.removeEventListener("visibilitychange", onVis, true);
    }, [access.visible, ensureVideoPlaying]);

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

    /* ===== Portal (fullscreen o no) ===== */
    React.useEffect(() => {
        if (!access.visible) return;
        const getPortalEl = () => {
            const fs =
                (document.fullscreenElement as HTMLElement | null) ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement;
            if (fs) return fs;
            const immersive = document.querySelector("[data-immersive-root]") as HTMLElement | null;
            return immersive || document.body;
        };
        setPortalEl(getPortalEl());
        const ro = new ResizeObserver(() => setPortalEl(getPortalEl()));
        try {
            ro.observe(document.body);
        } catch { }
        return () => ro.disconnect();
    }, [access.visible]);

    /* ===== Arranque: contenedor vacío y TTS + typewriter sincronizados ===== */
    React.useEffect(() => {
        if (!access.visible) return;
        sessionRef.current++;
        const sid = sessionRef.current;

        try { window.speechSynthesis.cancel(); } catch { }
        setSpeaking(false);
        setShowClose(false);

        // Reset de refs
        charIdxRef.current = 0;
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;

        // Texto ∅ desde el primer frame
        setTyped("");

        // start writer en el próximo frame (ya hay render ∅)
        const startWriter = () => {
            if (writerRunningRef.current) return;
            writerRunningRef.current = true;
            const baseMs = Math.max(10, Math.min(200, C.typewriterSpeed ?? 24));
            const pause = Math.max(30, Math.min(500, C.typewriterPause ?? 140));
            let t0 = 0;
            const tick = (t: number) => {
                if (!startedRef.current && !ttsFinishedRef.current) {
                    writerRafRef.current = requestAnimationFrame(tick);
                    return;
                }
                if (boundariesSeenRef.current) {
                    writerRafRef.current = requestAnimationFrame(tick);
                    return;
                }
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
                    setTimeout(() => { if (sid === sessionRef.current) setShowClose(true); }, 220);
                }
            };
            writerRafRef.current = requestAnimationFrame(tick);
        };

        requestAnimationFrame(() => { if (sid === sessionRef.current) startWriter(); });

        // TTS
        const voice =
            (selectedURI && voices.find((v) => v.voiceURI === selectedURI)) ||
            pickDefaultSpanishGoogleVoice(voices) ||
            null;

        const rate = Math.max(0.6, Math.min(1.4, C.rate ?? 1.0));
        const pitch = Math.max(0.5, Math.min(1.5, C.pitch ?? 0.78));
        const vol = Math.max(0, Math.min(1, C.volume ?? 1.0));

        const u = new SpeechSynthesisUtterance(fullText);
        u.lang = voice?.lang || "es-ES";
        if (voice) u.voice = voice;
        u.rate = rate;
        u.pitch = pitch;
        u.volume = vol;

        u.onstart = () => {
            if (sid !== sessionRef.current) return;
            startedRef.current = true;
            setSpeaking(true);
            ensureVideoPlaying();
        };
        u.onboundary = (ev: any) => {
            if (sid !== sessionRef.current) return;
            if (!startedRef.current) return;
            boundariesSeenRef.current = true;
            const idx = Math.min(fullText.length, (ev.charIndex ?? 0) + 1);
            if (idx > charIdxRef.current) {
                charIdxRef.current = idx;
                setTyped(fullText.slice(0, charIdxRef.current));
            }
        };
        const finish = () => {
            if (sid !== sessionRef.current) return;
            ttsFinishedRef.current = true;
            setSpeaking(false);
            try { videoRef.current?.pause(); } catch { }
            if (charIdxRef.current >= fullText.length) {
                setTyped(fullText);
                setTimeout(() => { if (sid === sessionRef.current) setShowClose(true); }, 220);
            }
        };
        u.onend = finish;
        u.onerror = finish;

        utterRef.current = u;
        try { window.speechSynthesis.speak(u); } catch { finish(); }

        return () => {
            try { window.speechSynthesis.cancel(); } catch { }
            if (writerRafRef.current) cancelAnimationFrame(writerRafRef.current);
            utterRef.current = null;
        };
    }, [access.visible, fullText, voices, selectedURI]);

    const bgColor = rgbaFromHex(C.bgColor ?? "#0a1018", 0.88);
    const borderColor = rgbaFromHex(C.borderColor ?? "#22d3ee", 0.35);

    const closeCard = React.useCallback(() => {
        sessionRef.current++;
        try { window.speechSynthesis.cancel(); } catch { }
        try {
            if (videoRef.current) {
                videoRef.current.pause();
                (videoRef.current as any).currentTime = 0;
            }
        } catch { }
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;
        charIdxRef.current = 0;
        setTyped("");
        setSpeaking(false);
        setShowClose(false);
        hideAccessOverlay();
    }, [hideAccessOverlay]);

    const spanishVoices = React.useMemo(
        () => voices.filter((v) => /^es/i.test(v.lang || "es") || /spanish|español/i.test(`${v.name} ${v.voiceURI}`)),
        [voices]
    );
    const onPickVoice = (uri: string) => setSelectedURI(uri);

    if (!access.visible) return null;

    return createPortal(
        <div className="fixed inset-0 z-[75] flex items-start justify-center pt-8 sm:pt-12">
            <div className="absolute inset-0" style={{ background: bgColor, backdropFilter: "blur(6px)" }} />

            <div
                className="relative w-[min(1200px,100%)] h-[90%] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(56,189,248,.18)_inset]"
                style={{ border: `1px solid ${borderColor}` }}
                role="dialog"
                aria-modal="true"
                aria-label="Acceso"
            >
                {/* Header */}
                <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
                    <div className="text-white/90 font-semibold">Acceso a Archivo</div>
                    <div className="flex items-center gap-2">
                        <div
                            className={`text-[11px] px-2 py-1 rounded-md ring-1 ${speaking ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" : "bg-white/10 text-white ring-white/20"
                                }`}
                        >
                            {speaking ? "Reproduciendo" : "Listo"}
                        </div>
                        {spanishVoices.length > 1 && (
                            <VoiceSelect
                                voices={spanishVoices}
                                selectedURI={selectedURI}
                                onPick={onPickVoice}
                                title="Seleccionar voz (ES)"
                            />
                        )}
                    </div>
                </div>

                {/* Grid: IZQ video / DER texto */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,420px)_1fr] gap-4 px-5 pb-5">
                    {/* IZQUIERDA: video */}
                    <div className="h-[400px] sm:h-[96%] md:h-[560px] rounded-xl overflow-hidden border border-white/10 bg-black relative">
                        <video
                            ref={videoRef}
                            src={ASSETS.video.avatarMission}
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none opacity-[.12] [background:repeating-linear-gradient(transparent_0_2px,rgba(255,255,255,.08)_2px_3px)]" />
                        <div className="absolute top-2 left-2 text-[10px] tracking-widest text-cyan-200/90">ARCHIVO DESCLASIFICADO</div>
                    </div>

                    {/* DERECHA: texto y CTA */}
                    <div className="grid grid-rows-[1fr_auto] gap-3">
                        <div className="rounded-xl bg-black/25 border border-white/10 p-4 min-h-[160px]">
                            {/* Empieza VACÍO */}
                            <div className="text-cyan-200/90 text-[15px] sm:text-[10px] md:text-[10px] leading-relaxed whitespace-pre-wrap">
                                {typed}
                                {speaking && <span className="opacity-60 animate-pulse">▌</span>}
                            </div>
                            <div className="mt-2 text-white/60 text-xs">Pulsa ESC para cerrar.</div>
                        </div>

                        <div className="flex justify-end">
                            {showClose ? (
                                <button
                                    onClick={closeCard}
                                    className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-300/40 text-cyan-100 text-sm"
                                >
                                    CERRAR
                                </button>
                            ) : (
                                <div className="h-9" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        portalEl || document.body
    );
};

/* ===================== VoiceSelect ===================== */

type VoiceSelectProps = {
    voices: SpeechSynthesisVoice[];
    selectedURI: string | null;
    onPick: (uri: string) => void;
    title?: string;
};

const VoiceSelect: React.FC<VoiceSelectProps> = ({ voices, selectedURI, onPick, title = "Seleccionar voz (ES)" }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    const current = React.useMemo(
        () => voices.find((v) => v.voiceURI === selectedURI) || null,
        [voices, selectedURI]
    );

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("mousedown", onDown, true);
        window.addEventListener("keydown", onKey, true);
        return () => {
            window.removeEventListener("mousedown", onDown, true);
            window.removeEventListener("keydown", onKey, true);
        };
    }, []);

    if (voices.length <= 1) return null;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="text-[11px] h-7 px-2 rounded-md border bg-[rgba(9,12,16,0.8)] text-cyan-100
                   border-white/15 hover:bg-white/10 hover:border-white/25
                   focus:outline-none focus:ring-2 focus:ring-cyan-400/40
                   flex items-center gap-1"
                title={title}
            >
                <span className="truncate max-w-[12rem]">
                    {current ? current.name || current.voiceURI : "Voz (ES)"}
                </span>
                <svg className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
                </svg>
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute right-0 mt-1 w-64 max-h-64 overflow-auto rounded-md border
                     border-white/12 bg-[rgba(6,10,14,0.96)] backdrop-blur-md shadow-xl z-50"
                >
                    <div className="sticky top-0 px-2 py-1 text-[10px] tracking-wide text-cyan-200/80 bg-black/30 border-b border-white/10">
                        Voces en Español
                    </div>
                    <ul className="py-1">
                        {voices.map((v) => {
                            const selected = v.voiceURI === selectedURI;
                            return (
                                <li key={v.voiceURI}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => { onPick(v.voiceURI); setOpen(false); }}
                                        className={`w-full text-left px-2 py-1.5 text-[11px] transition
                                ${selected ? "bg-cyan-400/15 text-cyan-100" : "text-white/90 hover:bg-cyan-400/10 hover:text-cyan-100"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="truncate">{v.name || v.voiceURI}</span>
                                            {selected && (
                                                <svg className="size-3 shrink-0 text-cyan-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.004 7a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.42l2.293 2.294 6.297-6.294a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-white/40">{v.lang}</div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DestroyDroneCard;
