/*  =============================
    FILE: src/main.tsx
    ============================= */
import "./game/utils/three/patchBVH"; // side-effect opcional: parches BVH
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css"; // ⬅️ Asegura importar el CSS con el cursor
import * as THREE from "three";
import { initKTX2Loader } from "./game/utils/three/ktx2/ktx2";
import { CFG } from "./constants/config";

const container = document.getElementById("root");
if (!container) {
    throw new Error("#root no encontrado en index.html");
}

// --------- Bootstrap KTX2 ANTES de cualquier preload/carga ----------
try {
    // Crea un renderer offscreen súper barato
    const tmpCanvas = document.createElement("canvas");
    const tmpGL = new THREE.WebGLRenderer({
        canvas: tmpCanvas,
        powerPreference: "high-performance",
        antialias: false,
        alpha: false,
        stencil: false,
        preserveDrawingBuffer: false,
    });
    const BASE = import.meta.env?.BASE_URL ?? "/";
    const basisPath =
        (CFG as any)?.decoders?.basisPath ?? (BASE + "basis/");
    // Idempotente: si luego lo vuelves a llamar en <Canvas> no pasa nada
    initKTX2Loader(tmpGL, basisPath);
    tmpGL.dispose();
} catch { }

const Root = import.meta.env.PROD ? (
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
) : (
    <BrowserRouter>
        <App />
    </BrowserRouter>
);

// Evita montar dos veces en dev/HMR si algún módulo vuelve a ejecutar este archivo.
if (!(container as HTMLElement).dataset.mounted) {
    (container as HTMLElement).dataset.mounted = "true";
    createRoot(container).render(Root);
}
