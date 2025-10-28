/* =============================
  FILE: src/pages/Intro.tsx
  ============================= */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ASSETS } from '../constants/assets';
import { enterAppFullscreen, isFullscreen } from '../game/utils/immersive';

/* Hook de sonido con POOL (polifónico) */
function useSound(url: string, volume = 1, voices = 4) {
  const poolRef = useRef<HTMLAudioElement[]>([]);
  useEffect(() => {
    const pool = Array.from({ length: voices }, () => {
      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = volume;
      return a;
    });
    poolRef.current = pool;
    return () => pool.forEach(a => { try { a.pause(); } catch { } });
  }, [url, volume, voices]);

  return () => {
    const pool = poolRef.current;
    const idle = pool.find(a => a.paused) ?? (pool[0]?.cloneNode(true) as HTMLAudioElement | undefined);
    if (!idle) return;
    try { idle.currentTime = 0; idle.play(); } catch { }
  };
}

export default function Intro() {
  const navigate = useNavigate();

  const [showExplore, setShowExplore] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [startVideo, setStartVideo] = useState(false);
  const [showCrawl, setShowCrawl] = useState(false);

  const playStartClick = useSound(ASSETS.audio.openPortfolio, 1);
  const playUiClick = useSound(ASSETS.audio.buttonSound, 1);

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<() => void>(() => { });

  const MUSIC_BASE_VOL = 0.4;                // Volumen normal de la música
  const MUSIC_DUCK_VOL = MUSIC_BASE_VOL / 2; // Volumen durante TTS (mitad)
  const CRAWL_DURATION_S = 48;               // 30s música → aparece el botón
  const DELAY = 500;

  // ESC: cortar presentación (video + música + TTS) y seguir flujo → /main
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); e.stopPropagation();

      // Detener media/tts (mismo tratamiento que handleExploreClick)
      try { mainVideoRef.current?.pause(); } catch {}
      try { musicRef.current?.pause(); } catch {}
      try { ttsAbortRef.current?.(); } catch {}

      // Mantener fullscreen y navegar al Main con el mismo DELAY
      try { if (!isFullscreen()) enterAppFullscreen(); } catch {}
      setTimeout(() => navigate('/main'), DELAY);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [navigate]);

  // --- LORE (texto y TTS) ---
  const loreTitle = 'Capítulo 1: "El Portfolio"';
  const loreLines = [
    'Soy un soldado del planeta Madrid, en formación actualmente.',
    'Especialista en seguridad física y operativa, exmilitar y tecnófilo.',
    'Tras años de disciplina, ahora despliego ese rigor en mundos digitales.',
    'Mi misión: proteger, crear y evolucionar a través del código.',
    'Bienvenido a mi historia.'
  ];
  const loreTextForTTS = `${loreTitle}. ${loreLines.join(' ')}`;

  // --- Limpieza al desmontar ---
  useEffect(() => {
    return () => {
      // Detener vídeo/audio
      try { mainVideoRef.current?.pause(); } catch { }
      try { musicRef.current?.pause(); } catch { }
      // Parar TTS
      try { ttsAbortRef.current?.(); } catch { }
    };
  }, []);

  // Mostrar el botón al ritmo de la música (constante) aunque el crawl sea más largo.
  // Si quieres +2s tras la música, cambia 30000 por 32000.
  useEffect(() => {
    if (!showCrawl) return;
    const t = setTimeout(() => {
      setShowExplore(true);
    }, 30000);
    return () => clearTimeout(t);
  }, [showCrawl]);

  const startMusic = () => {
    try {
      if (!ASSETS.audio.introMusic) return;
      const a = new Audio(ASSETS.audio.introMusic);
      a.preload = 'auto';
      a.loop = false; // Se reproduce una sola vez
      a.volume = MUSIC_BASE_VOL;
      musicRef.current = a;
      a.play().catch(() => { });
    } catch { }
  };

  const speakLore = () => {
    // Web Speech API TTS en español (voz masculina si existe)
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(loreTextForTTS);
      utter.lang = 'es-ES';
      utter.rate = 0.90;
      utter.pitch = 0.95;

      // Ducking de música mientras habla el TTS
      utter.onstart = () => {
        const m = musicRef.current;
        if (m) m.volume = MUSIC_DUCK_VOL;
      };
      utter.onend = () => {
        const m = musicRef.current;
        if (m) m.volume = MUSIC_BASE_VOL;
      };

      // Intentar elegir voz masculina española si está disponible
      const pickVoice = () => {
        const voices = synth.getVoices();
        let best = voices.find(v => /es-ES/i.test(v.lang) && /male|hombre|Miguel|Jorge|Diego|Enrique/i.test(v.name))
          || voices.find(v => /es-ES/i.test(v.lang))
          || voices.find(v => /es/i.test(v.lang));
        if (best) utter.voice = best;
        synth.cancel();
        synth.speak(utter);
      };

      // Algunos navegadores cargan las voces asíncronamente
      if (synth.getVoices().length === 0) {
        const onVoices = () => { pickVoice(); synth.removeEventListener('voiceschanged', onVoices); };
        synth.addEventListener('voiceschanged', onVoices);
      } else {
        pickVoice();
      }

      ttsAbortRef.current = () => { try { synth.cancel(); } catch { } };
      return;
    }
    // Fallback: no TTS disponible
  };

  const handleStart = () => {
    try { playStartClick(); } catch { }
    // ⇢ Entra a pantalla completa ANTES de iniciar vídeo/tts, y sobrevive a cambios de ruta
    try { enterAppFullscreen(); } catch { }
    setTimeout(() => {
      setShowIntroVideo(true);
      setStartVideo(true);
      setShowCrawl(true);      // Mostrar el crawl desde el inicio
      startMusic();            // Música y TTS empiezan simultáneamente con el vídeo
      speakLore();
      setTimeout(() => {
        const v = mainVideoRef.current;
        if (v) {
          try {
            v.muted = false;
            v.volume = 1;
            v.currentTime = 0;
            v.loop = true; // El vídeo principal se reproduce en bucle
            v.play().catch((err) => console.warn('introNave.mp4 play error:', err));
          } catch { }
        }
      }, 0);
    }, DELAY);
  };

  const handleExploreClick = () => {
    try { playUiClick(); } catch { }
    // Asegura permanecer en FS en el mismo gesto que navega
    try { if (!isFullscreen()) enterAppFullscreen(); } catch { }
    // Parar media/tts antes de salir
    try { mainVideoRef.current?.pause(); } catch { }
    try { musicRef.current?.pause(); } catch { }
    try { ttsAbortRef.current?.(); } catch { }
    setTimeout(() => navigate('/main'), DELAY);
  };

  return (
    <div id="intro" data-immersive-root className="fixed inset-0 overflow-hidden bg-black">
      {/* Vídeo de fondo mientras no empieza el principal */}
      {!showIntroVideo && (
        <video
          data-intro
          className="absolute inset-0 w-full h-dvh object-cover z-0 pointer-events-none"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src={ASSETS.video.bgIntro}
          onError={(e) => console.error('bgIntro.mp4 error', e)}
        />
      )}

      {/* Botón INICIAR */}
      {!showIntroVideo && (
        <div className="absolute inset-0 z-20 grid place-items-center p-4">
          <motion.button
            id="start-btn"
            onClick={handleStart}
            className="px-6 py-3 text-[clamp(0.95rem,1.2vw+0.4rem,1.125rem)] rounded-xl border border-cyan-300/50
                       bg-cyan-600/90 hover:bg-cyan-500/95 text-white shadow-[0_0_24px_rgba(34,211,238,0.45)]
                       focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            ▶️ Iniciar presentación
          </motion.button>
        </div>
      )}

      {/* Vídeo principal (introNave.mp4) */}
      {showIntroVideo && startVideo && (
        <video
          id="intro-video"
          data-intro
          ref={mainVideoRef}
          className="absolute inset-0 w-full h-dvh object-cover z-0"
          playsInline
          autoPlay
          preload="auto"
          loop // bucle hasta clicar “Explora mi historia”
          onError={(e) => console.error('introNave.mp4 error', e)}
        >
          <source src={ASSETS.video.presentacion} type="video/mp4" />
        </video>
      )}

      {/* STAR WARS CRAWL */}
      <AnimatePresence>
        {showCrawl && (
          <motion.div
            key="crawl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-20 overflow-hidden"
            aria-label="Introducción estilo Star Wars"
          >
            {/* Fondo sutil para contraste */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80 pointer-events-none" />

            {/* Contenedor con perspectiva - centrado */}
            <div className="relative w-full h-full grid place-items-center">
              <div
                id="crawl-perspective"
                className="w-full max-w-[1100px] px-6 md:px-10 [perspective:650px]"
              >
                <motion.div
                  id="crawl-content"
                  className="mx-auto origin-bottom text-center text-cyan-100 tracking-normal transform-gpu opacity-100 subpixel-antialiased [will-change:transform,opacity] [text-shadow:0_0_2px_rgba(34,211,238,1),0_0_10px_rgba(34,211,238,0.6),0_0_18px_rgba(34,211,238,0.35)]"
                  style={{
                    // Mantiene el CENTER + efecto Star Wars con tilt (rotateX/perspective custom)
                    fontFamily: "'Orbitron', system-ui, sans-serif",
                    // Núcleo sólido + halo suave (menos “lavado”/transparente)
                    textShadow: '0 0 2px rgba(34,211,238,1), 0 0 10px rgba(34,211,238,0.6), 0 0 18px rgba(34,211,238,0.35)',
                    // quitar blur extra que lavaba el color:
                    filter: 'none',
                  }}
                  initial={{ rotateX: 14, y: '80vh', scale: 1, opacity: 0 }}
                  animate={{ rotateX: 14, y: '-200vh', scale: 0.9, opacity: 1 }}
                  transition={{
                    duration: CRAWL_DURATION_S, // mucho más lento
                    ease: 'linear',             // velocidad CONSTANTE, sin tirones
                  }}
                >
                  <h3
                    className="mb-8 font-extrabold uppercase text-cyan-200"
                    style={{
                      fontSize: 'clamp(2rem, 2.2vw + 1.6rem, 3.25rem)',
                      // núcleo muy definido + halo moderado
                      textShadow: '0 0 2px rgba(34,211,238,1), 0 0 12px rgba(34,211,238,0.65), 0 0 22px rgba(34,211,238,0.45)',
                      filter: 'none',
                    }}
                  >
                    {loreTitle}
                  </h3>
                  {loreLines.map((line, i) => (
                    <p
                      key={i}
                      className={`leading-[1.65] text-cyan-100 ${i < loreLines.length - 1 ? 'mb-5' : ''}`}
                      style={{
                        fontSize: 'clamp(1.15rem, 1.2vw + 0.9rem, 1.7rem)',
                        // menos blur → más color aparente
                        textShadow: '0 0 1px rgba(34,211,238,1), 0 0 8px rgba(34,211,238,0.55)',
                        filter: 'none',
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Botón “Explora mi historia” al terminar el crawl (≈ 32s) */}
            <AnimatePresence>
              {showExplore && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 grid place-items-center px-4"  // centrar en pantalla
                >
                  <motion.button
                    onClick={handleExploreClick}
                    className="btn-metal px-6 py-3 text-[clamp(0.95rem,1.2vw+.4rem,1.125rem)]
                               rounded-xl border border-cyan-300/50 bg-cyan-600/90 hover:bg-cyan-500/95 text-white
                               shadow-[0_0_24px_rgba(34,211,238,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                  >
                    Explora mi historia
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animación hecha con framer-motion + utilidades Tailwind, sin CSS extra */}
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
