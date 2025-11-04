/*  =======================================
    FILE: src/game/overlays/VoiceSelect.tsx
    ======================================= */
import React from "react";

export type VoiceSelectProps = {
    voices: SpeechSynthesisVoice[];
    selectedURI: string | null;
    onPick: (uri: string) => void;
    title?: string;
};

/**
 * Selector compacto de voces TTS.
 * - Cierra al hacer click fuera o pulsar ENTER
 * - Listado simple y accesible (role="listbox")
 * - Reutilizable por cualquier overlay
 */
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
                                ${selected ? "bg-cyan-400/15 text-cyan-100"
                                                : "text-white/90 hover:bg-cyan-400/10 hover:text-cyan-100"}`}
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

export default VoiceSelect;
