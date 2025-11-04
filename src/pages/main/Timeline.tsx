/* ================================
  FILE: src/pages/main/Timeline.tsx
  ================================= */
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { useUiClick } from "@/hooks/useUiClick";
import { enterImmersive } from "@/game/utils/immersive";
import {
  showGlobalLoadingOverlay,
  setGlobalLoadingProgress,
  markGlobalLoadingStage,
  hideGlobalLoadingOverlay,
} from "@/game/overlays/GlobalLoadingPortal";
import { hardCleanupBeforeMain } from "@/game/utils/cleanupMain";
import { patchThreeIndex0AttributeNameWarning } from "@/game/utils/three/fixIndex0Attr";
import { useRobotCursor } from "@/hooks/useRobotCursor";
import { audioManager } from "@/game/utils/audio/audio";

patchThreeIndex0AttributeNameWarning();

/* ---------- helpers ---------- */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const isCoarsePointer = () =>
  typeof window !== "undefined" ? window.matchMedia?.("(pointer: coarse)")?.matches ?? false : false;

/* ---------- Utils VRAM ---------- */
function disposeVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  try {
    el.pause();
  } catch { }
  try {
    el.removeAttribute("src");
    el.load();
  } catch { }
}
function useManagedAudio(
  src?: string,
  { volume = 1, loop = false }: { volume?: number; loop?: boolean } = {}
) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = "auto";
    a.loop = loop;
    a.volume = volume;
    ref.current = a;
    return () => {
      try {
        a.pause();
      } catch { }
      (a as any).src = "";
      try {
        a.load?.();
      } catch { }
      ref.current = null;
    };
  }, [src, loop, volume]);
  return ref;
}

/* ---------- LORE Capítulo 2 ---------- */
const LORE_TITLE = "CAPÍTULO 2: TIMELINE";
const LORE_NARRATION =
  "Tras el Portfolio, mi despliegue cambia de plano. Entro en la TIMELINE, un registro vivo donde cada combate, cada decisión y cada avance quedan anclados al tiempo. " +
  "Cada marca temporal es un contrato de precisión: objetivos nítidos, rutas en sombra y riesgos calculados. Un dron enemigo patrulla en silencio mientras la ciudad respira en neón; " +
  "el reloj, implacable, dicta la estrategia. Completo misiones, aseguro datos y pulso mi hoja de personaje sin ceder el control. Aquí, la disciplina militar se alía con el diseño del código: " +
  "rápido, claro y letal. Si fallamos, registramos; si vencemos, evolucionamos.";

