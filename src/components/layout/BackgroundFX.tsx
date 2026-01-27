import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function BackgroundFX() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base background */}
      <div className="absolute inset-0 bg-slate950" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-orange500/10 blur-[128px]"
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, 50, 0],
                y: [0, 30, 0],
              }
        }
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-teal400/10 blur-[128px]"
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, -50, 0],
                y: [0, -30, 0],
              }
        }
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange600/5 blur-[200px]"
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
              }
        }
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Premium noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: 'url("/noise.png")',
          backgroundRepeat: "repeat",
        }}
        aria-hidden="true"
      />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
