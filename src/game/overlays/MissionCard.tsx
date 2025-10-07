/*  ====================================
    FILE: src/game/overlays/MissionCard.tsx
    ==================================== */

import React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useDracoGLTF } from "@/hooks/useDracoKtx2GLTF";
import { ASSETS } from "../../constants/assets";
import { useGameStore } from "../utils/state/store";
import { audioManager } from "../utils/audio/audio";
import { CFG } from "@/constants/config";

/* ===================== Voz: Google Español por defecto ===================== */

const FEMALE_HINTS = /(female|mujer|helena|laura|sofia|sofía|carmen|elena|montserrat|sara|luisa)/i;
const GOOGLE_MALE_CODE = /\b(Neural2|Standard)\s*-\s*(B|D)\b/i;

function pickDefaultSpanishGoogleVoice(voices: SpeechSynthesisVoice[] | undefined) {
    if (!voices || !voices.length) return null;
    const googleEs = voices.filter((v) => /google/i.test(v.name) && /^es/i.test(v.lang || "es"));
    if (googleEs.length) {
        const maleish = googleEs.find((v) => GOOGLE_MALE_CODE.test(v.name) && !FEMALE_HINTS.test(v.name));
        if (maleish) return maleish;
        const anyGoogleEs = googleEs.find((v) => !FEMALE_HINTS.test(v.name));
        if (anyGoogleEs) return anyGoogleEs;
        return googleEs[0];
    }
    const anyEs = voices.find((v) => /^es/i.test(v.lang || "es") && !FEMALE_HINTS.test(v.name));
    return anyEs || voices[0];
}

/* ===================== Modelo 3D (preview) ===================== */

const DRONE_MIN = 2.4;
const DRONE_MAX = 7.5;

function FitLevelAndRotateDrone({ distance }: { distance: number }) {
    // usa el hook con decoders (Draco/KTX2/Meshopt)
    const { scene } = useDracoGLTF(ASSETS.models.drone) as any;
    const group = React.useRef<THREE.Group>(null!);
    const { camera, size } = useThree();

    React.useEffect(() => {
        if (!scene || !group.current) return;

        const model = scene.clone(true);
        model.traverse((o: any) => {
            if (o.isMesh) {
                o.castShadow = false;
                o.receiveShadow = false;
                if (o.material) {
                    o.material.toneMapped = true;
                    o.material.side = THREE.FrontSide;
                    o.material.transparent = false;
                    o.material.depthWrite = true;
                    o.material.depthTest = true;
                }
            }
        });

        // Centrar y nivelar
        const box0 = new THREE.Box3().setFromObject(model);
        const center0 = new THREE.Vector3();
        box0.getCenter(center0);
        model.position.sub(center0);

        const size0 = new THREE.Vector3();
        box0.getSize(size0);
        if (size0.y > size0.z && size0.y > size0.x) model.rotation.x -= Math.PI / 2;

        const box1 = new THREE.Box3().setFromObject(model);
        const c1 = new THREE.Vector3();
        box1.getCenter(c1);
        model.position.sub(c1);

        group.current.clear();
        group.current.add(model);

        // Fit + cámara
        const fitToContainer = () => {
            if (!group.current) return;
            const cam = camera as THREE.PerspectiveCamera;
            cam.aspect = size.width / size.height;
            cam.near = 0.01;
            cam.far = 100;
            cam.position.set(0, 0, distance);
            cam.lookAt(0, 0, 0);
            cam.updateProjectionMatrix();

            const box = new THREE.Box3().setFromObject(group.current);
            const sizeWorld = new THREE.Vector3();
            box.getSize(sizeWorld);

            const vFov = (cam.fov * Math.PI) / 180;
            const visibleH = 2 * Math.tan(vFov / 2) * distance;
            const visibleW = visibleH * cam.aspect;
            const margin = 0.94;
            const sH = (visibleH * margin) / Math.max(1e-6, sizeWorld.y);
            const sW = (visibleW * margin) / Math.max(1e-6, sizeWorld.x);
            const scale = Math.min(sH, sW);
            group.current.scale.setScalar(scale);

            const after = new THREE.Box3().setFromObject(group.current);
            const ca = new THREE.Vector3();
            after.getCenter(ca);
            group.current.position.sub(ca);
        };

        fitToContainer();
        const ro = new ResizeObserver(() => fitToContainer());
        const anyCanvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        (anyCanvas || document.body) && ro.observe(anyCanvas || document.body);
        return () => ro.disconnect();
    }, [scene, camera, size.width, size.height, distance]);

    // Giro + levitación
    useFrame((_, dt) => {
        if (group.current) group.current.rotation.y += dt * 0.9;
    });
    useFrame((state) => {
        if (group.current) group.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
    });

    return <group ref={group} />;
}
// Preload con decoders + espera a KTX2 (lo gestiona el propio hook)
(useDracoGLTF as any).preload(ASSETS.models.drone, {
    dracoPath: CFG.decoders.dracoPath,
    meshopt: true,
});

