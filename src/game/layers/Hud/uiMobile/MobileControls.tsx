import React, { useEffect, useCallback } from "react";
import { useIsMobileOrTablet } from "@/hooks/useDevice";
import { useInput } from "@/hooks/useInput";
import { Joystick } from "./Joystick";

export const MobileControls: React.FC = () => {
    const isMobile = useIsMobileOrTablet();
    // Selecciones estables: cada una por separado
    const setButton = useInput((s) => s.setButton);
    const setEnableTouch = useInput((s) => s.setEnableTouch);
    const enableTouch = useInput((s) => s.enableTouch);

    // Solo cambia si el valor realmente difiere, para evitar notificaciones inútiles
    useEffect(() => {
        if (enableTouch !== isMobile) setEnableTouch(isMobile);
    }, [isMobile, enableTouch, setEnableTouch]);

    if (!isMobile) return null;

    const Btn: React.FC<
        React.PropsWithChildren<{ onPress: () => void; onRelease?: () => void }>
    > = ({ onPress, onRelease, children }) => (
        <button
            className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md active:scale-95"
            onPointerDown={(e) => {
                e.preventDefault();
                onPress();
            }}
            onPointerUp={(e) => {
                e.preventDefault();
                onRelease?.();
            }}
            onPointerCancel={(e) => {
                e.preventDefault();
                onRelease?.();
            }}
            onPointerLeave={(e) => {
                // Si el dedo sale del botón sin soltar, liberamos
                e.preventDefault();
                onRelease?.();
            }}
        >
            {children}
        </button>
    );

    return (
        <div className="pointer-events-auto absolute inset-0 p-4 flex justify-between items-end">
            <div className="flex flex-col gap-3">
                {/* Joystick sin props dinámicos que cambien cada frame */}
                <Joystick radius={56} />
            </div>
            <div className="flex flex-col gap-3 items-end">
                <div className="flex gap-2">
                    <Btn onPress={() => setButton("aim", true, "touch")} onRelease={() => setButton("aim", false, "touch")}>Aim</Btn>
                    <Btn onPress={() => setButton("fire", true, "touch")} onRelease={() => setButton("fire", false, "touch")}>Fire</Btn>
                </div>
                <div className="flex gap-2">
                    <Btn onPress={() => setButton("jump", true, "touch")} onRelease={() => setButton("jump", false, "touch")}>Jump</Btn>
                    <Btn onPress={() => setButton("sprint", true, "touch")} onRelease={() => setButton("sprint", false, "touch")}>Sprint</Btn>
                    <Btn onPress={() => setButton("reload", true, "touch")} onRelease={() => setButton("reload", false, "touch")}>Reload</Btn>
                </div>
            </div>
        </div>
    );
};
