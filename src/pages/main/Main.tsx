/* =============================
  FILE: src/pages/main/Main.tsx
  ============================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Hero from "./Hero";
import { ASSETS } from "../../constants/assets";
import { enterFullscreen } from "../../game/utils/immersive";
import { hardCleanupBeforeMain } from "../../game/utils/cleanupMain";
import { useRouteCleanup } from "@/hooks/useRouteCleanup";

/** Reproduce un <video> probando varias rutas hasta que alguna cargue */
function BgVideo({ sources }: { sources: string[] }) {
  const [idx, setIdx] = useState(0);
  const src = sources[idx];

  return (
    <video
      id="bgMain"
      className="absolute top-0 left-0 w-full h-full object-cover z-0"
      autoPlay
      loop
      muted
      playsInline
      onError={() => {
        // avanza al siguiente candidato si falla
        if (idx < sources.length - 1) setIdx((i) => i + 1);
        else console.error("bgMain: ninguna fuente válida", sources);
      }}
    >
      {/* probamos mp4 con el src actual */}
      <source key={src} src={src} type="video/mp4" />
      {/* fallback (algunos navegadores lo requieren) */}
      <source key={src + "#noType"} src={src} />
    </video>
  );
}

/* ============================
   Hook: música en bucle con fades
   ============================ */
function useLoopMusic(
  url?: string,
  {
    targetVolume = 0.35, // volumen objetivo (0..1)
    fadeInMs = 600,
    fadeOutMs = 400,
    hiddenVolume = 0.12, // volumen cuando la pestaña está oculta
  }: { targetVolume?: number; fadeInMs?: number; fadeOutMs?: number; hiddenVolume?: number } = {}
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupRef = useRef<() => void>(() => { });
  // ✅ permitir null aquí
  const resumeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!url) return;

    let disposed = false;
    const a = new Audio(url);
    a.loop = true;
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.volume = 0; // empezamos a 0 para hacer fade-in
    audioRef.current = a;

    const fadeTo = (toVol: number, ms: number) => {
      const start = performance.now();
      const from = a.volume;
      const dur = Math.max(1, ms | 0);
      const step = (t: number) => {
        if (disposed) return;
        const p = Math.min(1, (t - start) / dur);
        a.volume = Math.max(0, Math.min(1, from + (toVol - from) * p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const removeResumeListener = () => {
      const resume = resumeHandlerRef.current;
      if (resume) {
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
        resumeHandlerRef.current = null; // ✅ null, no undefined
      }
    };

    const tryPlay = async () => {
      try {
        await a.play();
        fadeTo(targetVolume, fadeInMs);
      } catch {
        // Autoplay bloqueado: reproducir en primer gesto del usuario
        const resume = async () => {
          try {
            await a.play();
            fadeTo(targetVolume, fadeInMs);
            removeResumeListener();
          } catch {
            // si sigue fallando, lo volveremos a intentar en otro gesto
          }
        };
        resumeHandlerRef.current = resume;
        window.addEventListener("pointerdown", resume, { once: true });
        window.addEventListener("keydown", resume, { once: true });
      }
    };

    const onVisibility = () => {
      if (document.hidden) fadeTo(hiddenVolume, 250);
      else fadeTo(targetVolume, 250);
    };
    document.addEventListener("visibilitychange", onVisibility);

    tryPlay();

    // cleanup
    cleanupRef.current = () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      removeResumeListener();

      const stop = () => {
        try { a.pause(); } catch { }
        try { (a as any).src = ""; a.load(); } catch { }
      };

      if (!a.paused && a.volume > 0) {
        const start = performance.now();
        const from = a.volume;
        const dur = Math.max(1, fadeOutMs | 0);
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          a.volume = Math.max(0, Math.min(1, from * (1 - p)));
          if (p < 1) requestAnimationFrame(step);
          else stop();
        };
        requestAnimationFrame(step);
      } else {
        stop();
      }

      audioRef.current = null;
    };

    return () => {
      cleanupRef.current();
    };
  }, [url, targetVolume, fadeInMs, fadeOutMs, hiddenVolume]);

  // Setter de volumen en caliente (opcional)
  const setVolume = (v: number, fadeMs = 200) => {
    const a = audioRef.current;
    if (!a) return;
    const start = performance.now();
    const from = a.volume;
    const to = Math.max(0, Math.min(1, v));
    const dur = Math.max(1, fadeMs | 0);
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      a.volume = from + (to - from) * p;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const stop = () => {
    try { cleanupRef.current(); } catch { }
  };

  return { setVolume, stop };
}

export default function Main() {
  // Limpieza dura al entrar en Main:
  // - conserva el <video id="bgMain">
  // - conserva TODO lo dentro de #hero-root (incl. posibles <canvas>/<video> futuros)
  useRouteCleanup("hard", {
    keepIds: ["bgMain", "hero-root"],
    keepPredicate: (el) => {
      try { return !!(el as Element).closest?.("#hero-root"); } catch { return false; }
    },
  });

  // Prefetch de Timeline
  useEffect(() => { import("./Timeline").catch(() => { }); }, []);

  // Si no estamos aún en FS (caso acceso directo), inténtalo de forma amable.
  useEffect(() => {
    if (!document.fullscreenElement) {
      const host = document.getElementById("main-fs-root") ?? document.documentElement;
      enterFullscreen(host as HTMLElement).catch?.(() => { });
    }
  }, []);

  // Lista de rutas candidatas (la 1ª es la tuya “correcta”)
  const bgCandidates = useMemo(
    () => [
      ASSETS.video.bgMain,              // /assets/video/bgMain.mp4  (tu ruta)
      "/assets/media/video/bgMain.mp4", // fallback alterno
    ],
    []
  );

  // Música de fondo en Main
  useLoopMusic(ASSETS.audio?.mainDrums, {
    targetVolume: 0.35, // ajusta a gusto
    fadeInMs: 600,
    fadeOutMs: 400,
    hiddenVolume: 0.12,
  });

  // Limpia el vídeo al desmontar (libera RAM/VRAM del decoder)
  useEffect(() => {
    return () => {
      const v = document.getElementById("bgMain") as HTMLVideoElement | null;
      if (v) {
        try { v.pause(); } catch { }
        try { v.removeAttribute("src"); v.load(); } catch { }
      }
    };
  }, []);

  return (
    <div id="main-fs-root" data-immersive-root className="relative w-full min-h-[100dvh] overflow-hidden">
      <BgVideo sources={bgCandidates} />
      <div className="absolute top-0 left-0 w-full h-full z-10" />
      <motion.main
        className="relative z-10 w-full h-full flex flex-col items-center justify-start text-cyan-400 text-center p-4 pt-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.h1
          className="text-2xl md:text-4xl font-bold drop-shadow-lg mb-8"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          HOJA DE PERSONAJE
        </motion.h1>
        <div className="w-full flex justify-center items-center" id="hero-root">
          <Hero />
        </div>
      </motion.main>
    </div>
  );
}
