export function getOverlayRoot(): HTMLElement {
    const fromRef = (window as any).__fsRoot?.current as HTMLElement | null;
    const byId = document.getElementById("fs-root") as HTMLElement | null;
    return fromRef ?? byId ?? document.body; // fallback seguro
}
