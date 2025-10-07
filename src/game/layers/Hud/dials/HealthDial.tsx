/*  ====================================
    FILE: src/game/layers/Hud/dials/HealthDial.tsx
    ==================================== */

import { CircularDial } from "./CircularDial";
import { CFG } from "@/constants/config";

export function HealthDial({
    value,
    position,
    size = CFG.hud.dials.size,
}: { value: number; position: [number, number, number]; size?: number }) {
    return (
        <CircularDial
            value={value}
            label="VIDA"
            position={position}
            size={size}
            color={CFG.hud?.dials?.healthColor || "#ff3b3b"}    // rojo base
            criticalA="#ff8a00"                                   // naranja
            criticalB="#ff1f1f"                                   // rojo intenso
            criticalThreshold={0.2}
            layer={CFG.layers.HUD}
        />
    );
}

export default HealthDial;
