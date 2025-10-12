/* =========================================================
FILE: src/game/layers/Player/Player.tsx
========================================================= */
import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Hud from "../Hud/Hud";
import { useAmmo } from "../../../hooks/useUiAmmo";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { ColliderEnvBVH } from "../../utils/collision/colliderEnvBVH";
import { CFG } from "@/constants/config";
import Weapon from "../Weapon/Weapon";
import { audioManager } from "../../utils/audio/audio";
import { useGameStore } from "../../utils/state/store";
import { useHudEditorStore } from "../../utils/state/hudEditor";
import { setLayerRecursive } from "@/game/utils/three/layers";
import { isFullscreen, enterImmersive, exitImmersive } from "@/game/utils/immersive";
import { ASSETS } from "@/constants/assets";

type DebugFlags = { withWeapon?: boolean; withHud?: boolean };

type Props = {
    env: React.MutableRefObject<ColliderEnvBVH | null>;
    onShoot: (from: THREE.Vector3, to: THREE.Vector3) => void;
    startAt?: THREE.Vector3;
    /** Si se pasa, la cámara mira hacia aquí al nacer. */
    startLookAt?: THREE.Vector3;
    debug?: DebugFlags;
    uiLocked?: boolean;
    getEnemyMeshes?: () => THREE.Object3D[] | null;
};

// ---- CFG consts
const SPEED_BASE = CFG.move.speed;
const SPRINT_MUL = CFG.move.sprintMul;
const EYE_HEIGHT_STAND = CFG.move.standHeight;
const EYE_HEIGHT_CROUCH = CFG.move.crouchHeight;
const JUMP_SPEED = CFG.move.jumpHeight;
const GRAVITY = Math.abs(CFG.move.gravity);
const DT_CLAMP = CFG.move.dtClampMs / 1000;
const GROUND_SKIN = 0.005;
const MAX_SUBSTEP = CFG.collision?.maxSubstep ?? 0.15;

// Arma
const FIRE_COOLDOWN_MS = 120;
const RECOIL_TIME = 0.11;
const RECOIL_BACK = 0.06;
const RECOIL_PITCH = 0.025;

const BOB_BASE_HZ = 1.6 * (CFG.weapon.bob?.freqMul ?? 1);
const BOB_POS_AMP = 0.035;
const BOB_ROT_AMP = 0.03;

const SWAY_AMP = 0.012;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));

const GROUND_FALLBACK_Y = 0;

// ADS mode
const ADS_MODE: "hold" | "toggle" = ((CFG as any)?.look?.adsMode ?? "toggle");

