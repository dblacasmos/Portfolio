/* =================================
   FILE: src/game/utils/safeStage.ts
   ================================= */
// Crea un contenedor de stage con altura estable entre navegadores y
// fuerza recalculado en resize/fullscreenchange.
export function applyStableViewport() {
    const setVars = () => {
        // Fallback a innerHeight para iOS Safari y teclados virtuales
        const ih = window.innerHeight;
        document.documentElement.style.setProperty('--app-ih', `${ih}px`);
    };
    setVars();
    window.addEventListener('resize', setVars, { passive: true });
    document.addEventListener('fullscreenchange', setVars);
    // Safari iOS
    // @ts-ignore
    document.addEventListener('webkitfullscreenchange', setVars as any);
}

export const safeStageStyle = {
    position: 'fixed' as const,
    inset: 0,
    // Prioriza dvh/svh si están disponibles; fallback a innerHeight var
    height: '100dvh',
};
