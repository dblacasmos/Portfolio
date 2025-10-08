/*  =============================
    FILE: src/main.tsx
    ============================= */
import "./game/utils/collision/patchBVH"; // Parchea BVH si está disponible (side-effect)
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css"; // Asegura el cursor y utilidades base
import * as THREE from "three";
import { initKTX2Loader } from "./game/utils/three/ktx2/ktx2";
import { CFG } from "./constants/config";

// Preferimos BASE_URL para despliegues no en raíz (gh-pages, subcarpetas, etc.)
const BASENAME = (import.meta as any)?.env?.BASE_URL || "/";

const container = document.getElementById("root");
if (!container) throw new Error("#root no encontrado en index.html");

// --- Bootstrap de KTX2 (antes de cualquier preload/carga) ---
try {
    // Renderer mínimo temporal (no toca el real del <Canvas>)
    const tmpCanvas = document.createElement("canvas");
    const tmpGL = new THREE.WebGLRenderer({
        canvas: tmpCanvas,
        powerPreference: "high-performance",
        antialias: false,
        alpha: false,
        stencil: false,
        preserveDrawingBuffer: false,
    });

    const basisPath = (CFG as any)?.decoders?.basisPath ?? BASENAME + "basis/";
    // Idempotente: si más tarde se re-llama desde el juego, no pasa nada
    initKTX2Loader(tmpGL, basisPath);
    tmpGL.dispose();
} catch {
    // Si falla (dispositivo muy viejo), seguimos con PNG/WebP
}

// StrictMode sólo en prod para evitar dobles efectos en dev/hmr
const Root = import.meta.env.PROD ? (
    <React.StrictMode>
        <BrowserRouter basename={BASENAME}>
            <App />
        </BrowserRouter>
    </React.StrictMode>
) : (
    <BrowserRouter basename={BASENAME}>
        <App />
    </BrowserRouter>
);

// Evita montajes duplicados con HMR en algunos setups
if (!(container as HTMLElement).dataset.mounted) {
    (container as HTMLElement).dataset.mounted = "true";
    createRoot(container).render(Root);
}