export default function Timeline() {
  // Activa cursor robot en esta pantalla
  useRobotCursor(true);
  const nav = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const playClick = useUiClick();

  // 🔹 Parámetros de vista vía querystring (arriba, porque se usan en efectos de más abajo)
  const showControls = params.get("view") === "controles";
  const showAudio = params.get("view") === "audio";
  const pushView = (v: string | null) => {
    const p = new URLSearchParams(window.location.search);
    if (v) p.set("view", v);
    else p.delete("view");
    nav({ pathname: "/timeline", search: p.toString() ? `?${p.toString()}` : "" });
  };

  // Fases principales del flujo
  const [phase, setPhase] = useState<"cap2" | "transition" | "followup" | "transition2" | "menu">("cap2");

  // Sincronías de TTS/Crawl
  const [crawlDuration, setCrawlDuration] = useState<number>(104);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsRate, setTtsRate] = useState<number>(1.2);
  const [cap2Done, setCap2Done] = useState(false);

  // Timings de transiciones/paneles
  const TRANSITION_DURATION_MS = 800;
  const PANELS_DELAY_AFTER_TRANSITION_MS = 900;
  const CRAWL_SLOW_FACTOR = 4.8;

  // Refs para popover "CONTROLES"
  const controlsBtnRef = useRef<HTMLButtonElement | null>(null);
  const controlsPopRef = useRef<HTMLDivElement | null>(null);
  const recalcControlsPos = () => {
    const btn = controlsBtnRef.current,
      pop = controlsPopRef.current;
    if (!btn || !pop) return;
    const b = btn.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    let left = b.left,
      top = b.bottom + 8;
    const pad = 8;
    left = clamp(left, pad, window.innerWidth - p.width - pad);
    top = clamp(top, pad, window.innerHeight - p.height - pad);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };

  // Media
  const cap2VideoRef = useRef<HTMLVideoElement | null>(null);
  const followVideoRef = useRef<HTMLVideoElement | null>(null);
  const cap2MusicRef = useManagedAudio(ASSETS.audio?.capDos, { volume: 0.45, loop: false });

  // ENTER: cortar media activa y avanzar de fase
  const doEscAdvance = () => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();

      if (phase === "cap2") {
        try {
          const v = cap2VideoRef.current;
          v && (v.pause(), disposeVideo(v));
        } catch { }
        try {
          const m = cap2MusicRef.current;
          m && (m.pause(), (m.currentTime = 0));
        } catch { }
        try {
          window.speechSynthesis?.cancel();
        } catch { }
        setPhase("transition");
        return;
      }
      if (phase === "followup") {
        try {
          const v = followVideoRef.current;
          if (v) {
            v.pause();
            v.muted = true;
            disposeVideo(v);
          }
        } catch { }
        setPhase("transition2");
        return;
      }
    };
    return onKey;
  };
  useEffect(() => {
    const onKey = doEscAdvance();
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase, cap2MusicRef]);

  // TAP en móviles/tablets = ENTER durante fases de vídeo ("cap2" y "followup")
  useEffect(() => {
    if (!(phase === "cap2" || phase === "followup")) return;
    if (!isCoarsePointer()) return;

    const onTap = (e: PointerEvent) => {
      e.stopPropagation(); // aquí solo hay vídeo a pantalla completa
      const handleEsc = doEscAdvance();
      handleEsc(new KeyboardEvent("keydown", { key: "Enter" }) as any);
    };

    window.addEventListener("pointerdown", onTap, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", onTap, true);
  }, [phase, cap2MusicRef]);

  // Recolocar popover de CONTROLES y cerrar al hacer click fuera
  // Recoloca al abrir y gestiona cierre por click fuera SOLO cuando está abierto
  useLayoutEffect(() => {
    if (!showControls) return;
    // espera un frame para asegurar que el DOM del popover está medido
    requestAnimationFrame(() => recalcControlsPos());
  }, [showControls]);

  useEffect(() => {
    if (!showControls) return;
    const onRecalc = () => recalcControlsPos();
    const onClickOutside = (ev: MouseEvent) => {
      if (!controlsPopRef.current || !controlsBtnRef.current) return;
      const pop = controlsPopRef.current,
        btn = controlsBtnRef.current;
      if (pop.contains(ev.target as Node) || btn.contains(ev.target as Node)) return;
      // cerrar vía querystring (evitamos referenciar closePanels antes de su declaración)
      pushView(null);
    };
    window.addEventListener("resize", onRecalc);
    window.addEventListener("scroll", onRecalc, true);
    window.addEventListener("orientationchange", onRecalc);
    window.addEventListener("pointerdown", onClickOutside, { capture: true });
    return () => {
      window.removeEventListener("resize", onRecalc);
      window.removeEventListener("scroll", onRecalc, true);
      window.removeEventListener("orientationchange", onRecalc);
      window.removeEventListener("pointerdown", onClickOutside, true);
    };
  }, [showControls]);

  // Precarga del juego
  useEffect(() => {
    import("../../game/Game").catch(() => { });
  }, []);

  // Partir narración en 2 párrafos equilibrados
  const narrationParagraphs = useMemo(() => {
    const sentences = LORE_NARRATION.split(/(?<=\.)\s+/).filter(Boolean);
    if (sentences.length <= 1) return [LORE_NARRATION, ""];
    const totalLen = sentences.reduce((n, s) => n + s.length, 0);
    const target = totalLen / 2;
    let acc = 0;
    let cut = sentences.length - 1;
    for (let i = 0; i < sentences.length - 1; i++) {
      acc += sentences[i].length;
      if (acc >= target) {
        cut = i;
        break;
      }
    }
    return [sentences.slice(0, cut + 1).join(" "), sentences.slice(cut + 1).join(" ")];
  }, []);

  // Ajusta rate TTS para que “quede cerca” de la música
  function tuneRateForTargetSeconds(text: string, targetSec: number) {
    const words = (text.match(/\S+/g) || []).length;
    const baseWps = 3; // ~180 wpm cuando rate=1.0
    if (!targetSec || targetSec < 5) return 0.92;
    const biasedTarget = targetSec * 0.98;
    const raw = words / (baseWps * biasedTarget);
    const withBias = raw * 1.06;
    return Math.max(0.7, Math.min(1.6, withBias));
  }
  const TTS_SPEED_BOOST = 1.15;

  // Mide duración de la música y sincroniza crawl/tts
  useEffect(() => {
    const a = cap2MusicRef.current;
    if (!a) return;
    const onMeta = () => {
      if (isFinite(a.duration) && a.duration > 5) {
        setCrawlDuration(a.duration * CRAWL_SLOW_FACTOR);
        const target = a.duration;
        const base = tuneRateForTargetSeconds(`${LORE_TITLE}. ${narrationParagraphs.join(" ")}`, target);
        const rate = Math.max(0.7, Math.min(1.8, base * TTS_SPEED_BOOST));
        setTtsRate(rate);
      }
    };
    a.addEventListener("loadedmetadata", onMeta);
    return () => a.removeEventListener("loadedmetadata", onMeta);
  }, [cap2MusicRef, narrationParagraphs]);

  // CAP.2: vídeo + música + TTS
  useEffect(() => {
    if (phase !== "cap2") return;
    const v = cap2VideoRef.current;
    const m = cap2MusicRef.current;

    if (v) {
      const safePlay = () => v.play().catch(() => { });
      try {
        v.muted = true; // autoplay-friendly
        v.currentTime = 0;
        v.loop = true;
        if (document.hidden) {
          const once = () => {
            document.removeEventListener("visibilitychange", once);
            safePlay();
            setTimeout(() => { try { v.muted = false; v.volume = 1; } catch { } }, 150);
          };
          document.addEventListener("visibilitychange", once, { once: true });
        } else {
          safePlay();
          setTimeout(() => { try { v.muted = false; v.volume = 1; } catch { } }, 150);
        }
      } catch { }
    }
    try {
      m?.play().catch(() => { });
    } catch { }

    // TTS
    if ("speechSynthesis" in window) {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(`${LORE_TITLE}. ${narrationParagraphs.join(" ")}`);
      utter.lang = "es-ES";
      utter.rate = Math.max(0.7, Math.min(1.6, (ttsRate ?? 1.0) * 1.2));
      utter.pitch = 0.95;

      utter.onstart = () => {
        setTtsActive(true);
        if (m) m.volume = 0.25;
      };
      utter.onend = () => {
        setTtsActive(false);
        if (m) m.volume = 0.45;
        setCap2Done(true);
      };

      const pickVoice = () => {
        const voices = synth.getVoices();
        const maleEs = voices.find(
          (v) => /es-ES/.test(v.lang) && /male|hombre|Miguel|Jorge|Diego|Enrique/i.test(v.name)
        );
        const anyEs = voices.find((v) => /es-ES/i.test(v.lang)) || voices.find((v) => /es/i.test(v.lang));
        utter.voice = (maleEs || anyEs || null) as SpeechSynthesisVoice | null;
        synth.cancel();
        synth.speak(utter);
      };

      if (synth.getVoices().length === 0) {
        const onVoices = () => {
          pickVoice();
          synth.removeEventListener("voiceschanged", onVoices);
        };
        synth.addEventListener("voiceschanged", onVoices);
      } else {
        pickVoice();
      }

      return () => {
        try {
          synth.cancel();
        } catch { }
      };
    }
  }, [phase, cap2MusicRef, ttsRate, narrationParagraphs]);

  // Fallback: si el TTS no dispara onend, cierra al acabar el crawl largo
  useEffect(() => {
    if (phase !== "cap2") return;
    const total = Math.max(5, crawlDuration) * 1000 + 200;
    const safetyTimer = window.setTimeout(() => setCap2Done(true), total);
    return () => clearTimeout(safetyTimer);
  }, [phase, crawlDuration]);

  // Fin de CAP.2 -> transición negra
  useEffect(() => {
    if (phase !== "cap2" || !cap2Done) return;
    setCap2Done(false);
    try {
      disposeVideo(cap2VideoRef.current);
    } catch { }
    const m = cap2MusicRef.current;
    if (m) {
      try {
        m.pause();
        m.currentTime = 0;
      } catch { }
    }
    setPhase("transition");
  }, [cap2Done, phase, cap2MusicRef]);

  // Transición -> followup
  useEffect(() => {
    if (phase !== "transition") return;
    const t = window.setTimeout(() => setPhase("followup"), TRANSITION_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // FOLLOWUP: reproduce video1; al terminar -> transición2
  useEffect(() => {
    if (phase !== "followup") return;
    const v = followVideoRef.current;
    let watchdogTimer: number | undefined;

    const fadeAndGoTransition2 = () => {
      if (!v) {
        setPhase("transition2");
        return;
      }
      try {
        v.muted = false;
      } catch { }
      const startVol = Math.max(0, Math.min(1, v.volume || 1));
      const start = performance.now();
      const D = 400;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / D);
        try {
          v.volume = startVol * (1 - p);
        } catch { }
        if (p < 1) requestAnimationFrame(step);
        else {
          try {
            v.pause();
          } catch { }
          try {
            v.muted = true;
          } catch { }
          setPhase("transition2");
        }
      };
      requestAnimationFrame(step);
    };

    const onEnded = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      fadeAndGoTransition2();
    };

    if (v) {
      const safePlay = () => v.play().catch(() => { });
      try {
        v.muted = true;
        v.currentTime = 0;
        v.loop = false; // necesitamos 'ended'
        if (document.hidden) {
          const once = () => {
            document.removeEventListener("visibilitychange", once);
            safePlay();
            setTimeout(() => { try { v.muted = false; v.volume = 1; } catch { } }, 150);
          };
          document.addEventListener("visibilitychange", once, { once: true });
        } else {
          safePlay();
          setTimeout(() => { try { v.muted = false; v.volume = 1; } catch { } }, 150);
        }
      } catch { }
    }

    v?.addEventListener("ended", onEnded, { once: true });

    const armWatchdog = () => {
      const dur = v?.duration;
      const ms = Number.isFinite(dur) && (dur as number) > 0 ? Math.ceil((dur as number) * 1000) + 150 : 15000;
      watchdogTimer = window.setTimeout(onEnded, ms);
    };
    if (v) {
      if (v.readyState >= 1) armWatchdog();
      else v.addEventListener("loadedmetadata", armWatchdog, { once: true });
    }

    return () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      v?.removeEventListener("ended", onEnded);
      v?.removeEventListener("loadedmetadata", armWatchdog as any);
      disposeVideo(v);
    };
  }, [phase]);

  // TRANSITION2 -> espera y paneles
  useEffect(() => {
    if (phase !== "transition2") return;
    const t = window.setTimeout(() => setPhase("menu"), TRANSITION_DURATION_MS + PANELS_DELAY_AFTER_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Limpieza global
  useEffect(() => {
    return () => {
      disposeVideo(cap2VideoRef.current);
      disposeVideo(followVideoRef.current);
      try {
        window.speechSynthesis?.cancel();
      } catch { }
    };
  }, []);

  // Acciones de UI
  const startGame = async () => {
    playClick();
    // Asegura audio desbloqueado antes de navegar/inmersivo (Safari/Chrome móvil)
    try {
      await audioManager.ensureStarted?.();
      // plan B por si el contexto sigue "suspended"
      const ctx: AudioContext | undefined = (audioManager as any)?.ctx;
      if (ctx && ctx.state !== "running") {
        const resume = () => {
          ctx.resume().catch(() => { });
          window.removeEventListener("pointerdown", resume, true);
          window.removeEventListener("keydown", resume, true);
        };
        window.addEventListener("pointerdown", resume, { once: true, capture: true });
        window.addEventListener("keydown", resume, { once: true, capture: true });
      }
    } catch { }
    try {
      await purgeAppCaches();
    } catch { }
    // Libera VRAM/decoders de pantallas previas
    hardCleanupBeforeMain({});
    const canvas = document.querySelector("canvas") as HTMLElement | null;
    enterImmersive((canvas ?? document.documentElement) as HTMLElement);

    // Overlay con watchdog
    showGlobalLoadingOverlay({ minMs: 4000, maxMs: 15000 });
    markGlobalLoadingStage("navigating");
    setGlobalLoadingProgress(0.02);
    nav("/game", { replace: true });

    // Plan B
    window.setTimeout(() => {
      try {
        hideGlobalLoadingOverlay();
      } catch { }
    }, 9000);
  };

  const openControls = () => {
    playClick();
    pushView("controles");
  };
  const openAudio = () => {
    playClick();
    pushView("audio");
  };
  const goMain = () => {
    playClick();
    nav("/main");
  };
  const closePanels = () => {
    playClick();
    pushView(null);
  };

  // Iniciar juego con limpieza agresiva
  async function purgeAppCaches() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { }
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => { })));
      }
    } catch { }
    try {
      const prefixes = ["Intro:", "Main:", "Game:", "INTRO_", "MAIN_", "GAME_"];
      Object.keys(localStorage).forEach((k) => {
        if (prefixes.some((p) => k.startsWith(p))) localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach((k) => {
        if (prefixes.some((p) => k.startsWith(p))) sessionStorage.removeItem(k);
      });
    } catch { }
    try {
      navigator.serviceWorker?.controller?.postMessage?.({ type: "PURGE_APP_CACHES" });
    } catch { }
  }

  const cap2VideoSrcs = useMemo(() => [ASSETS.video?.capDos], []);
  const followVideoSrcs = useMemo(() => [ASSETS.video?.video1], []);

  return (
    <div data-immersive-root className="fixed inset-0 overflow-hidden bg-black safe-stage">
      {/* ---------- Fase 1: CAP.2 ---------- */}
      <AnimatePresence initial={false}>
        {phase === "cap2" && (
          <motion.div
            key="cap2"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <video
              ref={cap2VideoRef}
              className="absolute inset-0 w-full h-dvh object-cover z-0 pointer-events-none"
              playsInline
              autoPlay
              muted
              preload="auto"
              onError={(e) => console.warn("capDos error", e)}
            >
              {cap2VideoSrcs.filter(Boolean).map((src) => (
                <source key={src} src={src!} type="video/mp4" />
              ))}
            </video>
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/75 via-black/20 to-black/80 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- CRAWL rojo sobre el vídeo ---------- */}
      <AnimatePresence>
        {phase === "cap2" && (
          <motion.div
            key="crawl"
            className="fixed inset-0 z-[2147483647] overflow-hidden pointer-events-none"
            aria-label="Crawl estilo Star Wars"
            style={{ isolation: "isolate" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80" />
            <div className="relative w-full h-full grid place-items-center">
              <div className="w-full max-w-[1100px] px-6 md:px-10 [perspective:650px]">
                <motion.div
                  className="mx-auto origin-bottom text-center transform-gpu subpixel-antialiased"
                  style={{
                    fontFamily: "'Orbitron', system-ui, sans-serif",
                    color: "#ff4d4d",
                    textShadow:
                      "0 0 2px rgba(255,80,80,1), 0 0 12px rgba(255,80,80,0.8), 0 0 22px rgba(255,80,80,0.6)",
                    WebkitTextStroke: "0.5px rgba(0,0,0,0.35)",
                  }}
                  initial={{ rotateX: 12, y: "90vh", scale: 1, opacity: 0 }}
                  animate={{ rotateX: 12, y: "-200vh", scale: 0.9, opacity: 1 }}
                  transition={{
                    ease: "linear",
                    y: { duration: crawlDuration },
                    scale: { duration: crawlDuration },
                    opacity: { duration: 0.35 },
                  }}
                >
                  <h3
                    className="mb-8 font-extrabold uppercase"
                    style={{
                      fontSize: "clamp(2rem, 2.2vw + 1.6rem, 3.25rem)",
                      textShadow:
                        "0 0 2px rgba(255,80,80,1), 0 0 14px rgba(255,80,80,0.85), 0 0 28px rgba(255,80,80,0.65)",
                    }}
                  >
                    {LORE_TITLE}
                  </h3>
                  {narrationParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className={`leading-[1.65] ${i === 0 ? "mb-5" : ""}`}
                      style={{ fontSize: "clamp(1.1rem, 1.15vw + 0.9rem, 1.7rem)" }}
                    >
                      {para}
                    </p>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Transición a negro (cap2 → video1) ---------- */}
      <AnimatePresence initial={false}>
        {phase === "transition" && (
          <motion.div
            key="xfade"
            className="absolute inset-0 bg-black z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_DURATION_MS / 1000, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* ---------- Fase 2: followup (video1) ---------- */}
      <AnimatePresence initial={false}>
        {phase === "followup" && (
          <motion.div
            key="follow"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <video
              ref={followVideoRef}
              className="absolute inset-0 w-full h-dvh object-cover z-0"
              playsInline
              autoPlay
              preload="auto"
              onLoadedMetadata={() => {
                try {
                  followVideoRef.current?.play();
                } catch { }
              }}
              onError={(e) => console.warn("video1 error", e)}
            >
              {followVideoSrcs.filter(Boolean).map((src) => (
                <source key={src} src={src!} type="video/mp4" />
              ))}
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Transición a negro (video1 → paneles) ---------- */}
      <AnimatePresence initial={false}>
        {phase === "transition2" && (
          <motion.div
            key="xfade2"
            className="absolute inset-0 bg-black z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_DURATION_MS / 1000, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* ---------- Fase 3: Paneles ---------- */}
      {phase === "menu" && (
        <div className="relative z-40 min-h-dvh w-full px-3 sm:px-5 lg:px-6 py-[max(0.8rem,env(safe-area-inset-top))] pb-[max(0.8rem,env(safe-area-inset-bottom))] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="panel-glass w-full max-w-[min(96vw,44.8rem)]"
          >
            <div className="mb-4 sm:mb-5">
              <h2 className="panel-title">Timeline</h2>
              <p className="panel-subtitle">Elige una opción para continuar.</p>
            </div>

            <div className="grid gap-2 sm:gap-2.5 [--btn-h:2.2rem] sm:[--btn-h:2.4rem]">
              <button onClick={startGame} className="btn-metal w-full h-[var(--btn-h)] text-sm sm:text-base">
                INICIAR
              </button>
              <button
                onClick={openControls}
                ref={controlsBtnRef}
                className="btn-metal w-full h-[var(--btn-h)] text-sm sm:text-base"
                aria-expanded={showControls}
                aria-controls="controls-panel"
              >
                CONTROLES
              </button>
              <button
                onClick={openAudio}
                className="btn-metal w-full h-[var(--btn-h)] text-sm sm:text-base"
                aria-expanded={showAudio}
                aria-controls="audio-panel"
              >
                AUDIO
              </button>
              <button
                onClick={goMain}
                className="w-full h-[var(--btn-h)] text-sm sm:text-base px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200"
              >
                SALIR
              </button>
            </div>

            {showAudio && <AudioPanel onClose={closePanels} />}
          </motion.div>
        </div>
      )}

      {/* Popover flotante de CONTROLES */}
      <ControlsFloating open={showControls} btnRef={controlsBtnRef} popRef={controlsPopRef} onClose={closePanels} />
    </div>
  );
}

/* ===== Popover de CONTROLES (no se sale del viewport) ===== */
function ControlsPopover({
  anchorRef,
  popRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  popRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={popRef}
      className="fixed z-[2147483647] w-[min(92vw,360px)] max-h-[80vh] overflow-auto rounded-xl
                 bg-zinc-900/95 border border-white/10 shadow-2xl p-3"
      aria-labelledby="controls-panel"
    >
      {children}
    </div>
  );
}

/* ================ Panels ================ */
function ControlsPanel({ onClose }: { onClose: () => void }) {
  const pairs: Array<[string, string]> = [
    ["Avanzar", "W"],
    ["Retroceder", "S"],
    ["Paso Lateral Izq.", "Q"],
    ["Paso Lateral Der.", "E"],
    ["Girar izq", "A"],
    ["Girar der", "D"],
    ["Recargar", "R"],
    ["Saltar", "Space"],
    ["Agacharse", "SHIFT (mantener)"],
    ["Correr", "V (mantener)"],
    ["Disparar", "Click Izq."],
    ["Mirar", "Mouse"],
    ["Menú", "TAB"],
    ["Expandir/Contraer Radar", "M"],
    ["FullScreen / NavScreen", "F"],
  ];
  const mid = Math.ceil(pairs.length / 2);
  const colA = pairs.slice(0, mid);
  const colB = pairs.slice(mid);

  return (
    <div id="controls-panel" className="panel-glass mt-4 sm:mt-5 p-2.5 sm:p-3 text-white/90">
      <h3 className="font-semibold mb-2.5 text-[13px] sm:text-sm">Controles</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {[colA, colB].map((col, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[12px] sm:text-sm min-w-0">
            {col.map(([k, v]) => (
              <React.Fragment key={k}>
                <span className="truncate">{k}</span>
                <span>{v}</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost h-9 px-3 text-[13px]">
          Cerrar
        </button>
      </div>
    </div>
  );
}
/* Render flotante del panel de controles cuando el querystring activa la vista */
// (Se añade al final para quedar por encima de la UI)
// Nota: se usa ControlsPopover + ControlsPanel como contenido.
export function ControlsFloating({
  open,
  btnRef,
  popRef,
  onClose,
}: {
  open: boolean;
  btnRef: any;
  popRef: any;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <ControlsPopover anchorRef={btnRef} popRef={popRef}>
      <ControlsPanel onClose={onClose} />
    </ControlsPopover>
  );
}

function AudioPanel({ onClose }: { onClose: () => void }) {
  const DEFAULTS = { music: 0.4, sfx: 0.6 };
  const [music, setMusic] = useState(DEFAULTS.music);
  const [sfx, setSfx] = useState(DEFAULTS.sfx);

  const beepRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio(ASSETS.audio?.buttonSound || "");
    a.preload = "auto";
    beepRef.current = a;
    return () => {
      try {
        a.pause();
      } catch { }
      beepRef.current = null;
    };
  }, []);

  const previewSfx = (vol: number) => {
    setSfx(vol);
    const a = beepRef.current;
    if (!a) return;
    try {
      a.volume = Math.max(0, Math.min(1, vol));
      a.currentTime = 0;
      a.play();
    } catch { }
  };

  return (
    <div id="audio-panel" className="panel-glass mt-4 sm:mt-5 p-2.5 sm:p-3 text-white overflow-visible">
      <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
        <Section title="Música + Lluvia">
          <Row label={`Volumen (${Math.round(music * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={music}
              onChange={(e) => setMusic(parseFloat(e.target.value))}
              onInput={(e) => setMusic(parseFloat((e.target as HTMLInputElement).value))}
              className="w-full sm:w-44 accent-cyan-300"
            />
          </Row>
        </Section>
        <Section title="Sonido (SFX)">
          <Row label={`Volumen (${Math.round(sfx * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sfx}
              onChange={(e) => previewSfx(parseFloat(e.target.value))}
              onInput={(e) => previewSfx(parseFloat((e.target as HTMLInputElement).value))}
              className="w-full sm:w-44 accent-cyan-300"
            />
          </Row>
        </Section>

        <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
          <button
            onClick={() => {
              setMusic(DEFAULTS.music);
              previewSfx(DEFAULTS.sfx);
            }}
            className="btn-ghost h-9 text-[13px] px-3"
          >
            Restablecer
          </button>
          <button onClick={onClose} className="btn-metal h-9 text-[13px] px-3">
            Cerrar
          </button>
        </div>
      </div>
      <audio ref={beepRef} src={ASSETS.audio?.buttonSound || ""} preload="auto" style={{ display: "none" }} />
    </div>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="rounded-2xl border border-white/10 p-2.5 sm:p-3 bg-white/5 h-full">
      <div className="text-white/80 font-semibold mb-2 text-[12px] sm:text-[13px]">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Row({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <div className="grid items-center grid-cols-1 sm:grid-cols-[1fr_auto] gap-1.5 sm:gap-2.5 min-w-0">
      <div className="text-[12px] sm:text-[13px] text-white/85">{label}</div>
      <div className="justify-self-stretch sm:justify-self-end">{children}</div>
    </div>
  );
}
