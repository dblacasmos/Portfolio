/* =============================
   FILE: src/pages/main/Hero.tsx
   ============================= */
import React, { Suspense, useEffect, useState, useMemo, useRef, type CSSProperties, useCallback, lazy, } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useSafeDpr } from "@/hooks/useSafeDpr";
// Carga perezosa de OrbitControls (reduce LCP y bundle)
const OrbitControls = lazy(() =>
  import("@react-three/drei").then((m) => ({ default: m.OrbitControls }))
);
import * as THREE from "three";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { useDracoGLTF } from "@/hooks/useDracoKtx2GLTF";
import { CFG } from "@/constants/config";
import { isKTX2Ready } from "@/game/utils/textures/ktx2";
import { patchThreeIndex0AttributeNameWarning } from "@/game/utils/three/fixIndex0Attr";
import { useRobotCursor } from "@/hooks/useRobotCursor";

patchThreeIndex0AttributeNameWarning();

/* ============ Sonido simple ============ */
function useSound(url?: string, volume = 1) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio(url ?? ASSETS.audio.buttonSound);
    a.preload = "none";
    a.crossOrigin = "anonymous";
    a.volume = volume;
    ref.current = a;
    return () => {
      try {
        a.pause();
      } catch { }
      ref.current = null;
    };
  }, [url, volume]);
  return () => {
    const a = ref.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play();
    } catch { }
  };
}

/* ================== Projector (coords en pantalla) ================== */
function Projector({
  positions,
  setScreenCoords,
}: {
  positions: any;
  setScreenCoords: (coords: any) => void;
}) {
  const { camera, size, invalidate } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const last = useRef<any>(null);

  useFrame(() => {
    if (!positions) return;
    const proj = (yVal: number) => {
      v.set(0, yVal, 0).project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-(v.y * 0.5) + 0.5) * size.height,
      };
    };
    const next = {
      head: proj(positions.head.y),
      torso: proj(positions.torso.y),
      legs: proj(positions.legs.y),
      shoulders: proj(positions.shoulders.y),
      gloves: proj(positions.gloves.y),
      boots: proj(positions.boots.y),
    };
    const changed =
      !last.current ||
      Object.keys(next).some((k) => {
        const a = (next as any)[k],
          b = last.current[k];
        return (a.x | 0) !== (b?.x | 0) || (a.y | 0) !== (b?.y | 0);
      });
    if (changed) {
      setScreenCoords(next);
      last.current = next;
      invalidate(); // frameloop="demand" -> dibuja sólo si cambian coords
    }
  });
  return null;
}

