/* ============================
   FILE: src/hooks/useUiAmmo.ts
   ============================ */

/**
 * Hook de munición con recarga “tipo shooter”:
 * - Contador de cargador + reserva.
 * - Recarga con barra de progreso (0..1).
 * - Auto-recarga opcional al llegar a 0.
 * - Limpieza fiable de timers en desmontaje/cambios.
 *
 * Nota: mantengo la API original para no romper llamadas existentes.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Opts = {
    magSize: number;              // capacidad del cargador
    reserveCap: number;           // balas totales en reserva
    reloadMs: number;             // duración recarga (ms)
    autoReloadOnEmpty?: boolean;  // recarga automática al llegar a 0 si hay reserva
};

export type AmmoState = {
    mag: number;
    reserve: number;
    reloading: boolean;
    reloadT: number; // [0..1]
};

// Helpers pequeños (evitan |0 “mágicos” y repeticiones)
const clamp0 = (n: number) => Math.max(0, n | 0);
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function useAmmo({
    magSize,
    reserveCap,
    reloadMs,
    autoReloadOnEmpty = true,
}: Opts) {
    // ==== STATE ====
    const [mag, setMag] = useState<number>(() => clamp0(magSize));
    const [reserve, setReserve] = useState<number>(() => clamp0(reserveCap));
    const [reloading, setReloading] = useState<boolean>(false);
    const [reloadT, setReloadT] = useState<number>(0);

    // ==== REFS (lectura instantánea dentro de callbacks/RAF) ====
    const magRef = useRef(mag);
    const reserveRef = useRef(reserve);
    const reloadingRef = useRef(reloading);

    useEffect(() => { magRef.current = mag; }, [mag]);
    useEffect(() => { reserveRef.current = reserve; }, [reserve]);
    useEffect(() => { reloadingRef.current = reloading; }, [reloading]);

    // Ajustes si cambian los límites desde fuera.
    // - Si baja magSize y el cargador actual sobra, se “devuelve” el exceso a la reserva.
    useEffect(() => {
        setMag((mPrev) => {
            const maxMag = clamp0(magSize);
            const m = Math.max(0, Math.min(mPrev, maxMag));
            const overflow = Math.max(0, mPrev - maxMag);
            if (overflow > 0) setReserve((r) => r + overflow);
            return m;
        });
    }, [magSize]);

    useEffect(() => {
        setReserve((r) => Math.max(0, Math.min(r, clamp0(reserveCap))));
    }, [reserveCap]);

    // ==== TIMERS (raf + timeout) ====
    const rafId = useRef<number | null>(null);
    const doneTimeout = useRef<number | null>(null);
    const reloadStartedAt = useRef<number>(0);

    const clearTimers = useCallback(() => {
        if (rafId.current != null) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
        if (doneTimeout.current != null) {
            clearTimeout(doneTimeout.current);
            doneTimeout.current = null;
        }
    }, []);

    const cancelReload = useCallback(() => {
        if (!reloadingRef.current) return;
        clearTimers();
        setReloading(false);
        setReloadT(0);
    }, [clearTimers]);

    // ==== API ====
    const canFire = useCallback(() => {
        // Bloquea si recargando o sin balas en cargador
        return !reloadingRef.current && magRef.current > 0;
    }, []);

    /** Dispara n balas (por defecto 1). Devuelve true si al menos 1 bala se disparó.*/
    const shoot = useCallback((n: number = 1): boolean => {
        if (!canFire()) return false;
        let fired = 0;
        setMag((m) => {
            const want = Math.max(1, n | 0);
            fired = Math.min(want, m);
            return m - fired;
        });
        return fired > 0;
    }, [canFire]);

    /**
     * Ejecuta la recarga si procede (cargador no lleno y hay reserva).
     * Devuelve true si se inicia la recarga.
     */
    const reload = useCallback((): boolean => {
        if (reloadingRef.current) return false;

        const cap = clamp0(magSize);
        const need = Math.max(0, cap - magRef.current);
        if (need <= 0) return false;

        const canTake = Math.max(0, Math.min(need, reserveRef.current));
        if (canTake <= 0) return false;

        // Estado inicial
        setReloading(true);
        setReloadT(0);
        reloadStartedAt.current = now();

        const dur = Math.max(0, reloadMs | 0);

        // Progreso con RAF (suave). Si dur==0, hacemos recarga instantánea.
        if (dur === 0) {
            setMag((m) => {
                const needNow = Math.max(0, cap - m);
                const takeNow = Math.max(0, Math.min(needNow, reserveRef.current));
                if (takeNow > 0) setReserve((r) => Math.max(0, r - takeNow));
                return Math.min(cap, m + takeNow);
            });
            setReloading(false);
            setReloadT(1);
            return true;
        }

        const tick = () => {
            const t = Math.min(1, (now() - reloadStartedAt.current) / (dur || 1));
            setReloadT(t);
            if (t < 1 && reloadingRef.current) {
                rafId.current = requestAnimationFrame(tick);
            }
        };
        rafId.current = requestAnimationFrame(tick);

        // Finalizar y transferir balas
        const timeout = (typeof window !== "undefined" ? window.setTimeout : setTimeout) as typeof setTimeout;
        doneTimeout.current = timeout(() => {
            clearTimers();
            const needNow = Math.max(0, cap - magRef.current);
            const takeNow = Math.max(0, Math.min(needNow, reserveRef.current));
            if (takeNow > 0) {
                setMag((m) => Math.min(cap, m + takeNow));
                setReserve((r) => Math.max(0, r - takeNow));
            }
            setReloading(false);
            setReloadT(1);
        }, dur) as unknown as number;

        return true;
    }, [magSize, reloadMs, clearTimers]);

    // Auto-reload al llegar a 0 si hay balas en reserva
    useEffect(() => {
        if (!autoReloadOnEmpty) return;
        if (!reloading && mag <= 0 && reserve > 0) reload();
    }, [mag, reserve, reloading, autoReloadOnEmpty, reload]);

    // Limpieza al desmontar
    useEffect(() => () => { clearTimers(); }, [clearTimers]);

    return {
        mag,
        reserve,
        reloading,
        reloadT,

        // API
        canFire,
        shoot,
        reload,
        cancelReload,

        // setters expuestos (pickups, cheats, etc.)
        setMag,
        setReserve,
    };
}

export default useAmmo;
