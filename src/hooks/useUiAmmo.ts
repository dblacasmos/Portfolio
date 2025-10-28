/* =====================================
   FILE: src/hooks/useUiAmmo.ts
   ===================================== */

// Hook de munición con recarga realista, auto-reload opcional y progreso.
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

export function useAmmo({
    magSize,
    reserveCap,
    reloadMs,
    autoReloadOnEmpty = true,
}: Opts) {
    // === STATE ===
    const [mag, setMag] = useState<number>(() => Math.max(0, magSize | 0));
    const [reserve, setReserve] = useState<number>(() => Math.max(0, reserveCap | 0));
    const [reloading, setReloading] = useState<boolean>(false);
    const [reloadT, setReloadT] = useState<number>(0);

    // === REFS (para leer el valor actual dentro de callbacks/RAF) ===
    const magRef = useRef(mag);
    const reserveRef = useRef(reserve);
    const reloadingRef = useRef(reloading);

    useEffect(() => { magRef.current = mag; }, [mag]);
    useEffect(() => { reserveRef.current = reserve; }, [reserve]);
    useEffect(() => { reloadingRef.current = reloading; }, [reloading]);

    // Ajuste si cambian caps desde fuera
    useEffect(() => {
        setMag((m) => Math.min(Math.max(0, m), Math.max(0, magSize | 0)));
    }, [magSize]);
    useEffect(() => {
        setReserve((r) => Math.min(Math.max(0, r), Math.max(0, reserveCap | 0)));
    }, [reserveCap]);

    // === TIMERS (raf + timeout) ===
    const rafId = useRef<number | null>(null);
    const doneTimeout = useRef<number | null>(null);
    const reloadStartedAt = useRef<number>(0);

    const clearTimers = () => {
        if (rafId.current != null) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
        if (doneTimeout.current != null) {
            clearTimeout(doneTimeout.current);
            doneTimeout.current = null;
        }
    };

    const cancelReload = useCallback(() => {
        if (!reloadingRef.current) return;
        clearTimers();
        setReloading(false);
        setReloadT(0);
    }, []);

    // === API ===
    const canFire = useCallback(() => {
        // Bloquea si recargando o sin balas en cargador
        return !reloadingRef.current && magRef.current > 0;
    }, []);

    /**
     * Dispara n balas (por defecto 1). Devuelve true si al menos 1 bala se disparó.
     */
    const shoot = useCallback((n: number = 1): boolean => {
        if (!canFire()) return false;
        let fired = 0;
        setMag((m) => {
            fired = Math.min(Math.max(1, n | 0), m);
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

        const need = Math.max(0, (magSize | 0) - magRef.current);
        if (need <= 0) return false;

        const canTake = Math.max(0, Math.min(need, reserveRef.current));
        if (canTake <= 0) return false;

        // Estado inicial
        setReloading(true);
        setReloadT(0);
        reloadStartedAt.current = performance.now();

        // Progreso con RAF (suave)
        const dur = Math.max(0, reloadMs | 0);
        const tick = () => {
            const t = Math.min(1, (performance.now() - reloadStartedAt.current) / (dur || 1));
            setReloadT(t);
            if (t < 1 && reloadingRef.current) {
                rafId.current = requestAnimationFrame(tick);
            }
        };
        rafId.current = requestAnimationFrame(tick);

        // Finalizar y transferir balas
        doneTimeout.current = window.setTimeout(() => {
            clearTimers();
            const needNow = Math.max(0, (magSize | 0) - magRef.current);
            const takeNow = Math.max(0, Math.min(needNow, reserveRef.current));
            if (takeNow > 0) {
                setMag((m) => Math.min(magSize | 0, m + takeNow));
                setReserve((r) => Math.max(0, r - takeNow));
            }
            setReloading(false);
            setReloadT(1);
        }, dur);

        return true;
    }, [magSize, reloadMs]);

    // Auto-reload al llegar a 0 si hay balas en reserva
    useEffect(() => {
        if (!autoReloadOnEmpty) return;
        if (!reloading && mag <= 0 && reserve > 0) reload();
    }, [mag, reserve, reloading, autoReloadOnEmpty, reload]);

    // Limpieza al desmontar
    useEffect(() => () => {
        clearTimers();
    }, []);

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

        // setters por si quieres modificar desde pickups, cheats, etc.
        setMag,
        setReserve,
    };
}

export default useAmmo;
