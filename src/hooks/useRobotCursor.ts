//src/hooks/useRobotCursor.ts
import { useEffect } from "react";

/** Fuerza el cursor "robot" visible mientras el componente esté montado. */
export function useRobotCursor(on: boolean = true) {
    useEffect(() => {
        const b = document.body;
        if (on) {
            b.classList.remove("hide-cursor");
            b.classList.add("show-cursor", "hud-cursor");
        } else {
            b.classList.remove("show-cursor", "hud-cursor");
        }
        return () => { b.classList.remove("show-cursor", "hud-cursor"); };
    }, [on]);
}
