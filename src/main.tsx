/*  ==================
    FILE: src/main.tsx
    ================== */
import "./game/utils/collision/patchBVH";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import * as THREE from "three";
import { initKTX2Loader } from "./game/utils/textures/ktx2";
import { CFG } from "./constants/config";
import "./styles/viewport.css";
import { applyStableViewport } from "./game/utils/safeStage";

// Fallback seguro: sólo usa BASE_URL si coincide con la URL actual (evita mismatch en preview)
const RAW_BASE = (import.meta as any)?.env?.BASE_URL || "/";
const SAFE_BASE =
    typeof window !== "undefined" && !window.location.pathname.startsWith(RAW_BASE)
        ? "/"
        : RAW_BASE;

const container = document.getElementById("root");
if (!container) throw new Error("#root no encontrado en index.html");

// Altura estable entre navegadores / fullscreen changes (iOS/Android/Desktop)
try {
    applyStableViewport();
} catch { }


// --- Bootstrap de KTX2 (antes de cualquier preload/carga) ---
try {
    const tmpCanvas = document.createElement("canvas");
    const tmpGL = new THREE.WebGLRenderer({
        canvas: tmpCanvas,
        powerPreference: "high-performance",
        antialias: false,
        alpha: false,
        stencil: false,
        preserveDrawingBuffer: false,
    });

    // Usa SAFE_BASE (antes era BASENAME → error TS + path incorrecto en preview)
    const basisPath = (CFG as any)?.decoders?.basisPath ?? SAFE_BASE + "basis/";
    initKTX2Loader(tmpGL, basisPath);
    tmpGL.dispose();
} catch {
    // Si falla (dispositivo muy viejo), seguimos con PNG/WebP
}

// StrictMode sólo en prod para evitar dobles efectos en dev/hmr
const Root = import.meta.env.PROD ? (
    <React.StrictMode>
        <BrowserRouter basename={SAFE_BASE}>
            <App />
        </BrowserRouter>
    </React.StrictMode>
) : (
    <BrowserRouter basename={SAFE_BASE}>
        <App />
    </BrowserRouter>
);

// Evita montajes duplicados con HMR en algunos setups
if (!(container as HTMLElement).dataset.mounted) {
    (container as HTMLElement).dataset.mounted = "true";
    createRoot(container).render(Root);
}
