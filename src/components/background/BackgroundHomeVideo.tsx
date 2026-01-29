import { useReducedMotion } from "@/hooks/useReducedMotion";

interface BackgroundHomeVideoProps {
  /**
   * Force the video to play even when prefers-reduced-motion is enabled.
   * Use for passive background videos that don't cause vestibular issues.
   * @default true
   */
  forcePlay?: boolean;
}

/**
 * Background video for the Hero section.
 * - Shows looping muted video behind content
 * - Respects reduced-motion unless forcePlay is true
 * - Video is always muted, loops, and doesn't block interactions
 */
export default function BackgroundHomeVideo({
  forcePlay = true,
}: BackgroundHomeVideoProps) {
  const prefersReducedMotion = useReducedMotion();
  const videoSrc = `${import.meta.env.BASE_URL}backgroundHome.mp4`;

  // Determine if video should play:
  // - If forcePlay is true, always show video (background videos are passive)
  // - If forcePlay is false, respect reduced-motion preference
  const showVideo = forcePlay || !prefersReducedMotion;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Static fallback background - always rendered underneath */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate900 via-slate950 to-slate900"
        aria-hidden="true"
      />

      {/* Video layer */}
      {showVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 1 }}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
      )}

      {/* Overlay - darkens video, sits above video but below Hero content */}
      <div
        className="absolute inset-0 bg-slate950/70 pointer-events-none"
        style={{ zIndex: 2 }}
        aria-hidden="true"
      />
    </div>
  );
}
