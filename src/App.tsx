/* =============================
  FILE: src/App.tsx
  ============================= */
import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";

import { ScaleToFit } from "./game/graphics/ScaleToFit";
import { MobileControls } from "./game/layers/Hud/uiMobile/MobileControls";

const withDefault = <T extends Record<string, any>>(imp: Promise<T>, key = "default") =>
  imp.then((m: any) => ({ default: m[key] ?? m }));

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

/** Layout que escala el contenido del juego + HUD móvil */
function ScaledLayout() {
  return (
    <ScaleToFit designWidth={1280} designHeight={720} mode="contain">
      {/* Aquí dentro TODO queda en el “lienzo” escalado */}
      <Outlet />

      {/* HUD/UI dentro del lienzo escalado */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Monta aquí tus overlays/HUD de juego si quieres */}
        {/* <MenuInGame .../> */}
        {/* <MissionCard .../> */}

        {/* Controles móviles/tablet */}
        <MobileControls />
      </div>
    </ScaleToFit>
  );
}

export default function App() {
  useRouteCursorPolicy();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/main" element={<Main />} />
        <Route path="/timeline" element={<Timeline />} />

        {/* /game envuelto por ScaleToFit */}
        <Route path="/game" element={<ScaledLayout />}>
          <Route index element={<Game />} />
        </Route>

        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>
    </Suspense>
  );
}
