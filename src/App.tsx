/* =============================
  FILE: src/App.tsx
  ============================= */
import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

const withDefault = <T extends Record<string, any>>(imp: Promise<T>, key = "default") =>
  imp.then((m: any) => ({ default: m[key] ?? m }));

const Main = lazy(() => withDefault(import("./pages/main/Main")));
const Timeline = lazy(() => withDefault(import("./pages/main/Timeline")));
const Intro = lazy(() => withDefault(import("./pages/Intro")));
const Game = lazy(() => withDefault(import("./game/Game")));

/** Pequeño indicador local de carga SOLO para el chunk de /game.
 *  Importante: así evitamos un overlay global que afecte a /timeline.
 */
function GameFallback() {
  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        fontSize: "1rem",
      }}
    >
      Cargando juego…
    </div>
  );
}

/**
 * Aplica clases de cursor a <body> según la ruta:
 * - /game => hide-cursor (OS cursor oculto; Crosshair visible)
 * - resto => show-cursor + hud-cursor (cursor robot en toda la UI)
 */
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
    return () => {
      // cleanup defensivo
      document.body.classList.remove("hide-cursor");
      document.body.classList.remove("show-cursor", "hud-cursor");
    };
  }, [pathname]);
}

export default function App() {
  useRouteCursorPolicy();

  // Sin overlay global al cargar rutas (importante para /timeline).
  // Añadimos un fallback específico SOLO para la ruta /game.
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/main" element={<Main />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route
          path="/game"
          element={
            <Suspense fallback={<GameFallback />}>
              <Game />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>
    </Suspense>
  );
}
