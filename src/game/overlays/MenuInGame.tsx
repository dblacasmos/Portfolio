/*  ======================================
    FILE: src/game/overlays/MenuInGame.tsx
    ====================================== */
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/game/utils/state/store";
import { ASSETS } from "@/constants/assets";
import { useUiClick } from "@/hooks/useUiClick";
import { useHudEditorStore } from "@/game/utils/state/hudEditor";
import { useEnterOrTapToClose } from "@/hooks/useEnterOrTapToClose";
import { audioManager } from "@/game/utils/audio/audio";

/* ---------- UI bits ---------- */
const Btn = (
    p: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "metal" | "ghost" | "danger" }
) => {
    const { variant = "metal", className = "", ...rest } = p;
    const base =
        variant === "metal"
            ? "px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200"
            : variant === "danger"
                ? "px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200"
                : "px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white";
    return <button className={`${base} ${className}`} {...rest} />;
};

const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
    label,
    value,
    onChange,
}) => (
    <div className="text-white/90">
        <div className="mb-1 text-sm">{label}</div>
        <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-300"
        />
    </div>
);

/* === Pointer lock helpers === */
function requestGamePointerLock() {
    try {
        const canvas =
            document.querySelector<HTMLCanvasElement>(".game-root canvas") ||
            document.querySelector<HTMLCanvasElement>("canvas");
        canvas?.requestPointerLock?.();
    } catch { }
}
function exitPointerLock() {
    try { document.exitPointerLock?.(); } catch { }
}

/* =====  MenuInGame  ==== */
type AdsMode = "hold" | "toggle";

