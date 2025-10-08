// ====================================
// FILE: src/game/layers/Weapon/Weapon.tsx
// ====================================
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useDracoGLTF } from "@/hooks/useDracoKtx2GLTF";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CFG } from "@/constants/config";
import { setLayerRecursive } from "../../utils/three/layers";
import { tuneMaterials } from "../../utils/textures/tuneMaterials";
import { isKTX2Ready } from "@/game/utils/three/ktx2/ktx2";

export type WeaponAPI = { flash: () => void };
export type WeaponProps = { hand?: "right" | "left" };

export const Weapon = forwardRef<WeaponAPI, WeaponProps>(function WeaponImpl(
    { hand = "right" },
    ref
) {
    const { scene } = useDracoGLTF(CFG.models.weapon, {
        dracoPath: CFG.decoders.dracoPath,
        meshopt: true,
    }) as any;

    const rootRef = useRef<THREE.Group>(null!);
    const wrapRef = useRef<THREE.Group>(null!); // wrapper para espejo en zurdo
    const [hasGun, setHasGun] = useState(false);

    // --- Muzzle flash ---
    const { camera } = useThree();
    const muzzleAnchor = useRef<THREE.Group>(null!);
    const flashMesh = useRef<THREE.Mesh>(null!);
    const flashLight = useRef<THREE.PointLight>(null!);
    const flashT = useRef<number>(-1);
    const FLASH_DUR = 0.06;
    const FLASH_SCALE = 0.10;
    const FLASH_COLOR = new THREE.Color(1.0, 0.85, 0.55);

    useImperativeHandle(ref, () => ({
        flash: () => {
            flashT.current = 0;
            if (flashMesh.current) flashMesh.current.visible = true;
            if (flashLight.current) flashLight.current.visible = true;
        },
    }), []);

    useFrame((_, dt) => {
        if (muzzleAnchor.current && flashMesh.current) {
            muzzleAnchor.current.updateMatrixWorld();
            flashMesh.current.lookAt(camera.position);
        }
        if (flashT.current >= 0) {
            flashT.current += dt;
            const t = Math.min(1, flashT.current / FLASH_DUR);
            const k = 1 - t;
            const s = FLASH_SCALE * (0.6 + 1.4 * k);
            if (flashMesh.current) {
                (flashMesh.current.material as THREE.MeshBasicMaterial).opacity = k * k;
                flashMesh.current.scale.setScalar(s);
            }
            if (flashLight.current) {
                flashLight.current.intensity = 6.0 * k;
                flashLight.current.distance = 0.6 + 0.8 * k;
            }
            if (t >= 1) {
                flashT.current = -1;
                if (flashMesh.current) flashMesh.current.visible = false;
                if (flashLight.current) { flashLight.current.visible = false; flashLight.current.intensity = 0; }
            }
        }
    });

    useEffect(() => {
        if (!rootRef.current || !scene) return;

        // Wrapper que se espeja cuando la mano es zurda
        const wrap = new THREE.Group();
        wrapRef.current = wrap;
        rootRef.current.add(wrap);
        setLayerRecursive(wrap, CFG.layers.WEAPON);

        // --- Modelo del arma ---
        const gun: THREE.Object3D = scene.clone(true);

        // Centrado + escala homogénea
        const box = new THREE.Box3().setFromObject(gun);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);
        gun.position.sub(center);
        const diag = Math.max(1e-6, Math.hypot(size.x, size.y, size.z));
        const fit = THREE.MathUtils.clamp(1.2 / diag, 0.02, 50);
        gun.scale.setScalar(fit * (CFG.weapon.scale ?? 1));

        // Rotación/offset exactos del CFG (el espejo lo hace el wrapper)
        const [rx, ry, rz] = CFG.weapon.rotation;
        const [ox, oy, oz] = CFG.weapon.modelOffset;
        gun.rotation.set(rx, ry, rz);
        gun.position.add(new THREE.Vector3(ox, oy, oz));

        // Materiales seguros al espejar (DoubleSide para evitar backface con scale.x<0)
        gun.traverse((o: any) => {
            if (!o.isMesh) return;
            o.frustumCulled = false;
            o.renderOrder = 10000;
            const m = o.material?.isMaterial ? o.material.clone() : o.material;
            if (m) {
                m.depthTest = true;
                m.depthWrite = true;
                m.side = THREE.DoubleSide;
                (m as any).toneMapped = true;
                if (m.transparent && m.opacity >= 1) m.transparent = false;
            }
            o.material = m;
        });
        try { tuneMaterials(gun); } catch { }

        wrap.add(gun);
        setLayerRecursive(gun, CFG.layers.WEAPON);
        setHasGun(true);

        // Muzzle anchor (espacio del wrap)
        const worldBox = new THREE.Box3().setFromObject(gun);
        const min = worldBox.min.clone();
        const max = worldBox.max.clone();

        const anchor = new THREE.Group();
        anchor.position.set((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, min.z - 0.02);
        anchor.renderOrder = 10010;
        muzzleAnchor.current = anchor;
        wrap.add(anchor);
        setLayerRecursive(anchor, CFG.layers.WEAPON);

        // Flash (plano + luz)
        const geom = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
            color: FLASH_COLOR,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            toneMapped: false,
        });
        const flash = new THREE.Mesh(geom, mat);
        flash.visible = false;
        flash.renderOrder = 10020;
        flash.frustumCulled = false;
        flashMesh.current = flash;
        anchor.add(flash);

        const plight = new THREE.PointLight(FLASH_COLOR, 0, 0.6, 2);
        plight.visible = false;
        plight.castShadow = false;
        flashLight.current = plight;
        anchor.add(plight);

        return () => {
            try { rootRef.current?.remove(wrap); } catch { }
            gun.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
            geom.dispose(); mat.dispose();
        };
    }, [scene]);

    // Activar espejo según mano (sin recrear nada)
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const mirrored = hand === "left";
        wrap.scale.set(mirrored ? -1 : 1, 1, 1);
        setLayerRecursive(rootRef.current!, CFG.layers.WEAPON);
        try { wrap.updateMatrixWorld(true); } catch { }
    }, [hand]);

    return (
        <group
            ref={rootRef}
            frustumCulled={false}
            renderOrder={10000}
            onUpdate={(g) => setLayerRecursive(g, CFG.layers.WEAPON)}
        >
            {/* Luces locales (misma capa) */}
            <pointLight
                intensity={1.15}
                distance={2.1}
                decay={2}
                color="#ffffff"
                position={[0.06, 0.03, -0.08]}
                onUpdate={(l) => { l.castShadow = false; l.layers.set(CFG.layers.WEAPON); }}
            />
            <hemisphereLight
                intensity={0.35}
                color="#ffffff"
                groundColor="#2f3842"
                onUpdate={(l) => { l.layers.set(CFG.layers.WEAPON); }}
            />

            {(!hasGun || CFG.weapon.debugCube) && (
                <mesh frustumCulled={false} renderOrder={10000}>
                    <boxGeometry args={[0.15, 0.08, 0.4]} />
                    <meshStandardMaterial metalness={0.2} roughness={0.6} />
                </mesh>
            )}
        </group>
    );
});

const __preloadWeapon = () =>
    (useDracoGLTF as any).preload(CFG.models.weapon, {
        dracoPath: CFG.decoders.dracoPath,
        meshopt: true,
    });
if (isKTX2Ready()) {
    __preloadWeapon();
} else if (typeof window !== "undefined") {
    window.addEventListener("ktx2-ready", __preloadWeapon, { once: true });
}
export default Weapon;