/* ===================== Mission Card ===================== */

export const MissionCard: React.FC = () => {
    const mode = useGameStore((s) => s.missionCardMode);
    const setMode = useGameStore((s) => s.setMissionCard);

    // Cursor visible + salir de pointer lock mientras esté abierta
    React.useEffect(() => {
        if (!mode) return;
        try { document.exitPointerLock?.(); } catch { }
        try {
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor", "hud-cursor");
        } catch { }
        return () => {
            try { document.body.classList.remove("show-cursor", "hud-cursor"); } catch { }
        };
    }, [mode]);

    // Texto (intro / post-kill)
    const fullText = React.useMemo(() => {
        if (mode === "post-kill") {
            return "Confirmación: dron derribado. Mantén impulso táctico; quedan objetivos activos. Cuando alcances cinco, procede a la compuerta de extracción.";
        }
        return `Registro de arranque // Unidad T-9 “Gólem”
Origen: Centro de Ensayos Orbital Hekaton • Polígono Atlas-12
Modo: Entrenamiento de fuego real • Supervisor: Charly Gepeto

Sincronización completa. Blindaje activo. Sensores térmicos dentro de umbral. 
Objetivo del ejercicio: neutralizar (5) blancos aéreos autónomos — designación DRN-Razor

Reglas de evaluación:
— Precisión y economía de munición.
— Continuidad operacional.
— Adaptabilidad.

Entorno: campos de pruebas urbanos. Lecturas de viento mínimas;. Usa los ecos a tu favor: los Razor persiguen reflejos.

Procedimiento:
1) Dispara en ráfagas cortas.
2) Evita los láseres permaneciendo móvil.
3) Cuando alcances cinco derribos confirmados, avanza a la compuerta de extracción marcada.

Autorización concedida. 
T-9 “Gólem”, Buena cacería.`;
    }, [mode]);

    // ======== Estado UI/voz ========
    const [typed, _setTyped] = React.useState<string>(""); // SIEMPRE vacío al abrir
    const setTyped = (v: string) => _setTyped(v);

    const [speaking, setSpeaking] = React.useState(false);
    const [showClose, setShowClose] = React.useState(false);
    const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
    const [selectedURI, setSelectedURI] = React.useState<string | null>(null);

    const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    // Refs de control fino
    const sessionRef = React.useRef(0); // id por apertura
    const startedRef = React.useRef(false); // TTS arrancado
    const boundariesSeenRef = React.useRef(false); // onboundary observado
    const charIdxRef = React.useRef(0); // índice actual
    const writerRunningRef = React.useRef(false); // typewriter en marcha
    const ttsFinishedRef = React.useRef(false); // TTS finalizó/erró

    // Zoom del dron con rueda
    const [distance, setDistance] = React.useState<number>(4.2);
    const clampDist = (z: number) => Math.min(DRONE_MAX, Math.max(DRONE_MIN, z));
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setDistance(clampDist(distance + Math.sign(e.deltaY) * 0.35));
    };

    /* === Entrar: reset duro y contenedor VACÍO === */
    React.useEffect(() => {
        if (!mode) return;
        sessionRef.current++;
        const sid = sessionRef.current;

        try {
            window.speechSynthesis.cancel();
        } catch { }
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

        // Reset selección de voz por defecto
        setSelectedURI(null);

        return () => {
            // invalidar esta sesión
            if (sid === sessionRef.current) {
                try {
                    window.speechSynthesis.cancel();
                } catch { }
            }
        };
    }, [mode]);

    /* === Volumen global bajo mientras esté abierto === */
    React.useEffect(() => {
        if (!mode) return;
        let prev: number | undefined;
        try {
            const am: any = audioManager;
            prev = am?.getMasterVolume?.() ?? am?.getVolume?.() ?? (typeof am?.masterVolume === "number" ? am.masterVolume : 1);
            if (am?.setMasterVolume) am.setMasterVolume(0.1);
            else if (am?.setVolume) am.setVolume(0.1);
            else if ("masterVolume" in am) (am as any).masterVolume = 0.1;
        } catch { }
        return () => {
            try {
                const am: any = audioManager;
                if (prev != null) {
                    if (am?.setMasterVolume) am.setMasterVolume(prev);
                    else if (am?.setVolume) am.setVolume(prev);
                    else if ("masterVolume" in am) (am as any).masterVolume = prev;
                }
            } catch { }
        };
    }, [mode]);

    // Voces
    React.useEffect(() => {
        const load = () => setVoices(window.speechSynthesis.getVoices());
        load();
        window.speechSynthesis.addEventListener("voiceschanged", load);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }, []);
    React.useEffect(() => {
        if (!mode || !voices.length) return;
        const def = pickDefaultSpanishGoogleVoice(voices);
        setSelectedURI(def?.voiceURI ?? null);
    }, [mode, voices]);

    const ensureVideoPlaying = React.useCallback(() => {
        try {
            videoRef.current?.play().catch(() => { });
        } catch { }
    }, []);
    React.useEffect(() => {
        if (!mode) return;
        ensureVideoPlaying();
        const onVis = () => {
            if (!document.hidden) ensureVideoPlaying();
        };
        document.addEventListener("visibilitychange", onVis, true);
        return () => document.removeEventListener("visibilitychange", onVis, true);
    }, [mode, ensureVideoPlaying]);

    // === Typewriter (arranca en el frame siguiente; contenedor vacío ya renderizado) ===
    const startWriter = React.useCallback(() => {
        if (writerRunningRef.current) return;
        writerRunningRef.current = true;

        const baseMs = 30; // velocidad base
        const pause = 160; // pausas en signos
        let t0 = 0;
        let raf: number;

        const tick = (t: number) => {
            // Esperar a que arranque TTS, salvo que haya terminado/errado (fallback)
            if (!startedRef.current && !ttsFinishedRef.current) {
                raf = requestAnimationFrame(tick);
                return;
            }

            // Si el motor da boundaries, dejamos que gobierne el índice
            if (boundariesSeenRef.current) {
                raf = requestAnimationFrame(tick);
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
                raf = requestAnimationFrame(tick);
            } else {
                writerRunningRef.current = false;
                setSpeaking(false);
                setTimeout(() => {
                    if (sessionRef.current) setShowClose(true);
                }, 300);
            }
        };

        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [fullText]);

    // === TTS + sincronización (sin llenar el texto en onend si no ha terminado de escribirse) ===
    React.useEffect(() => {
        if (!mode) return;
        const sid = sessionRef.current;

        // Arrancamos escritor en el próximo frame (ya hay render vacío)
        requestAnimationFrame(() => {
            if (sid === sessionRef.current) startWriter();
        });

        const speakWith = (voice: SpeechSynthesisVoice | null) => {
            try {
                window.speechSynthesis.cancel();
            } catch { }
            const u = new SpeechSynthesisUtterance(fullText);
            u.lang = voice?.lang || "es-ES";
            if (voice) u.voice = voice;
            u.rate = 1.0;
            u.pitch = 0.78;
            u.volume = 1.0;

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

            const finishWithoutForcingText = () => {
                if (sid !== sessionRef.current) return;
                ttsFinishedRef.current = true;
                setSpeaking(false);
                try {
                    videoRef.current?.pause();
                } catch { }

                // Si ya escribió todo, mostramos cierres; si no, dejamos que el writer termine.
                if (charIdxRef.current >= fullText.length) {
                    setTyped(fullText);
                    setTimeout(() => {
                        if (sid === sessionRef.current) setShowClose(true);
                    }, 300);
                }
            };

            u.onend = finishWithoutForcingText;
            u.onerror = finishWithoutForcingText;

            utterRef.current = u;
            try {
                window.speechSynthesis.speak(u);
            } catch {
                // Arranca fallback inmediatamente
                finishWithoutForcingText();
            }
        };

        const startTTS = () => {
            const voice =
                (selectedURI && voices.find((v) => v.voiceURI === selectedURI)) ||
                pickDefaultSpanishGoogleVoice(voices) ||
                null;
            speakWith(voice);
        };

        // Iniciar TTS sin demoras; si no hay voces aún, usa null directamente.
        requestAnimationFrame(() => {
            if (sid === sessionRef.current) startTTS();
        });

        return () => {
            try {
                window.speechSynthesis.cancel();
            } catch { }
            utterRef.current = null;
            try {
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0;
                }
            } catch { }
        };
    }, [mode, fullText, voices, selectedURI, ensureVideoPlaying, startWriter]);

    const closeCard = React.useCallback(() => {
        // Cierre manual → limpiar SIEMPRE contenedor y estado
        sessionRef.current++; // invalida callbacks pendientes
        try {
            window.speechSynthesis.cancel();
        } catch { }
        try {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        } catch { }
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;
        charIdxRef.current = 0;
        setTyped(""); // ← contenedor vacío tras cerrar
        setSpeaking(false);
        setShowClose(false);
        setMode(null);
    }, [setMode]);

    // Cerrar con ESC (en CAPTURA para que no burbujee a otros manejadores)
    React.useEffect(() => {
        if (!mode) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeCard();
            }
        };
        window.addEventListener("keydown", onKey, { passive: false, capture: true });
        return () => window.removeEventListener("keydown", onKey, true);

    }, [mode, closeCard]);

    const spanishVoices = React.useMemo(
        () => voices.filter((v) => /^es/i.test(v.lang || "es") || /spanish|español/i.test(`${v.name} ${v.voiceURI}`)),
        [voices]
    );
    const onPickVoice = (uri: string) => setSelectedURI(uri);

    if (!mode) return null;
    const title = mode === "post-kill" ? "Actualización de objetivos" : "Misión";

    return (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-8 sm:pt-12">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <div
                className="relative w-[min(1300px,100%)] h-[95%] rounded-2xl border border-cyan-400/30 bg-[rgba(10,16,24,.88)] shadow-[0_0_40px_rgba(56,189,248,.18)_inset] overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Header */}
                <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
                    <div className="text-white/90 font-semibold">{title}</div>
                    <div className="flex items-center gap-2">
                        <div
                            className={`text-[11px] px-2 py-1 rounded-md ring-1 ${speaking ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" : "bg-white/10 text-white ring-white/20"
                                }`}
                        >
                            {speaking ? "Reproduciendo" : "Listo"}
                        </div>
                        {spanishVoices.length > 1 && <VoiceSelect voices={spanishVoices} selectedURI={selectedURI} onPick={onPickVoice} />}
                    </div>
                </div>

                {/* Grid 3 columnas: IZQ vídeo / CENTRO texto / DER dron */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,400px)_1fr_minmax(0px,400px)] gap-4 px-5 pb-5">
                    {/* IZQUIERDA: avatar */}
                    <div className="h-[400px] sm:h-[96%] md:h-[580px] rounded-xl overflow-hidden border border-white/10 bg-black relative">
                        <video ref={videoRef} src={ASSETS.video.avatarMission} loop muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 pointer-events-none opacity-[.12] [background:repeating-linear-gradient(transparent_0_2px,rgba(255,255,255,.08)_2px_3px)]" />
                        <div className="absolute top-2 left-2 text-[10px] tracking-widest text-cyan-200/90">MENSAJE ENTRANTE...</div>
                    </div>

                    {/* CENTRO: texto y CTA */}
                    <div className="grid grid-rows-[auto_1fr_auto] gap-3">
                        <div className="rounded-xl bg-black/30 border border-white/10 p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-cyan-400/20 grid place-items-center ring-1 ring-cyan-300/30">
                                <div className="size-4 rounded-full bg-emerald-300 animate-pulse" />
                            </div>
                            <div className="text-cyan-200/90 text-sm">OPERADOR — Charly Gepeto</div>
                        </div>

                        <div className="rounded-xl bg-black/25 border border-white/10 p-4 min-h-[160px]">
                            {/* Empieza VACÍO y se rellena sincronizado con la voz / typewriter */}
                            <div className="text-cyan-200/90 text-[16px] sm:text-[10px] md:text-[10px] leading-relaxed whitespace-pre-wrap">
                                {typed}
                                {speaking && <span className="opacity-60 animate-pulse">▌</span>}
                            </div>
                            <div className="mt-2 text-white/60 text-xs">Pulsa ESC para cancelar.</div>
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

                    {/* DERECHA: dron (zoom rueda) */}
                    <div
                        className="h-[400px] sm:h-[96%] md:h-[580px] rounded-xl overflow-hidden border border-white/10 bg-[radial-gradient(120%_120%_at_50%_15%,rgba(56,189,248,.12),transparent_60%)] relative"
                        onWheel={onWheel}
                    >
                        <div className="absolute top-2 left-2 text-[10px] tracking-widest text-cyan-200/90">SCROLL para aumentar o disminuir</div>
                        <Canvas
                            dpr={[1, 1.5]}
                            camera={{ position: [0, 0, distance], fov: 34, near: 0.01, far: 100 }}
                            gl={{ powerPreference: "high-performance", antialias: true, alpha: true, stencil: false }}
                        >
                            <ambientLight intensity={0.9} />
                            <directionalLight intensity={0.9} position={[2, 2, 2]} />
                            <directionalLight intensity={0.65} position={[-2, -2, 1]} color="#88ccff" />
                            <FitLevelAndRotateDrone distance={distance} />
                        </Canvas>
                        <div className="absolute bottom-2 left-2 text-[12px] tracking-widest text-white/85">OBJETIVO: DRON · Zoom: {distance.toFixed(1)}m</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ===================== VoiceSelect ===================== */

type VoiceSelectProps = {
    voices: SpeechSynthesisVoice[];
    selectedURI: string | null;
    onPick: (uri: string) => void;
};

const VoiceSelect: React.FC<VoiceSelectProps> = ({ voices, selectedURI, onPick }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    const current = React.useMemo(() => voices.find((v) => v.voiceURI === selectedURI) || null, [voices, selectedURI]);

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
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
                title="Seleccionar voz (ES)"
            >
                <span className="truncate max-w-[12rem]">{current ? current.name || current.voiceURI : "Voz (ES)"}</span>
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
                                        onClick={() => {
                                            onPick(v.voiceURI);
                                            setOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-[11px] transition
                                ${selected ? "bg-cyan-400/15 text-cyan-100" : "text-white/90 hover:bg-cyan-400/10 hover:text-cyan-100"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="truncate">{v.name || v.voiceURI}</span>
                                            {selected && (
                                                <svg className="size-3 shrink-0 text-cyan-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.704 5.29a1 1 0 010 1.42l-7.004 7a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.42l2.293 2.294 6.297-6.294a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
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

export default MissionCard;
