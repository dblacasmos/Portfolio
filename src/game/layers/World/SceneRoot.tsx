/* =========================================
   FILE: src/game/layers/World/SceneRoot.tsx
   ========================================= */
import * as React from "react";
import * as THREE from "three";
import { CFG } from "@/constants/config";
import { City, type CityReadyInfo } from "./City";
import DomeSky from "./DomeSky";
import { ASSETS } from "@/constants/assets";

type Props = {
    onReady?: (info: CityReadyInfo) => void;
    [key: string]: any;
};

export default function SceneRoot(props: Props) {
    const { onReady, ...rest } = props;
    const [skyEnvMap, setSkyEnvMap] = React.useState<THREE.Texture | null>(null);

    const handleReady = React.useCallback(
        (info: CityReadyInfo) => {
            onReady?.(info);            // reenviamos cityRoot y masks
        },
        [onReady]
    );

    // Centro y escala del domo basados en config
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
            <DomeSky
                center={center}
                radius={radius}
                groundY={groundY}
                height={height}
                // Activa el PMREM -> scene.environment para reflejos PBR
                useEnvMap={true}
                // Prioriza CFG; si no, cae al asset por defecto
                textureUrl={(CFG as any)?.dome?.skySource
                    ?? (CFG as any)?.skySource
                    ?? ASSETS.img.timeline.skySource}
                maxTextureSize={(CFG as any)?.dome?.maxTextureSize ?? 2048}
                onEnvMap={setSkyEnvMap}
            />
            <City onReady={handleReady} envMapTexture={skyEnvMap} />
        </group>
    );
}