const Player = ({
    env,
    onShoot,
    startAt,
    startLookAt,
    debug,
    uiLocked = false,
    getEnemyMeshes,
}: Props) => {
    const withWeapon = debug?.withWeapon ?? true;
    const withHud = debug?.withHud ?? true;

    const editEnabled = useHudEditorStore((s) => s.enabled);
    const menuOpen = useGameStore((s) => s.menuOpen);
    const setMenuOpen = useGameStore((s) => s.setMenuOpen);
    const handRaw = useGameStore((s) => s.hand);
    const hand = handRaw === "left" ? "left" : "right";

    const { camera, invalidate, gl } = useThree();

    // HUD: “crosshair sobre dron”
    const setCrosshairOnDrone = useGameStore((s) => s.setCrosshairOnDrone);
    const overTargetFromStore = useGameStore((s) => s.crosshairOnDrone);

    // Estado físico/cámara
    const pos = useRef(new THREE.Vector3(startAt?.x ?? 0, startAt?.y ?? 0.1, startAt?.z ?? 0));
    const velY = useRef(0);
    const grounded = useRef(false);

    // Crouch con SHIFT (mantener)
    const [crouch, setCrouch] = useState(false);
    const radius = () => (crouch ? (CFG.collision?.radiusCrouch ?? 0.22) : (CFG.collision?.radiusStand ?? 0.26));
    const eye = () => (crouch ? EYE_HEIGHT_CROUCH : EYE_HEIGHT_STAND);

    // heading para HUD/radar
    const headingRad = useRef(0);
    const getPlayer2D = useCallback(
        () => ({ x: pos.current.x, y: pos.current.z, headingRad: headingRad.current }),
        []
    );

    const [health, setHealth] = useState<number>(100);
    const [shield, setShield] = useState<number>(100);

    // Munición/arma
    const MAG_SIZE = Number(CFG.reload.clipSize) || 20;
    const { mag, reserve, reloading, shoot, reload } = useAmmo({
        magSize: MAG_SIZE,
        reserveCap: CFG.reload.reserve,
        reloadMs: CFG.reload.timeMs,
        autoReloadOnEmpty: true,
    });

    const weaponRigRef = useRef<THREE.Group>(null!);

    // Reusables
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const raycasterEnemies = useMemo(() => new THREE.Raycaster(), []);
    const tmpForward = useMemo(() => new THREE.Vector3(), []);
    const tmpRight = useMemo(() => new THREE.Vector3(), []);
    const tmpMove = useMemo(() => new THREE.Vector3(), []);
    const tmpDir = useMemo(() => new THREE.Vector3(), []);
    const tmpEnd = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        raycaster.layers.set(CFG.layers.WORLD);
        raycasterEnemies.layers.set(CFG.layers.ENEMIES);
        raycaster.camera = camera as THREE.Camera;
        raycasterEnemies.camera = camera as THREE.Camera;
    }, [camera, raycaster, raycasterEnemies]);

    // Reducir consumo con menús/overlays
    useEffect(() => { invalidate(); }, [menuOpen, invalidate]);
    // Repaint cuando cambia la mano (útil si hay menú)
    useEffect(() => { invalidate(); }, [hand, invalidate]);

    // ---------- Pointer Lock ----------
    const requestingLockRef = useRef(false);
    useEffect(() => {
        const onLockChange = () => {
            requestingLockRef.current = false;
            const locked = document.pointerLockElement === gl.domElement;
            document.body.classList.toggle("hide-cursor", locked);
            if (locked && menuOpen) setMenuOpen(false);
        };
        const onLockError = () => { requestingLockRef.current = false; };
        document.addEventListener("pointerlockchange", onLockChange);
        document.addEventListener("pointerlockerror", onLockError);
        return () => {
            document.removeEventListener("pointerlockchange", onLockChange);
            document.removeEventListener("pointerlockerror", onLockError);
        };
    }, [gl, menuOpen, setMenuOpen]);

    // TAB → abrir menú (y liberar lock)
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;
            e.preventDefault();
            try { document.exitPointerLock(); } catch { }
            setMenuOpen(true);
        };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [setMenuOpen]);

    // ====== ZOOM (RMB) con SFX ======
    const zoomHeld = useRef(false);
    const zoomT = useRef(0);
    const zoomTarget = useRef(0);
    const baseFovRef = useRef<number | null>(null);
    const ADS_FOV: number = ((CFG as any)?.look?.adsFov ?? 52) as number;

    const ZOOM_IN_SRC: string | null =
        ((CFG as any)?.audio?.zoomIn?.src as string | undefined) ??
        ((CFG as any)?.audio?.zoomServoIn?.src as string | undefined) ??
        null;
    const ZOOM_OUT_SRC: string | null =
        ((CFG as any)?.audio?.zoomOut?.src as string | undefined) ??
        ((CFG as any)?.audio?.zoomServoOut?.src as string | undefined) ??
        null;

    const playServoIn = () => { if (ZOOM_IN_SRC) (audioManager as any)?.playSfx?.(ZOOM_IN_SRC); };
    const playServoOut = () => { if (ZOOM_OUT_SRC) (audioManager as any)?.playSfx?.(ZOOM_OUT_SRC); };

    // Ratón: LMB dispara, RMB zoom (hold/toggle)
    useEffect(() => {
        const el = gl.domElement;

        const onPointerDown = (e: PointerEvent) => {
            if (menuOpen || editEnabled || uiLocked) return;
            const locked = document.pointerLockElement === el;

            // Disparo
            if (e.button === 0) {
                if (!locked && !requestingLockRef.current) {
                    try { requestingLockRef.current = true; el.requestPointerLock(); } catch { requestingLockRef.current = false; }
                    return;
                }
                primeAudio();
                tryShoot();
                return;
            }

            // Zoom
            if (e.button === 2) {
                if (!locked) return;
                if (ADS_MODE === "hold") {
                    zoomHeld.current = true;
                    zoomTarget.current = 1;
                    playServoIn();
                } else {
                    const to = zoomTarget.current > 0.5 ? 0 : 1;
                    zoomTarget.current = to;
                    (to ? playServoIn : playServoOut)();
                }
            }
        };

        const onPointerUp = (e: PointerEvent) => {
            if (e.button !== 2) return;
            if (ADS_MODE === "hold") {
                zoomHeld.current = false;
                if (zoomTarget.current !== 0) playServoOut();
                zoomTarget.current = 0;
            }
        };

        const preventContextMenu = (e: Event) => e.preventDefault();

        el.addEventListener("pointerdown", onPointerDown as any, { passive: true });
        window.addEventListener("pointerup", onPointerUp as any, { passive: true });
        el.addEventListener("contextmenu", preventContextMenu);

        return () => {
            el.removeEventListener("pointerdown", onPointerDown as any);
            window.removeEventListener("pointerup", onPointerUp as any);
            el.removeEventListener("contextmenu", preventContextMenu);
        };
    }, [gl, menuOpen, editEnabled, uiLocked]);

    // Si se abre overlay/menú/editor → salir de zoom y liberar lock
    useEffect(() => {
        if (menuOpen || editEnabled || uiLocked) {
            try { if (document.pointerLockElement) document.exitPointerLock(); } catch { }
            if (zoomTarget.current !== 0) { zoomTarget.current = 0; playServoOut(); }
            zoomHeld.current = false;
        }
    }, [menuOpen, editEnabled, uiLocked]);

    // Mouse look + sway
    useEffect(() => {
        const SENS = CFG.look.sensitivity;
        const onMouseMove = (ev: MouseEvent) => {
            if (menuOpen || editEnabled || uiLocked) return;
            if (document.pointerLockElement !== gl.domElement) return;

            const dx = ev.movementX || 0;
            const dy = ev.movementY || 0;
            if (!dx && !dy) return;

            const euler = new THREE.Euler(0, 0, 0, "YXZ");
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= dx * SENS;
            euler.x -= dy * SENS;

            const LIM = Math.PI / 2 - 0.01;
            euler.x = Math.max(-LIM, Math.min(LIM, euler.x));
            (camera as THREE.PerspectiveCamera).quaternion.setFromEuler(euler);

            swayTargetX.current += -dx * 0.0006;
            swayTargetY.current += -dy * 0.0006;
        };
        document.addEventListener("mousemove", onMouseMove, { passive: true });
        return () => document.removeEventListener("mousemove", onMouseMove);
    }, [camera, gl, menuOpen, editEnabled, uiLocked]);

    // Ajustes cámara
    useEffect(() => {
        const c = camera as THREE.PerspectiveCamera;
        if (c.near > 0.01) { c.near = 0.01; c.updateProjectionMatrix(); }
    }, [camera]);

    // Posición/orientación inicial (spawn)
    useEffect(() => {
        if (startAt) {
            pos.current.copy(startAt);
            (camera as THREE.PerspectiveCamera).position.copy(startAt);
        }
        if (startLookAt) (camera as THREE.PerspectiveCamera).lookAt(startLookAt);
    }, [startAt, startLookAt, camera]);

    // Rig arma → capa WEAPON
    useEffect(() => {
        if (!withWeapon) return;
        const rig = weaponRigRef.current;
        if (!rig) return;
        rig.renderOrder = 10000;
        rig.layers.set(CFG.layers.WEAPON);
        setLayerRecursive(rig, CFG.layers.WEAPON);
        rig.traverse((o: any) => {
            if (o.isMesh) {
                o.castShadow = o.receiveShadow = false;
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) {
                    if (!m) continue;
                    m.depthTest = true;
                    m.depthWrite = true;
                    (m as any).toneMapped = true;
                    if (m.transparent && m.opacity >= 1) m.transparent = false;
                    m.needsUpdate = true;
                }
            }
        });
    }, [withWeapon]);

    // ------------ AUDIO ------------
    const stepSrcRef = useRef<AudioBufferSourceNode | null>(null);
    const primedRef = useRef(false);
    useEffect(() => {
        // Preload consistente: música (si hay) + SFX de gameplay
        const preloadUrls: string[] = [
            (CFG as any)?.audio?.musicCity?.src ?? "",
            ASSETS.audio.step,
            ASSETS.audio.reload,
            ASSETS.audio.shotLaser,
            ASSETS.audio.explosionDron,
            ((CFG as any)?.audio?.zoomIn?.src) ?? ((CFG as any)?.audio?.zoomServoIn?.src) ?? "",
            ((CFG as any)?.audio?.zoomOut?.src) ?? ((CFG as any)?.audio?.zoomServoOut?.src) ?? "",
        ].filter(Boolean);
        try { audioManager.loadMany?.(preloadUrls); } catch { }
    }, []);
    const primeAudio = () => {
        if (primedRef.current) return;
        primedRef.current = true;
        audioManager
            .ensureStarted?.()
            ?.then(() => {
                const music = (CFG as any)?.audio?.musicCity?.src as string | undefined;
                if (music) (audioManager as any)?.playMusic?.(music, true);
            })
            .catch(() => { primedRef.current = false; });
    };

    // ==== Teclado – uso hook + fallback manual (seguro en todos los navegadores) ====
    const keys = useKeyboard({
        onDown: (e) => {
            if (menuOpen || editEnabled || uiLocked) return;
            if (e.code === "Space" && grounded.current) velY.current = JUMP_SPEED;

            // SHIFT = Crouch
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") setCrouch(true);

            if (e.code === "KeyR") {
                if (!reloading) triggerReloadAnim();
                reload();
            }

            // Ajustes debug rápidos
            if (e.code === "BracketLeft") setHealth((h) => Math.max(0, h - 10));
            if (e.code === "BracketRight") setShield((s) => Math.max(0, s - 10));

            primeAudio();
        },
        onUp: (e) => {
            if (menuOpen || editEnabled || uiLocked) return;
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") setCrouch(false);
        },
        ignoreTyping: true,
    });

    const manualKeys = useRef<Record<string, boolean>>({});
    useEffect(() => {
        const d = (e: KeyboardEvent) => {
            if (menuOpen || editEnabled || uiLocked) return;
            manualKeys.current[e.code] = true;
            if (e.code === "Space" && grounded.current) velY.current = JUMP_SPEED;
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") setCrouch(true);
            if (e.code === "KeyR") { if (!reloading) triggerReloadAnim(); reload(); }
        };
        const u = (e: KeyboardEvent) => {
            manualKeys.current[e.code] = false;
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") setCrouch(false);
        };
        window.addEventListener("keydown", d);
        window.addEventListener("keyup", u);
        return () => {
            window.removeEventListener("keydown", d);
            window.removeEventListener("keyup", u);
        };
    }, [menuOpen, editEnabled, uiLocked, reloading, reload]);

    // ===================== Animación ARMA =====================
    const lastShotMs = useRef(0);

    // Sway
    const swayTargetX = useRef(0), swayTargetY = useRef(0);
    const swayX = useRef(0), swayY = useRef(0);

    // Bobbing
    const bobPhase = useRef(0);
    const bobAmt = useRef(0);
    const bobSpeed = useRef(0);

    // Recoil
    const recoilT = useRef(0);
    const recoilActive = useRef(false);

    // Reload
    const reloadT = useRef(0);
    const reloadActive = useRef(false);
    const reloadDur = useRef(Math.max(0.2, CFG.reload.timeMs / 1000));

    const triggerRecoil = () => { recoilActive.current = true; recoilT.current = 0; };
    const triggerReloadAnim = () => { reloadActive.current = true; reloadT.current = 0; };
    useEffect(() => { if (reloading) triggerReloadAnim(); }, [reloading]);

    // Colocación + animación del arma
    useFrame((_, rawDt) => {
        if (!withWeapon) return;
        const dt = Math.min(0.05, rawDt);
        const rig = weaponRigRef.current;
        if (!rig) return;

        if (rig.layers.mask !== (1 << CFG.layers.WEAPON)) {
            rig.layers.set(CFG.layers.WEAPON);
            setLayerRecursive(rig, CFG.layers.WEAPON);
        }

        const cam = camera as THREE.PerspectiveCamera;
        const dist = CFG.weapon.screenDistance;
        const sy = CFG.weapon.screenPos[1];
        const signX = hand === "left" ? -1 : 1;
        const sx = signX * Math.abs(CFG.weapon.screenPos[0]);

        const fov = THREE.MathUtils.degToRad(cam.fov);
        const halfH = Math.tan(fov / 2) * dist;
        const halfW = halfH * cam.aspect;

        rig.position.copy(cam.position);
        rig.quaternion.copy(cam.quaternion);
        rig.translateZ(-dist);
        rig.translateX(sx * halfW);
        rig.translateY(sy * halfH);
        rig.renderOrder = 10000;

        // Movimiento (bobbing + sway)
        const isDown = (code: string) => !!(keys.current[code] || manualKeys.current[code]);
        const moving = isDown("KeyW") || isDown("KeyS") || isDown("KeyQ") || isDown("KeyE");
        const sprint = isDown("KeyV") ? SPRINT_MUL : 1; // V = correr
        const moveTarget = moving ? 0.7 * sprint : 0;
        bobAmt.current = lerp(bobAmt.current, moveTarget, dt * 5.0);
        bobSpeed.current = lerp(bobSpeed.current, moving ? 1 : 0, dt * 4.0);

        swayX.current = lerp(swayX.current, swayTargetX.current, 0.12);
        swayY.current = lerp(swayY.current, swayTargetY.current, 0.12);
        swayTargetX.current *= 1 - dt * 3.0;
        swayTargetY.current *= 1 - dt * 3.0;

        bobPhase.current += dt * (BOB_BASE_HZ * (1 + 0.25 * bobSpeed.current)) * Math.PI * 2;

        let offX = 0, offY = 0, offZ = 0;
        let rX = 0, rY = 0, rZ = 0;

        if (bobAmt.current > 0.0001) {
            const s = Math.sin(bobPhase.current);
            const c = Math.cos(bobPhase.current * 0.5);
            offY += s * (BOB_POS_AMP * 1.2) * bobAmt.current;
            offX += c * (BOB_POS_AMP * 0.55) * bobAmt.current;
            rZ += s * (BOB_ROT_AMP * 0.7) * bobAmt.current;
            rX += Math.abs(s) * (BOB_ROT_AMP * 0.35) * bobAmt.current;
        }

        rY += THREE.MathUtils.clamp(swayX.current, -0.12, 0.12) * SWAY_AMP * 2;
        rX += THREE.MathUtils.clamp(swayY.current, -0.12, 0.12) * SWAY_AMP * 2;
        if (hand === "left") offX *= -1;

        if (recoilActive.current) {
            recoilT.current += dt / RECOIL_TIME;
            const t = clamp01(recoilT.current);
            const k = 1 - t;
            offZ -= RECOIL_BACK * (1 - k * k);
            rX -= RECOIL_PITCH * (1 - k * k);
            if (t >= 1) recoilActive.current = false;
        }

        if (reloadActive.current) {
            reloadT.current += dt / reloadDur.current;
            const t = clamp01(reloadT.current);
            const dir = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
            const e = easeInOutSine(dir);
            offY -= 0.11 * e;
            offZ -= 0.06 * e;
            const lateral = hand === "left" ? -1 : 1;
            rZ += 0.42 * e * lateral;
            rY += 0.16 * e * lateral;
            if (t >= 1) reloadActive.current = false;
        }

        rig.translateX(offX);
        rig.translateY(offY);
        rig.translateZ(offZ);
        const qAdd = new THREE.Quaternion().setFromEuler(new THREE.Euler(rX, rY, rZ, "YXZ"));
        rig.quaternion.multiply(qAdd);
    });

    // ---- Disparo
    const tryShoot = () => {
        if (menuOpen || editEnabled || uiLocked) return;
        if (reloading || reloadActive.current) return;

        const now = performance.now();
        if (now - lastShotMs.current < FIRE_COOLDOWN_MS) return;

        if (mag <= 0 && reserve <= 0) return;

        if (mag <= 0) {
            if (reserve > 0 && !reloading) { triggerReloadAnim(); reload(); }
            return;
        }
        if (!shoot()) {
            if (mag <= 0 && reserve > 0 && !reloading) { triggerReloadAnim(); reload(); }
            return;
        }

        lastShotMs.current = now;
        triggerRecoil();
        (audioManager as any)?.playSfx?.(ASSETS.audio.shotLaser);

        (camera as THREE.PerspectiveCamera).getWorldDirection(tmpDir).normalize();
        const origin = (camera as THREE.PerspectiveCamera).position;
        tmpEnd.copy(origin).addScaledVector(tmpDir, 100);

        // Clip con mundo
        raycaster.set(origin, tmpDir);
        const hits: THREE.Intersection[] = [];
        const envRef = env.current;
        if (envRef?.walls) hits.push(...raycaster.intersectObject(envRef.walls, true));
        if (envRef?.ground) hits.push(...raycaster.intersectObject(envRef.ground, true));
        if (hits.length) {
            const hit = hits.sort((a, b) => a.distance - b.distance)[0];
            tmpEnd.copy(hit.point).addScaledVector(tmpDir, -0.01);
        }

        window.dispatchEvent(new CustomEvent("weapon:shot", { detail: { power: 1 } }));

        // Delegamos a Game.tsx el hit test contra drones
        onShoot(origin.clone(), tmpEnd.clone());
    };

    // Auto-reload
    useEffect(() => {
        if (mag <= 0 && reserve > 0 && !reloading) {
            triggerReloadAnim();
            reload();
        }
    }, [mag, reserve, reloading, reload]);

    useEffect(() => { if (reloading) (audioManager as any)?.playSfx?.(ASSETS.audio.reload); }, [reloading]);

    const isDown = (code: string) => !!(keys.current[code] || manualKeys.current[code]);

    // Movimiento/collisions + sonido pasos
    useFrame((_, rawDt) => {
        if (menuOpen || editEnabled || uiLocked) return;

        const envRef = env.current;
        const dt = Math.min(rawDt, DT_CLAMP);

        (camera as THREE.PerspectiveCamera).getWorldDirection(tmpForward);
        tmpForward.y = 0;
        if (tmpForward.lengthSq() > 0) tmpForward.normalize();
        tmpRight.set(0, 1, 0).cross(tmpForward);

        tmpMove.set(0, 0, 0);
        const sprint = isDown("KeyV") ? SPRINT_MUL : 1; // V = correr
        const spd = SPEED_BASE * sprint;
        if (isDown("KeyW")) tmpMove.add(tmpForward);
        if (isDown("KeyS")) tmpMove.addScaledVector(tmpForward, -1);
        if (isDown("KeyE")) tmpMove.addScaledVector(tmpRight, -1);
        if (isDown("KeyQ")) tmpMove.add(tmpRight);
        if (tmpMove.lengthSq() > 0) tmpMove.normalize().multiplyScalar(spd * dt);

        // SHIFT = crouch (mantener)
        setCrouch(isDown("ShiftLeft") || isDown("ShiftRight"));

        // gravedad
        const targetEye = eye();
        velY.current -= GRAVITY * dt;
        pos.current.y += velY.current * dt;

        // suelo
        let gY: number | null = null;
        if (envRef) gY = envRef.groundY(pos.current.x, pos.current.z);
        if (gY == null) gY = GROUND_FALLBACK_Y;

        const feetY = pos.current.y - targetEye;
        if (feetY < gY + GROUND_SKIN) {
            pos.current.y = gY + targetEye + GROUND_SKIN;
            velY.current = 0;
            grounded.current = true;
        } else {
            grounded.current = false;
        }

        // paredes
        if (envRef) {
            let remaining = tmpMove.length();
            if (remaining > 0) {
                const dir = tmpMove.normalize();
                const lastSafe = new THREE.Vector3().copy(pos.current);

                while (remaining > 0) {
                    const stepLen = Math.min(remaining, MAX_SUBSTEP);
                    const stepX = dir.x * stepLen, stepZ = dir.z * stepLen;

                    const rBase = radius();
                    const rWalls = Math.max(0.05, rBase - (CFG.collision?.wallPadding ?? 0));
                    const capStart = new THREE.Vector3(pos.current.x, (pos.current.y - targetEye) + rBase, pos.current.z);
                    const capEnd = new THREE.Vector3(
                        pos.current.x,
                        (pos.current.y - targetEye) + Math.max(targetEye - rBase, rBase),
                        pos.current.z
                    );

                    const corrected = envRef.sweepCapsule(capStart, capEnd, rWalls, new THREE.Vector3(stepX, 0, stepZ));

                    const maxCorr = stepLen * 1.5 + 0.02;
                    const tooMuch =
                        !Number.isFinite(corrected.x) ||
                        !Number.isFinite(corrected.y) ||
                        !Number.isFinite(corrected.z) ||
                        corrected.length() > maxCorr;

                    if (tooMuch) {
                        pos.current.copy(lastSafe);
                        break;
                    }

                    pos.current.add(corrected);

                    if (corrected.lengthSq() < 1e-10 && stepLen > 0.0) {
                        break;
                    }

                    if (corrected.lengthSq() > 1e-8) lastSafe.copy(pos.current);

                    remaining -= stepLen;
                }
            }
        } else {
            pos.current.add(tmpMove);
        }

        (camera as THREE.PerspectiveCamera).position.copy(pos.current);

        // pasos (loop while moving, solo en suelo)
        const movingKeys = isDown("KeyW") || isDown("KeyS") || isDown("KeyQ") || isDown("KeyE");
        const canPlaySteps = !uiLocked && movingKeys && grounded.current;
        const isPlaying = !!stepSrcRef.current;
        if (canPlaySteps && !isPlaying) stepSrcRef.current = (audioManager as any)?.playSfxLoop?.(ASSETS.audio.step);
        else if (!canPlaySteps && isPlaying) {
            (audioManager as any)?.stop?.(stepSrcRef.current);
            stepSrcRef.current = null;
        }
    });

    // Raycast del crosshair contra ENEMIES para HUD + highlight (con LOS real)
    useFrame(() => {
        if (menuOpen || editEnabled || uiLocked) {
            if (overTargetFromStore) setCrosshairOnDrone(false);
            try { window.dispatchEvent(new CustomEvent("aim:over-drone", { detail: { id: null } })); } catch { }
            return;
        }

        const cam = camera as THREE.PerspectiveCamera;
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir).normalize();

        raycasterEnemies.camera = cam;
        raycasterEnemies.set(cam.position, dir);
        raycasterEnemies.far = 500;

        const roots = (getEnemyMeshes?.() ?? []).filter(
            (o): o is THREE.Object3D => !!o && !(o as any).isSprite && (o as any).type !== "Sprite"
        );

        let hoverId: number | null = null;

        if (roots.length) {
            const hits = roots
                .flatMap((root) => raycasterEnemies.intersectObject(root, true))
                .filter((h) => h.object && !(h.object as any).isSprite && h.object.type !== "Sprite")
                .sort((a, b) => a.distance - b.distance);

            if (hits.length) {
                const h = hits[0];
                let obj: any = h.object;
                let id: number | null = null;
                while (obj && id == null) {
                    if (obj.userData?.droneId != null) id = obj.userData.droneId as number;
                    obj = obj.parent;
                }

                // Línea de visión real
                if (id != null) {
                    const envRef = env.current;
                    let blocked = false;
                    if (envRef) {
                        const rcLOS = new THREE.Raycaster(cam.position.clone(), dir.clone(), 0, h.distance - 0.01);
                        const obs: THREE.Intersection[] = [];
                        if (envRef.walls) obs.push(...rcLOS.intersectObject(envRef.walls, true));
                        if (envRef.ground) obs.push(...rcLOS.intersectObject(envRef.ground, true));
                        if (obs.length) blocked = true;
                    }
                    if (!blocked) hoverId = id;
                }
            }
        }

        setCrosshairOnDrone(hoverId != null);
        try { window.dispatchEvent(new CustomEvent("aim:over-drone", { detail: { id: hoverId } })); } catch { }
    });

    // Interpolación de FOV (ADS)
    useFrame((_, dt) => {
        const cam = camera as THREE.PerspectiveCamera;
        if (baseFovRef.current == null) baseFovRef.current = cam.fov;

        const target = clamp01(zoomTarget.current);
        const speed = target > zoomT.current ? 8.0 : 6.0;
        zoomT.current += (target - zoomT.current) * Math.min(1, dt * speed);
        const nextFov = THREE.MathUtils.lerp(baseFovRef.current!, ADS_FOV, zoomT.current);
        if (Math.abs(nextFov - cam.fov) > 1e-3) {
            cam.fov = nextFov;
            cam.updateProjectionMatrix();
        }
    });

    // heading para HUD/radar
    useFrame(() => {
        tmpForward.set(0, 0, 0);
        (camera as THREE.PerspectiveCamera).getWorldDirection(tmpForward);
        tmpForward.y = 0;
        if (tmpForward.lengthSq() > 0) {
            tmpForward.normalize();
            headingRad.current = Math.atan2(tmpForward.x, tmpForward.z);
        }
    });

    // limpieza audio
    useEffect(() => {
        return () => {
            if (stepSrcRef.current) {
                (audioManager as any)?.stop?.(stepSrcRef.current);
                stepSrcRef.current = null;
            }
        };
    }, []);

    // Tecla "F" → modo inmersivo (FS + pointer lock del host)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "KeyF") {
                e.preventDefault();
                if (isFullscreen()) {
                    exitImmersive();
                } else {
                    const host = gl.domElement as HTMLElement; // canvas → desde ahí inferimos host
                    enterImmersive(host);
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [gl]);

    return (
        <>
            {withWeapon && (
                <group
                    ref={weaponRigRef}
                    frustumCulled={false}
                    renderOrder={10000}
                    onUpdate={(g) => setLayerRecursive(g, CFG.layers.WEAPON)}
                >
                    <Suspense
                        fallback={
                            <mesh frustumCulled={false} renderOrder={10000}>
                                <boxGeometry args={[0.15, 0.08, 0.4]} />
                                <meshBasicMaterial depthTest={true} depthWrite={true} toneMapped={true} />
                            </mesh>
                        }
                    >
                        <Weapon hand={hand} />
                    </Suspense>
                </group>
            )}

            {withHud && (
                <Hud
                    mag={mag}
                    magSize={MAG_SIZE}
                    reserve={reserve}
                    reloading={reloading}
                    reloadT={0}
                    health={health}
                    shield={shield}
                    player={{ x: pos.current.x, y: pos.current.z, headingRad: headingRad.current }}
                    getPlayer2D={getPlayer2D}
                    env={{ walls: env.current?.walls ?? null, ground: env.current?.ground ?? null }}
                    getEnemyMeshes={getEnemyMeshes}
                    overTarget={overTargetFromStore}
                />
            )}
        </>
    );
};

export default Player;
