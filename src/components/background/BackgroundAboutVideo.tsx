import { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export default function BackgroundAboutVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [containerRef, isInView] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: "100px",
  });
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Check for small screens
  useEffect(() => {
    const checkScreen = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Handle video playback based on visibility and preferences
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Don't autoplay on small screens or if reduced motion is preferred
    if (prefersReducedMotion || isSmallScreen) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    if (isInView && videoLoaded) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView, prefersReducedMotion, isSmallScreen, videoLoaded]);

  // Fallback for autoplay if blocked
  useEffect(() => {
    if (prefersReducedMotion || isSmallScreen) return;

    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      if (isInView && videoLoaded) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("scroll", tryPlay, { once: true });

    return () => {
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("scroll", tryPlay);
    };
  }, [isInView, prefersReducedMotion, isSmallScreen, videoLoaded]);

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
  };

  // Show static background for reduced motion or small screens
  const showStaticBg = prefersReducedMotion || isSmallScreen;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }}>
      {/* Static fallback background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate900 via-slate950 to-slate900"
        aria-hidden="true"
      />

      {/* Video layer - only render if not preferring reduced motion */}
      {!showStaticBg && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          src="/backgroundAbout.mp4"
          muted
          playsInline
          loop
          preload="none"
          onCanPlayThrough={handleVideoLoaded}
          aria-hidden="true"
        />
      )}

      {/* Overlay layer - above video, below content (softer than Home) */}
      <div
        className="absolute inset-0 bg-slate950/80 pointer-events-none"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      />
    </div>
  );
}
