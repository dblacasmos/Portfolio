import { useEffect, useRef, useCallback, useState } from "react";

// CONFIGURATION

const CONFIG = {
  // Scroll-to-video-time mapping (pixels of scroll per second of video)
  pixelsPerSecond: 400,
  // Smoothing for video time interpolation (0-1, lower = smoother)
  timeLerp: 0.08,
  // Opacity when in hero section (full visibility)
  heroOpacity: 0.5,
  // Opacity when inside content sections (dimmed for readability)
  sectionOpacity: 0.15,
  // Transition duration for opacity changes (ms)
  opacityTransition: 500,
};

// COMPONENT

interface ScrollVideoProps {
  src: string;
  className?: string;
}

export default function ScrollVideo({ src, className = "" }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const targetTime = useRef<number>(0);
  const currentOpacity = useRef<number>(CONFIG.heroOpacity);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Check if viewport center is inside a content section (not hero)
  const getTargetOpacity = useCallback((): number => {
    const sections = document.querySelectorAll("section:not(#hero)");
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const viewportCenter = scrollY + viewportHeight / 2;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = scrollY + rect.top;
      const sectionBottom = sectionTop + rect.height;

      if (viewportCenter >= sectionTop && viewportCenter <= sectionBottom) {
        return CONFIG.sectionOpacity;
      }
    }

    return CONFIG.heroOpacity;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      video.currentTime = 0;
      container.style.opacity = "0.1";
      return;
    }

    // Video event handlers
    const handleCanPlay = () => {
      setVideoReady(true);
    };

    const handleError = () => {
      setVideoError(true);
      console.warn("[ScrollVideo] Failed to load video:", src);
    };

    video.addEventListener("canplaythrough", handleCanPlay);
    video.addEventListener("error", handleError);

    // Initialize video
    video.muted = true;
    video.playsInline = true;
    video.pause();

    // Animation loop for smooth video scrubbing and opacity
    let lastScrollY = window.scrollY;

    const animate = () => {
      if (!video.duration || isNaN(video.duration)) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate target time based on scroll position
      const scrollY = window.scrollY;
      const scrollDelta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      // Accumulate time based on scroll (infinite looping via modulo)
      if (scrollDelta !== 0) {
        targetTime.current += scrollDelta / CONFIG.pixelsPerSecond;

        // Keep targetTime positive for clean modulo
        while (targetTime.current < 0) {
          targetTime.current += video.duration;
        }
      }

      // Calculate actual target with modulo for infinite loop
      const loopedTarget = targetTime.current % video.duration;

      // Smooth interpolation to target time
      const currentTime = video.currentTime;
      let diff = loopedTarget - currentTime;

      // Handle wrap-around at loop boundary
      if (Math.abs(diff) > video.duration / 2) {
        diff = diff > 0 ? diff - video.duration : diff + video.duration;
      }

      // Apply lerp
      const newTime = currentTime + diff * CONFIG.timeLerp;

      // Ensure valid time and apply
      video.currentTime = ((newTime % video.duration) + video.duration) % video.duration;

      // Smooth opacity transitions
      const targetOpacity = getTargetOpacity();
      if (Math.abs(currentOpacity.current - targetOpacity) > 0.01) {
        currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.05;
        container.style.opacity = String(currentOpacity.current);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      video.removeEventListener("canplaythrough", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [src, getTargetOpacity]);

  // Don't render if video failed to load
  if (videoError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-20 overflow-hidden pointer-events-none ${className}`}
      style={{
        opacity: CONFIG.heroOpacity,
        transition: `opacity ${CONFIG.opacityTransition}ms ease-out`,
      }}
      aria-hidden="true"
    >
      {/* Fallback background color */}
      <div className="absolute inset-0 bg-slate950" />

      {/* Video element */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        src={src}
        muted
        playsInline
        loop
        preload="auto"
      />

      {/* Gradient overlays for depth and readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate950/30 via-transparent to-slate950/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate950/20 via-transparent to-slate950/20" />
    </div>
  );
}
