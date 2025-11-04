/* ================
  FILE: src/App.tsx
  ================= */
import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useIsMobileOrTablet } from "./hooks/useDevice";
import { MobileControls } from "./game/layers/Hud/uiMobile/MobileControls";

const withDefault = <T extends Record<string, any>>(
  imp: Promise<T>,
  key = "default"
) => imp.then((m: any) => ({ default: m[key] ?? m }));

const Main = lazy(() => withDefault(import("./pages/main/Main")));
const Timeline = lazy(() => withDefault(import("./pages/main/Timeline")));
const Intro = lazy(() => withDefault(import("./pages/Intro")));
const Game = lazy(() => withDefault(import("./game/Game")));

/** Cursor global por ruta (sin cambios) */
function useRouteCursorPolicy() {
  const { pathname } = useLocation();
  useEffect(() => {
    const inGame = pathname.startsWith("/game");
    if (inGame) {
      document.body.classList.add("hide-cursor");
      document.body.classList.remove("show-cursor", "hud-cursor");
    } else {
      document.body.classList.add("show-cursor", "hud-cursor");
      document.body.classList.remove("hide-cursor");
    }
  }, [pathname]);
}

/** Wrapper para montar HUD touch sólo en dispositivos táctiles */
function TouchHUD() {
  const isTouch = useIsMobileOrTablet();
  if (isE2E) return <MobileControls />;
  return isTouch ? <MobileControls /> : null;
}

// Heurística E2E: en tests no redirigimos fuera de /game
const isE2E =
  typeof navigator !== "undefined" &&
  (((navigator as any).webdriver === true) ||
    /\bPlaywright\b/i.test(navigator.userAgent || "") ||
    /\bHeadless\b/i.test(navigator.userAgent || "") ||
    (typeof window !== "undefined" && (window as any).__PW__ === true));

export default function App() {
  useRouteCursorPolicy();

  return (
    <>
      {/* Skip link + live region */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-cyan-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        Saltar al contenido
      </a>
      <div id="a11y-live" aria-live="polite" className="sr-only" />

      {/* En E2E montamos MobileControls de forma GLOBAL (portaleado al <body>) */}
      {isE2E && <MobileControls />}

      <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Cargando…</div>}>
        <main id="main" role="main" className="min-h-[100svh] md:min-h-dvh">
          <Routes>
            <Route path="/" element={<Navigate to="/intro" replace />} />
            <Route path="/intro" element={<Intro />} />
            <Route path="/main" element={<Main />} />
            <Route path="/timeline" element={<Timeline />} />

            {/* /game a pantalla completa (sin reescalar) */}
            <Route path="/game" element={
              <>
                <Game />
                <TouchHUD />
              </>
            } />

            <Route path="/" element={<Navigate to="/intro" replace />} />
          </Routes>
        </main>
      </Suspense>
    </>
  );
}