const MenuInGame: React.FC = () => {
    const nav = useNavigate();

    const { menuOpen, volumes } = useGameStore();
    const setMenuOpen = useGameStore((s) => s.setMenuOpen);
    const setVolumes = useGameStore((s) => s.setVolumes);
    const hand = useGameStore((s) => s.hand);
    const setHand = useGameStore((s) => s.setHand);

    // Si el store ya tiene adsMode, lo usamos; si no, localStorage o "toggle"
    const storeAdsMode = useGameStore((s) => (s as any).adsMode) as AdsMode | undefined;
    const setStoreAdsMode = useGameStore((s) => (s as any).setAdsMode) as
        | ((m: AdsMode) => void)
        | undefined;

    const playClick = useUiClick();

    const editEnabled = useHudEditorStore((s) => s.enabled);
    const setEditEnabled = useHudEditorStore((s) => s.setEnabled);

    const [showCtrls, setShowCtrls] = useState(false);
    const [showAudio, setShowAudio] = useState(false);
    const [showOpts, setShowOpts] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);

    // Estado UI para ADS mode (fallback si el store no existe)
    const readLocalAds = (): AdsMode => {
        const v = (localStorage.getItem("game.adsMode") || "").toLowerCase();
        return v === "hold" || v === "toggle" ? (v as AdsMode) : "toggle";
    };
    const [adsMode, setAdsMode] = useState<AdsMode>(storeAdsMode ?? readLocalAds());

    // Mantener sincronizado si el store cambia externamente
    useEffect(() => {
        if (storeAdsMode && storeAdsMode !== adsMode) setAdsMode(storeAdsMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeAdsMode]);

    const applyAdsMode = (mode: AdsMode) => {
        setAdsMode(mode);
        if (setStoreAdsMode) {
            try { setStoreAdsMode(mode); } catch { }
        }
        try { localStorage.setItem("game.adsMode", mode); } catch { }
        try { window.dispatchEvent(new CustomEvent("ads-mode", { detail: { mode } })); } catch { }
        playClick();
    };

    const musicRef = useRef<HTMLAudioElement | null>(null);
    const sfxRef = useRef<HTMLAudioElement | null>(null);

    /* ---------- Audio preview ---------- */
    useEffect(() => {
        if (!showAudio) {
            try { musicRef.current?.pause(); sfxRef.current?.pause(); } catch { }
            return;
        }
        if (!musicRef.current) {
            const a = new Audio(ASSETS.audio?.musicCity || "");
            a.loop = true; a.preload = "auto";
            musicRef.current = a;
        }
        if (!sfxRef.current) {
            const a = new Audio(ASSETS.audio?.buttonSound || "");
            a.preload = "auto";
            sfxRef.current = a;
        }
        (async () => {
            try {
                if (typeof audioManager.ensureStarted === "function") {
                    await audioManager.ensureStarted();
                }
                if (musicRef.current) {
                    musicRef.current.volume = volumes.music;
                    musicRef.current.currentTime = 0;
                    musicRef.current.play().catch(() => { });
                }
            } catch { }
        })();
        return () => { try { musicRef.current?.pause(); } catch { } };
    }, [showAudio, volumes.music]);

    const handleMusic = (v: number) => {
        setVolumes({ music: v });
        if (musicRef.current) {
            musicRef.current.volume = v;
            musicRef.current.play().catch(() => { });
        }
    };
    const handleSfx = (v: number) => {
        setVolumes({ sfx: v });
        if (sfxRef.current) {
            sfxRef.current.volume = Math.max(0, Math.min(1, v));
            try { sfxRef.current.currentTime = 0; sfxRef.current.play().catch(() => { }); } catch { }
        }
    };

    /* ---------- TAB dentro del menú = cerrar y volver a pointer-lock ---------- */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!menuOpen) return;
            if (e.key !== "Tab") return;
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(false);
            requestGamePointerLock();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [menuOpen, setMenuOpen]);

    // Tap en móvil/tablet = ESC (cerrar menú y volver a pointer lock)
    useEnterOrTapToClose({
        enabled: menuOpen,
        onClose: () => {
            setMenuOpen(false);
            requestGamePointerLock();
        },
        closeOnBackdropOnly: false,
        keyboardKey: "Tab",
    });

    /* ---- Si el menú se muestra, salimos de pointer lock ---- */
    useEffect(() => { if (menuOpen) exitPointerLock(); }, [menuOpen]);

    /* ---- Cursor visible mientras el menú esté abierto ---- */
    useEffect(() => {
        if (!menuOpen) return;
        try {
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor", "hud-cursor");
        } catch { }
        return () => { try { document.body.classList.remove("show-cursor", "hud-cursor"); } catch { } };
    }, [menuOpen]);

    // Devoluciones tempranas después de los hooks
    if (!menuOpen || editEnabled) return null;

    const onPrimary = () => {
        playClick();
        setMenuOpen(false);
        requestGamePointerLock();
    };

    const onExit = () => {
        playClick();
        nav("/main");
    };

    // Cambiar mano y forzar render del Canvas
    const applyHand = (h: "left" | "right") => {
        try { setHand(h); } catch { }
        try {
            (window as any).__invalidate?.();
            requestAnimationFrame(() => { try { (window as any).__invalidate?.(); } catch { } });
        } catch { }
        playClick();
    };

    // Entrar a edición en el frame siguiente para evitar parpadeo
    const onStartEdit = () => {
        playClick();
        setMenuOpen(false);
        requestAnimationFrame(() => { setEditEnabled(true); });
    };

    return (
        <div className="fixed inset-0 z-[999999] pointer-events-auto isolate">
            {/* Backdrop clicable */}
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                onClick={() => {
                    // Si prefieres NO cerrar con backdrop, comenta estas 2 líneas.
                    playClick();
                    onPrimary();
                }}
            />
            <div className="absolute inset-0 grid place-items-center p-4">
                <motion.div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menú"
                    tabIndex={-1}
                    className="panel-glass w-[min(720px,92vw)] outline-none"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                >
                    <div className="mb-3">
                        <h2 className="panel-title">Menú</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                        <Btn onClick={onPrimary}>CONTINUAR</Btn>

                        <Btn
                            variant="ghost"
                            onClick={() => { playClick(); setShowCtrls((v) => !v); }}
                            aria-expanded={showCtrls}
                        >
                            CONTROLES
                        </Btn>

                        <Btn
                            variant="ghost"
                            onClick={() => { playClick(); setShowAudio((v) => !v); }}
                            aria-expanded={showAudio}
                        >
                            AUDIO
                        </Btn>

                        <Btn
                            variant="ghost"
                            onClick={() => { playClick(); setShowOpts((v) => !v); }}
                            aria-expanded={showOpts}
                        >
                            OPCIONES
                        </Btn>

                        <Btn variant="ghost" onClick={onStartEdit}>
                            EDITAR INTERFACE
                        </Btn>

                        <Btn variant="danger" onClick={onExit}>
                            SALIR
                        </Btn>
                    </div>

                    {/* CONTROLES */}
                    <AnimatePresence>
                        {showCtrls && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 grid grid-cols-2 gap-2 text-white/90 text-sm">
                                    <div>- W = Avanzar</div>
                                    <div>- S = Retroceder</div>
                                    <div>- Q = Izquierda (strafe)</div>
                                    <div>- E = Derecha (strafe)</div>
                                    <div>- R = Recargar arma</div>
                                    <div>- SPACE = Saltar</div>
                                    <div>- SHIFT = Agacharse</div>
                                    <div>- F = FullScreen/NavScreen</div>
                                    <div>- V = Correr</div>
                                    <div>- Click Izq = Disparar</div>
                                    <div>- TAB = Abrir/Cerrar menú</div>
                                    <div className="col-span-2">- M = Expandir/Contraer Radar</div>
                                </div>
                                <div className="mt-4 flex justify-end gap-3">
                                    <Btn variant="ghost" onClick={() => { playClick(); setShowCtrls(false); }}>
                                        CERRAR
                                    </Btn>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* AUDIO */}
                    <AnimatePresence>
                        {showAudio && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 grid gap-4">
                                    <Slider
                                        label={`Música + lluvia (${Math.round(volumes.music * 100)}%)`}
                                        value={volumes.music}
                                        onChange={handleMusic}
                                    />
                                    <Slider
                                        label={`Sonido (SFX) (${Math.round(volumes.sfx * 100)}%)`}
                                        value={volumes.sfx}
                                        onChange={handleSfx}
                                    />
                                </div>
                                <div className="mt-4 flex justify-between gap-3">
                                    <Btn variant="ghost" onClick={() => { playClick(); setShowAudio(false); }}>
                                        CERRAR
                                    </Btn>
                                </div>
                                <audio ref={musicRef} src={ASSETS.audio.musicCity} preload="auto" style={{ display: "none" }} />
                                <audio ref={sfxRef} src={ASSETS.audio?.buttonSound || ""} preload="auto" style={{ display: "none" }} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* OPCIONES */}
                    <AnimatePresence>
                        {showOpts && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 grid gap-5 text-white/90">
                                    {/* Mano */}
                                    <div>
                                        <div className="text-sm mb-2">Preferencia de mano</div>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="handed"
                                                    checked={hand === "right"}
                                                    onChange={() => applyHand("right")}
                                                />
                                                <span>Diestro (por defecto)</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="handed"
                                                    checked={hand === "left"}
                                                    onChange={() => applyHand("left")}
                                                />
                                                <span>Zurdo</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Zoom ADS */}
                                    <div>
                                        <div className="text-sm mb-2">Zoom (ADS)</div>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="adsMode"
                                                    checked={adsMode === "hold"}
                                                    onChange={() => applyAdsMode("hold")}
                                                />
                                                <span>Mantener (hold)</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="adsMode"
                                                    checked={adsMode === "toggle"}
                                                    onChange={() => applyAdsMode("toggle")}
                                                />
                                                <span>Conmutar (toggle)</span>
                                            </label>
                                        </div>
                                        <div className="mt-1 text-xs text-white/60">
                                            * <b>Hold</b>: mantén pulsado click derecho para acercar. <b>Toggle</b>: un clic activa/desactiva el zoom.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end gap-3">
                                    <Btn variant="ghost" onClick={() => { playClick(); setShowOpts(false); }}>
                                        CERRAR
                                    </Btn>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default MenuInGame;
