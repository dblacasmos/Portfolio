/*  ====================================
    FILE: src/game/overlays/HudEditOverlay.tsx
    ==================================== */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useHudEditorStore, type HudLayoutExport } from "../utils/state/hudEditor";
import { useGameStore } from "../utils/state/store";

type Props = { exportLayout: () => HudLayoutExport };

function requestGamePointerLock() {
    try {
        const canvas =
            document.querySelector<HTMLCanvasElement>(".game-root canvas") ||
            document.querySelector<HTMLCanvasElement>("canvas");
        canvas?.requestPointerLock?.();
    } catch { }
}

/** Overlay de edición HUD */
const HudEditOverlay: React.FC<Props> = ({ exportLayout }) => {
    const enabled = useHudEditorStore((s) => s.enabled);
    const setEnabled = useHudEditorStore((s) => s.setEnabled);

    const applyToCfg = useHudEditorStore((s) => s.applyToCfg);
    const resetAll = useHudEditorStore((s) => s.resetAll);
    const listProf = useHudEditorStore((s) => s.listProfiles);
    const saveProf = useHudEditorStore((s) => s.saveProfile);
    const loadProf = useHudEditorStore((s) => s.loadProfile);
    const setSelected = useHudEditorStore((s) => s.setSelected);
    const setHovered = useHudEditorStore((s) => s.setHovered);

    const setMenuOpen = useGameStore((s) => s.setMenuOpen);

    const [savedBlink, setSavedBlink] = useState<number>(0);
    const [loadingBlink, setLoadingBlink] = useState<number>(0);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [showSave, setShowSave] = useState(false);
    const [showLoad, setShowLoad] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [profileToLoad, setProfileToLoad] = useState<string>("");

    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            if (loadTimer.current) clearTimeout(loadTimer.current);
        };
    }, []);

    const gridStyle = useMemo<React.CSSProperties>(
        () => ({
            backgroundImage:
                "linear-gradient(rgba(34,211,238,0.12) 1px, transparent 2px), linear-gradient(90deg, rgba(34,211,238,0.12) 2px, transparent 1px)",
            backgroundSize: "24px 24px, 24px 24px",
            backgroundPosition: "0 0, 0 0",
        }),
        []
    );

    // Señaliza modo edición + fuerza cursor visible (y quita modo juego)
    useEffect(() => {
        if (!enabled) return;

        try {
            setMenuOpen(false);                  // cerrar menú si estuviera
            document.body.classList.remove("hide-cursor");
            document.body.classList.add("show-cursor");
            document.body.classList.add("hud-cursor");
            document.body.classList.add("hud-editing"); // activa reglas CSS (incluido canvas inherit)
        } catch { }

        const stopEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                // no se sale con ESC; solo con el botón "FINALIZAR EDITAR"
                e.stopPropagation();
            }
        };
        window.addEventListener("keydown", stopEsc, true);

        return () => {
            document.body.classList.remove("hud-editing");
            window.removeEventListener("keydown", stopEsc, true);
        };
    }, [enabled, setMenuOpen]);

    const handleReset = () => {
        try { resetAll(); applyToCfg(); } catch { }
    };
    const finish = () => {
        try { applyToCfg(); } catch { }
        setSelected(null);
        setHovered(null);
        setEnabled(false);
        requestGamePointerLock(); // volver al juego con pointer lock
    };
    const handleSaveAsk = () => { setShowLoad(false); setShowSave(true); };
    const handleLoadAsk = () => {
        setShowSave(false); setShowLoad(true);
        const first = listProf()[0] ?? "";
        setProfileToLoad(first);
    };
    const handleSaveCommit = () => {
        const valid = /^[A-Za-z0-9]+$/.test(profileName);
        if (!valid) return;
        try {
            saveProf(profileName);
            applyToCfg();
            setSavedBlink(Date.now());
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => setSavedBlink(0), 1000);
            setShowSave(false);
            const json = JSON.stringify(exportLayout(), null, 2);
            navigator.clipboard?.writeText?.(json).catch(() => { });
        } catch { }
    };
    const handleLoadCommit = () => {
        if (!profileToLoad) return;
        try {
            loadProf(profileToLoad);
            setLoadingBlink(Date.now());
            if (loadTimer.current) clearTimeout(loadTimer.current);
            loadTimer.current = setTimeout(() => setLoadingBlink(0), 1000);
            setShowLoad(false);
        } catch { }
    };

    if (!enabled) return null;

    // NUEVO: portar al root inmersivo, no a document.body
    const portalRoot =
        (typeof document !== "undefined" &&
            document.querySelector("[data-immersive-root]")) as HTMLElement | null;

    return createPortal(
        <div
            className="fixed inset-0 z-[1000] pointer-events-none"
            style={gridStyle}
            data-hud-edit-overlay=""
        >
            <div className="pointer-events-auto absolute top-2 left-2 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleReset}
                        className="h-9 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 text-[13px] font-medium shadow-sm"
                    >
                        RESET
                    </button>

                    <button
                        onClick={handleSaveAsk}
                        className="h-9 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[13px] font-medium shadow-sm"
                    >
                        GUARDAR
                    </button>

                    <button
                        onClick={handleLoadAsk}
                        className="h-9 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-100 text-[13px] font-medium shadow-sm"
                    >
                        CARGAR
                    </button>

                    <button
                        onClick={finish}
                        className="h-9 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[13px] font-semibold shadow-sm"
                        title="Finalizar edición (oculta contenedores y guarda en CFG)"
                    >
                        FINALIZAR EDITAR
                    </button>

                    {!!savedBlink && (
                        <motion.div
                            key={`save-${savedBlink}`}
                            className="ml-2 h-9 px-3 grid place-items-center rounded-lg bg-white/10 border border-white/15 text-white/85 text-[12px]"
                            animate={{ opacity: [1, 0.35, 1] }}
                            transition={{ duration: 1.0, ease: "easeInOut" }}
                        >
                            Guardando…
                        </motion.div>
                    )}

                    {!!loadingBlink && (
                        <motion.div
                            key={`load-${loadingBlink}`}
                            className="ml-2 h-9 px-3 grid place-items-center rounded-lg bg-white/10 border border-white/15 text-white/85 text-[12px]"
                            animate={{ opacity: [1, 0.35, 1] }}
                            transition={{ duration: 1.0, ease: "easeInOut" }}
                        >
                            Cargando…
                        </motion.div>
                    )}
                </div>

                <motion.div
                    className="inline-block rounded-md px-2 py-1 bg-cyan-400/10 border border-cyan-300/30 text-cyan-100 text-[12px] w-fit"
                    animate={{ opacity: [1, 0.35, 1] }}
                    transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                >
                    Click para seleccionar · Arrastra con botón izq · <kbd className="px-1 py-0.5 bg-white/10 rounded">SHIFT</kbd> + rueda para escalar
                </motion.div>
            </div>

            {/* Modales GUARDAR / CARGAR */}
            <AnimatePresence>
                {showSave && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="pointer-events-auto absolute top-14 left-2 p-3 rounded-xl border border-cyan-400/40 bg-[rgba(8,15,25,.9)] shadow-[0_0_24px_rgba(34,211,238,.25)] w-[min(300px,92vw)]"
                    >
                        <div className="text-sm text-white/90 mb-2">Guardar perfil</div>
                        <input
                            className="w-full px-2 py-1 rounded-md bg-black/40 border border-white/15 text-white/90 text-sm outline-none focus:border-cyan-400/50"
                            placeholder="Nombre (sólo letras y números)"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            maxLength={24}
                        />
                        <div className="mt-2 flex gap-2 justify-end">
                            <button
                                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[13px]"
                                onClick={() => setShowSave(false)}
                            >
                                CANCELAR
                            </button>
                            <button
                                className="h-9 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[13px] font-medium"
                                onClick={handleSaveCommit}
                                disabled={!/^[A-Za-z0-9]+$/.test(profileName)}
                            >
                                OK
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLoad && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="pointer-events-auto absolute top-14 left-2 p-3 rounded-xl border border-sky-400/40 bg-[rgba(8,15,25,.9)] shadow-[0_0_24px_rgba(56,189,248,.25)] w-[min(300px,92vw)]"
                    >
                        <div className="text-sm text-white/90 mb-2">Cargar perfil</div>
                        <select
                            className="w-full px-2 py-1 rounded-md bg-black/40 border border-white/15 text-white/90 text-sm outline-none focus:border-sky-400/50"
                            value={profileToLoad}
                            onChange={(e) => setProfileToLoad(e.target.value)}
                        >
                            {listProf().length === 0 && <option value="">(No hay perfiles)</option>}
                            {listProf().map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <div className="mt-2 flex gap-2 justify-end">
                            <button
                                className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[13px]"
                                onClick={() => setShowLoad(false)}
                            >
                                CANCELAR
                            </button>
                            <button
                                className="h-9 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-100 text-[13px] font-medium"
                                onClick={handleLoadCommit}
                                disabled={!profileToLoad}
                            >
                                OK
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>,
        portalRoot ?? document.body
    );
};

export default HudEditOverlay;
