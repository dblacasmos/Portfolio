// Un único lugar para decidir dónde montar overlays HTML
export function getOverlayRoot(): HTMLElement {
    // Preferimos el host que entra en fullscreen
    const fs = document.getElementById("fs-root") as HTMLElement | null;
    if (fs) return fs;

    const imm = document.getElementById("immersive-root") as HTMLElement | null;
    if (imm) return imm;

    // Fallback seguro
    return document.body;
}
