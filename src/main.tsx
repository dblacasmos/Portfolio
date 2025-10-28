/*  =============================
    FILE: src/main.tsx
    ============================= */
import "./game/utils/three/patchBVH"; // side-effect opcional: parches BVH
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css"; // Asegura importar el CSS con el cursor

const container = document.getElementById("root");
if (!container) {
    throw new Error("#root no encontrado en index.html");
}

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
