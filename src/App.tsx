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

/**
 * Cursor global por ruta:
 * - /game ⇒ hide-cursor (oculta cursor del SO, el juego muestra el suyo)
 * - resto ⇒ show-cursor + hud-cursor
 * Nota: no interfiere con toggles internos del propio juego.
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
  }, [pathname]);
}

export default function App() {
  useRouteCursorPolicy();

  // Sin overlay global de Suspense: rutas ligeras → mejor UX
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/main" element={<Main />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/game" element={<Game />} />
        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>
    </Suspense>
  );
}
