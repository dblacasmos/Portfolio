// src/game/utils/overlayPortal.ts
let holder: HTMLElement | null = null;

function resolveHost(): HTMLElement {
    const fromRef = (window as any).__fsRoot?.current as HTMLElement | null;
    const byId = document.getElementById("fs-root") as HTMLElement | null;
    const fsEl = (document.fullscreenElement as HTMLElement | null) || null;
    const immersive = document.querySelector<HTMLElement>("[data-immersive-root]");
    return fromRef ?? byId ?? fsEl ?? immersive ?? document.body;
}

function ensureHolderOn(host: HTMLElement) {
    if (!holder) {
        holder = document.createElement("div");
        holder.style.position = "absolute";
        holder.style.inset = "0";
        holder.style.zIndex = "2147483647";
        holder.style.pointerEvents = "none"; // cada overlay activará lo que necesite
        holder.setAttribute("data-overlay-root", "true");
        host.appendChild(holder);
        return;
    }
    if (holder.parentElement !== host) {
        try { holder.parentElement?.removeChild(holder); } catch { }
        host.appendChild(holder);
    }
}

export function getOverlayRoot(): HTMLElement {
    const host = resolveHost();
    ensureHolderOn(host);
    return holder!;
}

// Recolocar automáticamente si cambia el host
(function mountRelocator() {
    const onFS = () => ensureHolderOn(resolveHost());
    document.addEventListener("fullscreenchange", onFS);
    window.addEventListener("resize", onFS);
})();
