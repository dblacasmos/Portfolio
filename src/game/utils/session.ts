/* =============================
    FILE: src/game/utils/session.ts
    ============================= */

export const session = {
    hasActive(): boolean {
        try { return localStorage.getItem("gameSession") === "1"; }
        catch { return false; }
    },
    setActive(v: boolean): void {
        try {
            if (v) localStorage.setItem("gameSession", "1");
            else localStorage.removeItem("gameSession");
        } catch { }
    },
    clear(): void {
        try { localStorage.removeItem("gameSession"); } catch { }
    },
};