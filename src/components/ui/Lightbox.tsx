import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export default function Lightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Project image",
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goNext = useCallback(() => {
    setIsLoading(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIsLoading(true);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goNext, goPrev]);

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate950/95 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-3 text-slate200 hover:text-slate50 bg-slate800/80 hover:bg-slate700 rounded-full transition-all duration-200 focus-ring"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 z-10 p-3 text-slate200 hover:text-slate50 bg-slate800/80 hover:bg-slate700 rounded-full transition-all duration-200 focus-ring"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main image container */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={images[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl",
                "transition-opacity duration-200",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </motion.div>

          {/* Navigation - Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 z-10 p-3 text-slate200 hover:text-slate50 bg-slate800/80 hover:bg-slate700 rounded-full transition-all duration-200 focus-ring"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate800/80 backdrop-blur-sm rounded-xl">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLoading(true);
                    setCurrentIndex(index);
                  }}
                  className={cn(
                    "relative w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 focus-ring",
                    index === currentIndex
                      ? "ring-2 ring-orange500 scale-110"
                      : "opacity-60 hover:opacity-100"
                  )}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Image counter */}
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-slate800/80 backdrop-blur-sm rounded-full text-sm text-slate200 font-mono">
            {currentIndex + 1} / {images.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Thumbnail button component for triggering lightbox
interface GalleryThumbnailProps {
  src: string;
  alt?: string;
  onClick: () => void;
  className?: string;
}

export function GalleryThumbnail({
  src,
  alt = "Gallery image",
  onClick,
  className,
}: GalleryThumbnailProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-slate800 focus-ring",
        "transition-all duration-200",
        className
      )}
      aria-label={`View ${alt}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-slate950/0 group-hover:bg-slate950/40 transition-colors duration-200 flex items-center justify-center">
        <ZoomIn className="w-6 h-6 text-slate50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </motion.button>
  );
}
