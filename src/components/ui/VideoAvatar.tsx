import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// CONSTANTS
// =============================================================================
const STORAGE_KEY = "hero_video_played_v1";
const VIDEO_SRC = "/videoAvatar.mp4";
const AVATAR_SRC = "/avatar.webp";
const CROSSFADE_DURATION = 0.35;

// Size classes for the inner content (video/avatar)
const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
  "2xl": "w-40 h-40",
  hero: "w-64 h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80",
};

// =============================================================================
// TYPES
// =============================================================================
interface VideoAvatarProps {
  /** Alt text for accessibility */
  alt: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "hero";
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Whether to load eagerly */
  priority?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================
function hasVideoPlayed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markVideoPlayed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Ignore storage errors
  }
}

// DEV: Allow resetting via URL param ?resetVideo=1
function checkResetParam(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("resetVideo") === "1") {
      sessionStorage.removeItem(STORAGE_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("resetVideo");
      window.history.replaceState({}, "", url.toString());
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

// =============================================================================
// COMPONENT
// =============================================================================
export default function VideoAvatar({
  alt,
  size = "md",
  className,
  priority = false,
}: VideoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const initRef = useRef(false);

  // Check for reset param on mount
  const [shouldPlayVideo] = useState(() => {
    checkResetParam();
    return !hasVideoPlayed();
  });

  // Video is playing: video opacity 1, avatar opacity 0
  // Video not playing: video opacity 0, avatar opacity 1
  const [isPlaying, setIsPlaying] = useState(shouldPlayVideo);

  // Freeze video on last frame
  const freezeOnLastFrame = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration) {
      video.pause();
      video.currentTime = video.duration - 0.001;
    }
  }, []);

  // Handle video end - freeze on last frame, crossfade to avatar
  const handleEnded = useCallback(() => {
    freezeOnLastFrame();
    markVideoPlayed();
    setIsPlaying(false);
  }, [freezeOnLastFrame]);

  // Handle video error - show avatar instead
  const handleError = useCallback(() => {
    console.warn("[VideoAvatar] Video failed to load, showing avatar");
    markVideoPlayed();
    setIsPlaying(false);
  }, []);

  // Initialize video playback
  useEffect(() => {
    if (initRef.current) return;
    if (!shouldPlayVideo) return;

    const video = videoRef.current;
    if (!video) return;

    const tryPlay = async () => {
      initRef.current = true;
      try {
        await video.play();
      } catch (err) {
        console.warn("[VideoAvatar] Autoplay failed:", err);
        markVideoPlayed();
        setIsPlaying(false);
      }
    };

    // Wait for canplay event before attempting playback
    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("canplay", tryPlay);
    };
  }, [shouldPlayVideo]);

  return (
    // Outer wrapper with padding creates the border effect
    <div
      className={cn(
        "relative p-1 rounded-3xl bg-gradient-to-br from-slate700/50 to-slate800/50",
        className
      )}
    >
      {/* Inner container for video/avatar with exact size */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden bg-slate800",
          sizeClasses[size]
        )}
      >
        {/* Avatar layer - always mounted, fades in when video stops */}
        <motion.img
          src={AVATAR_SRC}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          initial={{ opacity: isPlaying ? 0 : 1 }}
          animate={{ opacity: isPlaying ? 0 : 1 }}
          transition={{ duration: CROSSFADE_DURATION }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ aspectRatio: "1 / 1" }}
        />

        {/* Video layer - always mounted, fades out when video ends */}
        <motion.video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          onEnded={handleEnded}
          onError={handleError}
          initial={{ opacity: isPlaying ? 1 : 0 }}
          animate={{ opacity: isPlaying ? 1 : 0 }}
          transition={{ duration: CROSSFADE_DURATION }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ aspectRatio: "1 / 1" }}
          aria-label={alt}
        />

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate950/10 via-transparent to-white/5 pointer-events-none z-10" />
      </div>
    </div>
  );
}
