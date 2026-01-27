import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Wheel delta to video time conversion factor
  // Lower = slower video advance per scroll
  wheelSensitivity: 0.001,

  // Maximum seconds to advance per frame (prevents huge jumps)
  maxDeltaPerFrame: 0.1,

  // Milliseconds after last wheel event before video "pauses"
  scrollIdleTimeout: 150,

  // Smoothing factor for time interpolation (0-1, lower = smoother)
  timeLerp: 0.12,

  // Fallback background color
  fallbackBg: "#020617", // slate-950
};

// ============================================================================
// Component
// ============================================================================

interface BackgroundScrollVideoProps {
  src: string;
  className?: string;
}

export default function BackgroundScrollVideo({
  src,
  className = "",
}: BackgroundScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation state (refs to avoid re-renders)
  const animationRef = useRef<number>(0);
  const targetTime = useRef<number>(0);
  const currentTime = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);
  const videoDuration = useRef<number>(0);

  // React state only for UI changes
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Handle wheel events - accumulate delta
  const handleWheel = useCallback((e: WheelEvent) => {
    if (videoDuration.current <= 0) return;

    // Convert wheel delta to time delta
    const deltaSeconds = e.deltaY * CONFIG.wheelSensitivity;

    // Clamp to prevent huge jumps
    const clampedDelta = Math.max(
      -CONFIG.maxDeltaPerFrame,
      Math.min(CONFIG.maxDeltaPerFrame, deltaSeconds)
    );

    // Accumulate target time
    targetTime.current += clampedDelta;

    // Wrap around for infinite loop (keep positive)
    while (targetTime.current < 0) {
      targetTime.current += videoDuration.current;
    }
    while (targetTime.current >= videoDuration.current) {
      targetTime.current -= videoDuration.current;
    }

    // Mark as actively scrolling
    lastWheelTime.current = performance.now();
    isScrolling.current = true;
  }, []);

  // Main effect: setup video and animation loop
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Static frame for reduced motion users
      video.currentTime = 0;
      container.style.opacity = "0.3";
      return;
    }

    // Video metadata handler
    const handleLoadedMetadata = () => {
      videoDuration.current = video.duration;
      currentTime.current = 0;
      targetTime.current = 0;
      video.currentTime = 0;
    };

    // Video ready handler
    const handleCanPlay = () => {
      setVideoReady(true);
    };

    // Video error handler
    const handleError = () => {
      setVideoError(true);
      console.warn("[BackgroundScrollVideo] Failed to load video:", src);
    };

    // Setup video
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplaythrough", handleCanPlay);
    video.addEventListener("error", handleError);
    video.muted = true;
    video.playsInline = true;
    video.pause();

    // If metadata already loaded
    if (video.duration && !isNaN(video.duration)) {
      videoDuration.current = video.duration;
    }

    // Animation loop
    const animate = () => {
      const now = performance.now();
      const timeSinceLastWheel = now - lastWheelTime.current;

      // Check if still scrolling (within idle timeout)
      if (timeSinceLastWheel > CONFIG.scrollIdleTimeout) {
        isScrolling.current = false;
      }

      // Only update video time if we have valid duration
      if (videoDuration.current > 0) {
        // Smooth interpolation toward target
        const diff = targetTime.current - currentTime.current;

        // Handle wrap-around edge case
        let adjustedDiff = diff;
        if (Math.abs(diff) > videoDuration.current / 2) {
          // We're closer going the other way around
          if (diff > 0) {
            adjustedDiff = diff - videoDuration.current;
          } else {
            adjustedDiff = diff + videoDuration.current;
          }
        }

        // Apply lerp (smoother when scrolling, snappier when idle)
        const lerpFactor = isScrolling.current
          ? CONFIG.timeLerp
          : CONFIG.timeLerp * 2;
        currentTime.current += adjustedDiff * lerpFactor;

        // Wrap current time
        while (currentTime.current < 0) {
          currentTime.current += videoDuration.current;
        }
        while (currentTime.current >= videoDuration.current) {
          currentTime.current -= videoDuration.current;
        }

        // Apply to video (only if meaningful change)
        if (Math.abs(video.currentTime - currentTime.current) > 0.01) {
          video.currentTime = currentTime.current;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);

    // Add wheel listener
    window.addEventListener("wheel", handleWheel, { passive: true });

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("wheel", handleWheel);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplaythrough", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [src, handleWheel]);

  // Don't render if video failed
  if (videoError) {
    return (
      <div
        className={`fixed inset-0 -z-30 ${className}`}
        style={{ backgroundColor: CONFIG.fallbackBg }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-30 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Fallback background color */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: CONFIG.fallbackBg }}
      />

      {/* Video element */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        src={src}
        muted
        playsInline
        preload="auto"
        // No loop - we handle wrapping manually
      />

      {/* Subtle vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, ${CONFIG.fallbackBg}40 70%, ${CONFIG.fallbackBg}90 100%)`,
        }}
      />
    </div>
  );
}