/* ============ Líneas animadas (SVG) ============ */
const sharedAnimation = (direction: "left" | "right") => ({
  animate: { strokeDashoffset: direction === "left" ? [0, 500] : [500, 0] },
  transition: { duration: 8, repeat: Infinity, ease: "linear" },
});
function AnimatedLine({
  start,
  end,
  direction,
  reduceEnd = 40,
  offsetX = 0,
  offsetY = 0,
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  direction: "left" | "right";
  reduceEnd?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const reduce = useReducedMotion();
  if (!start || !end) return null;
  const path = useMemo(() => {
    const startX = start.x + offsetX;
    const startY = start.y + offsetY;
    const adjustedEndX =
      direction === "left" ? end.x + reduceEnd : end.x - reduceEnd;
    const midX = direction === "left" ? startX - 100 : startX + 100;
    return `M ${startX} ${startY} H ${midX} V ${end.y} H ${adjustedEndX}`;
  }, [start, end, direction, reduceEnd, offsetX, offsetY]);
  return (
    <motion.svg
      className="absolute top-0 left-0 pointer-events-none"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <motion.path
        d={path}
        stroke="#0077b6"
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
      />
      {!reduce && (
        <motion.path
          d={path}
          stroke="#00f6ff"
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="5 500"
          {...(sharedAnimation(direction) as any)}
        />
      )}
    </motion.svg>
  );
}

/* ====== OrbitControls que invalidan en modo demand (lazy) ====== */
function ControlsDemand() {
  const { invalidate } = useThree();
  const handleInvalidate = () => invalidate();
  return (
    <Suspense fallback={null}>
      <OrbitControls
        enableZoom
        minDistance={8}
        maxDistance={14}
        enablePan={false}
        makeDefault
        onStart={handleInvalidate}
        onChange={handleInvalidate}
        onEnd={handleInvalidate}
      />
    </Suspense>
  );
}

/* ======================== UI: Panel (botón accesible) ======================== */
function FuturisticPanel({
  text,
  style,
  onClick,
  delayMs = 200,
  ariaLabel,
  hoverText,
  hoverStyleOverride,
}: {
  text: string;
  style: CSSProperties;
  onClick?: () => void;
  delayMs?: number;
  ariaLabel?: string;
  /** Texto alternativo a mostrar durante hover (opcional) */
  hoverText?: string;
  /** Estilos de hover para sobreescribir los por defecto (opcional) */
  hoverStyleOverride?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const playClick = useSound();
  const [hovered, setHovered] = useState(false);

  const handleActivate = useCallback(() => {
    playClick();
    if (onClick) {
      if (delayMs > 0) setTimeout(onClick, delayMs);
      else onClick();
    }
  }, [onClick, playClick, delayMs]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  // Hover por defecto (TIMELINE): cian
  const defaultHoverStyle: React.CSSProperties | undefined = reduce
    ? undefined
    : {
      scale: 1.05,
      color: "#22d3ee",
      textShadow: "0 0 12px rgba(56,189,248,.9)",
      boxShadow: "0 0 25px 6px rgba(56,189,248,.8)",
      backgroundColor: "rgba(0,30,60,.9)",
    };

  const effectiveHoverStyle =
    reduce ? undefined : (hoverStyleOverride ?? defaultHoverStyle);

  return (
    <motion.button
      type="button"
      role="button"
      aria-label={ariaLabel ?? text}
      onKeyDown={onKeyDown}
      whileHover={effectiveHoverStyle as any}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      transition={reduce ? undefined : { type: "spring", stiffness: 120, damping: 18 }}
      className={
        "absolute font-bold text-sm md:text-base px-6 py-4 rounded-lg " +
        "pointer-events-auto is-action focus:outline-none focus:ring-2 focus:ring-cyan-400/50 " +
        "focus-visible:ring-2 focus-visible:ring-cyan-400/60 " +
        "min-w-[44px] min-h-[44px] touch-pan-y"
      }
      style={{
        // Texto por defecto en CIAN
        color: "#22d3ee",
        backgroundImage: `url(${ASSETS.img.ui.paneles})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#001530",
        ...style,
      }}
      onClick={handleActivate}
    >
      {hovered && hoverText ? hoverText : text}
    </motion.button>
  );
}

/* ===================== Modelo ===================== */
function RobotModel({ onBounds }: { onBounds: (box: THREE.Box3) => void }) {
  const gltf = useDracoGLTF(ASSETS.models.robot, {
    dracoPath: CFG.decoders.dracoPath,
    meshopt: true,
  });
  const scene = (gltf as any)?.scene as THREE.Object3D | undefined;
  const inited = useRef(false);

  useEffect(() => {
    if (!scene || inited.current) return;
    inited.current = true;

    // Sólo flags y bounds; no tocamos texturas
    scene.traverse((o: THREE.Object3D) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });

    const box = new THREE.Box3().setFromObject(scene);
    onBounds(box);

    return () => {
      scene.traverse((o: THREE.Object3D) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        try {
          mesh.geometry?.dispose();
        } catch { }
        const mats: THREE.Material[] = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m: any) => {
          try {
            m.dispose?.();
          } catch { }
        });
      });
    };
  }, [scene, onBounds]);

  return scene ? <primitive object={scene} position={[0, -0.8, 0]} /> : null;
}

/* ======================= Hero ======================= */
export default function Hero() {
  const dpr = useSafeDpr();
  const reduced = typeof window !== "undefined"
    ? window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    : false;

  // Activa cursor robot en esta pantalla
  useRobotCursor(true);
  const navigate = useNavigate();
  const [positions, setPositions] = useState<any>(null);
  const [screenCoords, setScreenCoords] = useState<any>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const cleanedOnce = useRef(false);

  // Prefetch ligero: calentamos /timeline (cinemática + paneles)
  useEffect(() => {
    import("./Timeline").catch(() => { });
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (cleanedOnce.current) return;
      cleanedOnce.current = true;
      try {
        (glRef.current as any)?.dispose?.();
      } catch { }
      try {
        const canvas = (glRef.current as any)
          ?.domElement as HTMLCanvasElement | undefined;
        canvas?.parentNode?.removeChild?.(canvas);
      } catch { }
      glRef.current = null;
      try {
        THREE.Cache.clear?.();
      } catch { }
    };
  }, []);

  const handleBounds = (box: THREE.Box3) => {
    setPositions({
      head: { y: box.max.y - 0.3 },
      torso: { y: (box.max.y + box.min.y) / 2 + 1.1 },
      legs: { y: box.min.y + 2 },
      shoulders: { y: box.max.y - 0.6 },
      gloves: { y: (box.max.y + box.min.y) / 2 + 0.6 },
      boots: { y: box.min.y + 1.2 },
    });
  };

  // TIMELINE: deja la media al propio Timeline (VRAM friendly)
  const goToTimeline = () => navigate("/timeline");

  const openBlog = () => { };
  const openTestimonials = () => { };
  const openProjects = () => { };
  const openSkills = () => { };
  const openTerminal = () => { };

  // Hover rojo (emisión) + texto rojo, base cyan
  const RED_EMISSION_HOVER: React.CSSProperties = {
    scale: 1.05,
    color: "#ff4040", // texto ROJO en hover
    textShadow: "0 0 12px rgba(255,64,64,.95), 0 0 22px rgba(255,64,64,.85), 0 0 36px rgba(255,64,64,.6)",
    boxShadow: "0 0 28px 8px rgba(255,64,64,.85)",
    backgroundColor: "rgba(40,0,0,.86)",
  };

  return (
    <section aria-label="hero-3d" className="w-full">
      {/* Usamos 100dvh para evitar saltos por barras de navegador en móvil */}
      <div className="w-full h-[100dvh] md:h-[110svh] relative">
        {reduced ? (
          <div className="absolute inset-0 grid place-items-center">
            <img
              src="/assets/img/hero-static.webp"
              alt="Vista previa estática del héroe 3D"
              className="max-h-full max-w-full object-contain"
              decoding="async"
              loading="eager"
            />
          </div>
        ) : (
          <Canvas
            aria-hidden="true"
            frameloop="demand"
            shadows={false}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = false;
              (gl as any).toneMapping = THREE.NoToneMapping;
              (gl as any).outputColorSpace = THREE.SRGBColorSpace;
              (gl as any).autoClear = true;
              glRef.current = gl as any;
            }}
            gl={{
              antialias: false,
              powerPreference: "high-performance",
              alpha: true,
              stencil: false,
              depth: true,
              preserveDrawingBuffer: false,
            }}
            dpr={dpr}
            camera={{ position: [0, 1.5, 9], fov: 40, near: 0.01, far: 100 }}
          >
            <AdaptiveDpr pixelated />
            <PerformanceMonitor onDecline={() => { /* aquí puedes bajar calidad si quieres */ }} />
            <ambientLight intensity={1} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1.2}
              color="#e9eef6"
            />
            <directionalLight
              position={[0, 1.8, -6]}
              intensity={1.3}
              color="#7dd3fc"
              castShadow={false}
            />
            <directionalLight
              position={[-4, 1.2, -3]}
              intensity={0.8}
              color="#ffd166"
              castShadow={false}
            />

            <Suspense fallback={null}>
              <RobotModel onBounds={handleBounds} />
              {positions && (
                <Projector
                  positions={positions}
                  setScreenCoords={setScreenCoords}
                />
              )}
            </Suspense>

            <ControlsDemand />
          </Canvas>
        )}
        {screenCoords && (
          <>
            {/* TIMELINE mantiene hover por defecto (cian) */}
            <FuturisticPanel
              text="TIMELINE"
              ariaLabel="Ir a Timeline"
              style={{ top: screenCoords.head.y - 50, left: "25%" }}
              onClick={goToTimeline}
            />
            <AnimatedLine
              start={screenCoords.head}
              end={screenCoords.head}
              direction="right"
              offsetX={-235}
              offsetY={-50}
            />

            <FuturisticPanel
              text="BLOG TÉCNICO"
              hoverText="EN CONSTRUCCIÓN..."
              hoverStyleOverride={RED_EMISSION_HOVER}
              style={{ top: screenCoords.torso.y, left: "15%" }}
              onClick={openBlog}
            />
            <AnimatedLine
              start={screenCoords.torso}
              end={screenCoords.torso}
              direction="right"
              offsetX={-335}
            />

            <FuturisticPanel
              text="TESTIMONIOS"
              hoverText="EN CONSTRUCCIÓN..."
              hoverStyleOverride={RED_EMISSION_HOVER}
              style={{ top: screenCoords.legs.y + 40, left: "20%" }}
              onClick={openTestimonials}
            />
            <AnimatedLine
              start={screenCoords.legs}
              end={screenCoords.legs}
              direction="right"
              offsetX={-270}
              offsetY={40}
            />

            <FuturisticPanel
              text="PROYECTOS"
              hoverText="EN CONSTRUCCIÓN..."
              hoverStyleOverride={RED_EMISSION_HOVER}
              style={{ top: screenCoords.shoulders.y - 60, right: "20%" }}
              onClick={openProjects}
            />
            <AnimatedLine
              start={screenCoords.shoulders}
              end={screenCoords.shoulders}
              direction="left"
              offsetX={275}
              offsetY={-60}
            />

            <FuturisticPanel
              text="SKILL MAP"
              hoverText="EN CONSTRUCCIÓN..."
              hoverStyleOverride={RED_EMISSION_HOVER}
              style={{ top: screenCoords.gloves.y, right: "15%" }}
              onClick={openSkills}
            />
            <AnimatedLine
              start={screenCoords.gloves}
              end={screenCoords.gloves}
              direction="left"
              offsetX={365}
            />

            <FuturisticPanel
              text="TERMINAL DE CONTACTO"
              hoverText="EN CONSTRUCCIÓN..."
              hoverStyleOverride={RED_EMISSION_HOVER}
              style={{ top: screenCoords.boots.y, right: "15%" }}
              onClick={openTerminal}
            />
            <AnimatedLine
              start={screenCoords.boots}
              end={screenCoords.boots}
              direction="left"
              offsetX={225}
            />
          </>
        )}
      </div>
    </section>
  );
}

// Precarga del GLB con decoders
const __preloadRobot = () =>
  (useDracoGLTF as any).preload(ASSETS.models.robot, {
    dracoPath: CFG.decoders.dracoPath,
    meshopt: true,
  });
if (isKTX2Ready()) {
  __preloadRobot();
} else if (typeof window !== "undefined") {
  window.addEventListener("ktx2-ready", __preloadRobot, { once: true });
}
