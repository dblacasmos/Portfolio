import { CircularDial } from "./CircularDial";
import { CFG } from "@/constants/config";

export function ShieldDial({
    value,
    position,
    size = CFG.hud.dials.size,
}: { value: number; position: [number, number, number]; size?: number }) {
    return (
        <CircularDial
            value={value}
            label="ESCUDO"
            position={position}
            size={size}
            color={CFG.hud?.dials?.shieldColor || "#22d3ee"} // cian base
            criticalA="#22d3ee"                                // cian
            criticalB="#4338ca"                                // índigo
            criticalThreshold={0.2}
            layer={CFG.layers.HUD}
        />
    );
}

export default ShieldDial;
