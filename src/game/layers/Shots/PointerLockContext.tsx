/* ===============================================
FILE: src/game/layers/Shots/PointerLockContext.tsx
================================================== */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Ctx = {
    overlaysOpen: number;
    pushOverlay: () => void;
    popOverlay: () => void;
    requestLock: () => void;
    releaseLock: () => void;
    isLocked: boolean;
    setLockTarget: (el: HTMLElement | null) => void;
};

const PointerLockCtx = createContext<Ctx | null>(null);

export const usePointerLock = () => {
    const ctx = useContext(PointerLockCtx);
    if (!ctx) throw new Error("usePointerLock must be inside <PointerLockProvider/>");
    return ctx;
};

export const PointerLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [overlaysOpen, setOverlaysOpen] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const lockTargetRef = useRef<HTMLElement | null>(null);
    const wantsLockRef = useRef(false);

    const setLockTarget = useCallback((el: HTMLElement | null) => {
        lockTargetRef.current = el;
    }, []);

    const requestLock = useCallback(() => {
        wantsLockRef.current = true;
        if (overlaysOpen > 0) return; // espera a que no haya overlays
        const el = lockTargetRef.current || document.body;
        if (document.pointerLockElement !== el) {
            el.requestPointerLock?.();
        }
    }, [overlaysOpen]);

    const releaseLock = useCallback(() => {
        wantsLockRef.current = false;
        if (document.pointerLockElement) {
            document.exitPointerLock?.();
        }
    }, []);

    const pushOverlay = useCallback(() => {
        setOverlaysOpen((n) => {
            if (n === 0 && document.pointerLockElement) {
                document.exitPointerLock();
            }
            return n + 1;
        });
    }, []);

    const popOverlay = useCallback(() => {
        setOverlaysOpen((n) => {
            const next = Math.max(0, n - 1);
            if (next === 0 && wantsLockRef.current) {
                // recuperar lock si el usuario lo quería
                requestLock();
            }
            return next;
        });
    }, [requestLock]);

    useEffect(() => {
        const onChange = () => {
            const locked = !!document.pointerLockElement;
            setIsLocked(locked);
            // si se perdió lock por razones externas y no hay overlays, y lo queremos, recupéralo
            if (!locked && overlaysOpen === 0 && wantsLockRef.current) {
                requestLock();
            }
        };
        document.addEventListener("pointerlockchange", onChange);
        document.addEventListener("pointerlockerror", onChange);
        return () => {
            document.removeEventListener("pointerlockchange", onChange);
            document.removeEventListener("pointerlockerror", onChange);
        };
    }, [overlaysOpen, requestLock]);

    const value: Ctx = {
        overlaysOpen,
        pushOverlay,
        popOverlay,
        requestLock,
        releaseLock,
        isLocked,
        setLockTarget
    };
    return <PointerLockCtx.Provider value={value}>{children}</PointerLockCtx.Provider>;
};
