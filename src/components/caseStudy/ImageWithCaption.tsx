import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CaseStudyImage } from "@/types/caseStudy";

interface ImageWithCaptionProps extends CaseStudyImage {
  priority?: boolean;
  className?: string;
  aspectRatio?: "auto" | "16/10" | "16/9" | "4/3";
}

// Helper to detect video files
function isVideoFile(src: string): boolean {
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov"];
  return videoExtensions.some((ext) => src.toLowerCase().endsWith(ext));
}

export default function ImageWithCaption({
  src,
  alt,
  caption,
  priority = false,
  className,
  aspectRatio = "16/10",
}: ImageWithCaptionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  const isVideo = isVideoFile(src);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const aspectRatioClass = {
    auto: "",
    "16/10": "aspect-[16/10]",
    "16/9": "aspect-video",
    "4/3": "aspect-[4/3]",
  }[aspectRatio];

  return (
    <figure className={cn("group", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-xl bg-slate800/50 border border-slate700/50",
          aspectRatioClass
        )}
      >
        {/* Skeleton loader */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate800 via-slate700 to-slate800 animate-pulse" />
        )}

        {/* Video or Image */}
        {isInView && isVideo ? (
          <motion.video
            src={src}
            controls
            playsInline
            muted
            preload="metadata"
            onLoadedData={() => setIsLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full object-contain"
          >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
          </motion.video>
        ) : isInView ? (
          <motion.img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setIsLoaded(true)}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{
              opacity: isLoaded ? 1 : 0,
              scale: isLoaded ? 1 : 1.02,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "w-full h-full object-contain p-2",
              "transition-transform duration-500 group-hover:scale-[1.02]"
            )}
          />
        ) : null}

        {/* Gradient overlay on hover (only for images) */}
        {!isVideo && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption className="mt-3 text-sm text-slate200/70 text-center leading-relaxed px-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
