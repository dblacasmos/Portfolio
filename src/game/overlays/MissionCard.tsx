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
import VoiceSelect from "./VoiceSelect";
import { useEscOrTapToClose } from "@/hooks/useEnterOrTapToClose";
import { patchThreeIndex0AttributeNameWarning } from "@/game/utils/three/fixIndex0Attr";

patchThreeIndex0AttributeNameWarning();

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
        return anyGoogleEs ?? googleEs[0];
    }
    const anyEs = voices.find((v) => /^es/i.test(v.lang || "es") && !FEMALE_HINTS.test(v.name));
    return anyEs || voices[0];
}

/* ===================== Modelo 3D (preview) ===================== */
const DRONE_MIN = 2.4;
const DRONE_MAX = 7.5;

function FitLevelAndRotateDrone({ distance }: { distance: number }) {
    // Hook con decoders (Draco/KTX2/Meshopt)
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
    useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.9; });
    useFrame((state) => { if (group.current) group.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.06; });

    return <group ref={group} />;
}
// Preload con decoders (el hook gestiona KTX2)
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
        return () => { try { document.body.classList.remove("show-cursor", "hud-cursor"); } catch { } };
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
    const [typed, _setTyped] = React.useState<string>("");
    const setTyped = (v: string) => _setTyped(v);

    const [speaking, setSpeaking] = React.useState(false);
    const [showClose, setShowClose] = React.useState(false);
    const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
    const [selectedURI, setSelectedURI] = React.useState<string | null>(null);

    const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    // Refs de control fino
    const sessionRef = React.useRef(0);
    const startedRef = React.useRef(false);
    const boundariesSeenRef = React.useRef(false);
    const charIdxRef = React.useRef(0);
    const writerRunningRef = React.useRef(false);
    const ttsFinishedRef = React.useRef(false);

    // Zoom del dron con rueda (listener NO pasivo para poder preventDefault)
    const [distance, setDistance] = React.useState<number>(4.2);
    const clampDist = (z: number) => Math.min(DRONE_MAX, Math.max(DRONE_MIN, z));
    const zoomAreaRef = React.useRef<HTMLDivElement | null>(null);
    const onWheelZoom = React.useCallback<React.WheelEventHandler<HTMLDivElement>>((ev) => {
        // La cancelación real la hace un listener nativo no-passive (abajo)
        ev.stopPropagation();
        const native = ev.nativeEvent as WheelEvent;
        // Normaliza trackpad/ratón: line-mode → px
        const dy = native.deltaMode === 1 ? native.deltaY * 16 : native.deltaY;
        const k = 0.0028;
        const step = Math.sign(dy) * Math.max(0.15, Math.abs(dy) * k);
        setDistance((d) => clampDist(d + step));
    }, []);

    // Bloquea el scroll del documento con un listener nativo no-passive en captura
    React.useEffect(() => {
        const el = zoomAreaRef.current;
        if (!el) return;
        const blockWheel = (e: WheelEvent) => {
            if (e.cancelable) { // evita el warning en eventos no cancelables
                e.preventDefault();
                e.stopPropagation();
            }
        };
        el.addEventListener("wheel", blockWheel, { capture: true, passive: false });
        return () => el.removeEventListener("wheel", blockWheel as any, true);
    }, []);

    /* === Entrar: reset duro y contenedor vacío === */
    React.useEffect(() => {
        if (!mode) return;
        sessionRef.current++;
        const sid = sessionRef.current;

        try { window.speechSynthesis.cancel(); } catch { }
        setSpeaking(false);
        setShowClose(false);

        charIdxRef.current = 0;
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;

        setTyped("");
        setSelectedURI(null);

        return () => {
            if (sid === sessionRef.current) {
                try { window.speechSynthesis.cancel(); } catch { }
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
        try { videoRef.current?.play().catch(() => { }); } catch { }
    }, []);
    React.useEffect(() => {
        if (!mode) return;
        ensureVideoPlaying();
        const onVis = () => { if (!document.hidden) ensureVideoPlaying(); };
        document.addEventListener("visibilitychange", onVis, true);
        return () => document.removeEventListener("visibilitychange", onVis, true);
    }, [mode, ensureVideoPlaying]);

    // === Typewriter ===
    const startWriter = React.useCallback(() => {
        if (writerRunningRef.current) return;
        writerRunningRef.current = true;

        const baseMs = 30;
        const pause = 160;
        let t0 = 0;
        let raf: number;

        const tick = (t: number) => {
            // Espera a TTS (o sigue si ya terminó)
            if (!startedRef.current && !ttsFinishedRef.current) { raf = requestAnimationFrame(tick); return; }
            // Si hay boundaries, dejamos al TTS sincronizar el índice
            if (boundariesSeenRef.current) { raf = requestAnimationFrame(tick); return; }

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
                setTimeout(() => { if (sessionRef.current) setShowClose(true); }, 300);
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [fullText]);

    // === TTS + sincronización ===
    React.useEffect(() => {
        if (!mode) return;
        const sid = sessionRef.current;

        requestAnimationFrame(() => { if (sid === sessionRef.current) startWriter(); });

        const speakWith = (voice: SpeechSynthesisVoice | null) => {
            try { window.speechSynthesis.cancel(); } catch { }
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
                if (sid !== sessionRef.current || !startedRef.current) return;
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
                    setTimeout(() => { if (sid === sessionRef.current) setShowClose(true); }, 300);
                }
            };

            u.onend = finish;
            u.onerror = finish;

            try { window.speechSynthesis.speak(u); } catch { finish(); }
            utterRef.current = u;
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
    }, [mode, fullText, voices, selectedURI, ensureVideoPlaying, startWriter]);

    const closeCard = React.useCallback(() => {
        // Cierre manual limpio
        sessionRef.current++;
        try { window.speechSynthesis.cancel(); } catch { }
        try {
            if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
        } catch { }
        startedRef.current = false;
        boundariesSeenRef.current = false;
        writerRunningRef.current = false;
        ttsFinishedRef.current = false;
        charIdxRef.current = 0;
        setTyped("");
        setSpeaking(false);
        setShowClose(false);
        setMode(null);
    }, [setMode]);

    // ENTER para cerrar (en captura)
    React.useEffect(() => {
        if (!mode) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                closeCard();
            }
        };
        window.addEventListener("keydown", onKey, { passive: false, capture: true });
        return () => window.removeEventListener("keydown", onKey, true);
    }, [mode, closeCard]);

    // Tap en móvil/tablet = ENTER (cerrar tarjeta)
    useEscOrTapToClose({
        enabled: !!mode,
        onClose: closeCard,
        closeOnBackdropOnly: false,
        backdropElement: null,
        keyboardKey: "Enter",
    });

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
                        {spanishVoices.length > 1 && (
                            <VoiceSelect voices={spanishVoices} selectedURI={selectedURI} onPick={onPickVoice} />
                        )}
                    </div>
                </div>

                {/* Grid 3 columnas: IZQ vídeo / CENTRO texto / DER dron */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,400px)_1fr_minmax(0px,400px)] gap-4 px-5 pb-5">
                    {/* IZQUIERDA: avatar */}
                    <div className="h-[300px] sm:h-[380px] md:h-[560px] rounded-xl overflow-hidden border border-white/10 bg-black relative">
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

                        {/* Texto scrolleable: no se pierde fuera de la pantalla */}
                        <div className="rounded-xl bg-black/25 border border-white/10 p-4 min-h-[160px] max-h-[min(48vh,420px)] overflow-auto pr-1">
                            {/* Empieza vacío y se rellena sincronizado con la voz / typewriter */}
                            <div className="text-cyan-200/90 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[13px] leading-relaxed whitespace-pre-wrap">
                                {typed}
                                {speaking && <span className="opacity-60 animate-pulse">▌</span>}
                            </div>
                            <div className="mt-2 text-white/60 text-xs">Pulsa ENTER para cancelar.</div>
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
                        className="h-[300px] sm:h-[380px] md:h-[560px] rounded-xl overflow-hidden border border-white/10 bg-[radial-gradient(120%_120%_at_50%_15%,rgba(56,189,248,.12),transparent_60%)] relative"
                        ref={zoomAreaRef}
                        onWheelCapture={onWheelZoom}
                        style={{ overscrollBehavior: "contain", touchAction: "none" }}
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
                        <div className="absolute bottom-2 left-2 text-[12px] tracking-widest text-white/85">
                            OBJETIVO: DRON · Zoom: {distance.toFixed(1)}m
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionCard;
