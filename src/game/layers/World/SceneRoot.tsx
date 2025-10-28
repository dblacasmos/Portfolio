/* =======================================
   FILE: src/game/layers/World/SceneRoot.tsx
   ======================================= */
import * as React from "react";
import * as THREE from "three";
import { CFG } from "@/constants/config";
import { City, type CityReadyInfo } from "./City";
import DomeSky from "./DomeSky";

type Props = {
    onReady?: (info: CityReadyInfo) => void;
    [key: string]: any;
};

export default function SceneRoot(props: Props) {
    const { onReady, ...rest } = props;

    const handleReady = React.useCallback(
        (info: CityReadyInfo) => {
            onReady?.(info); // ← reenvía cityRoot incluido
        },
        [onReady]
    );

    const center = React.useMemo(() => new THREE.Vector2(0, 0), []);
    const radius = React.useMemo(
        () => 0.5 * Math.max(CFG.city.size.x, CFG.city.size.z) + ((CFG as any).dome?.margin ?? 0),
        []
    );
    const groundY = 0;
    const height = (CFG.bounds.height ?? 0) + (CFG.bounds.heightExtra ?? 0);

    return (
        <group
            {...rest}
            onUpdate={(g: THREE.Group) => g.traverse((o) => o.layers.set(CFG.layers.WORLD))}
        >
            <DomeSky center={center} radius={radius} groundY={groundY} height={height} />
            <City onReady={handleReady} />
        </group>
    );
}
