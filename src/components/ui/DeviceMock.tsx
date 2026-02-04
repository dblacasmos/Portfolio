import { cn } from "@/lib/utils";

interface DeviceMockProps {
  /** The image to display inside the laptop screen */
  src: string;
  alt: string;
  className?: string;
  /** Whether to use contain (show full image) or cover (fill screen) */
  objectFit?: "contain" | "cover";
}

/**
 * DeviceMock Component
 *
 * Displays an image inside a laptop frame mockup.
 * The screen area is positioned based on the laptop.jpg dimensions.
 *
 * Laptop frame specifications (based on laptop.jpg):
 * - Frame aspect ratio: approximately 16:10
 * - Screen area: positioned with CSS to align with the actual screen in the image
 *
 * Uses mix-blend-mode: multiply to make the white background of the laptop
 * frame transparent when overlaid on dark backgrounds.
 */
export default function DeviceMock({
  src,
  alt,
  className,
  objectFit = "contain",
}: DeviceMockProps) {
  return (
    <div
      className={cn(
        "relative w-full",
        // Aspect ratio matches the laptop frame
        "aspect-[16/10]",
        className
      )}
    >
      {/* Screen content layer (behind the frame) */}
      <div
        className={cn(
          "absolute",
          // Position the screen content area to match laptop screen
          // These values are calibrated for laptop.jpg
          "top-[6%] left-[11.5%] right-[11.5%] bottom-[14%]",
          "overflow-hidden rounded-sm bg-slate900"
        )}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full",
            objectFit === "contain" ? "object-contain" : "object-cover"
          )}
        />
        {/* Subtle screen reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Laptop frame overlay */}
      <img
        src="/laptop.jpg"
        alt=""
        aria-hidden="true"
        className={cn(
          "absolute inset-0 w-full h-full object-contain pointer-events-none",
          // Mix-blend-mode multiply makes white transparent on dark backgrounds
          "mix-blend-multiply dark:mix-blend-multiply"
        )}
      />

      {/* Optional: Add a subtle shadow beneath the laptop */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-slate950/30 blur-xl rounded-full" />
    </div>
  );
}

/**
 * Simplified device mock that shows image in a screen-like frame
 * without needing the laptop.jpg asset
 */
export function SimpleDeviceMock({
  src,
  alt,
  className,
  objectFit = "contain",
}: DeviceMockProps) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[16/10] rounded-lg overflow-hidden",
        "bg-slate800 border border-slate700/50",
        // Screen bezel effect
        "p-2 sm:p-3",
        className
      )}
    >
      {/* Screen notch/camera indicator */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate700 rounded-full" />

      {/* Screen area */}
      <div className="relative w-full h-full rounded overflow-hidden bg-slate900">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full",
            objectFit === "contain" ? "object-contain" : "object-cover"
          )}
        />
        {/* Screen reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Bottom bar (keyboard representation) */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-slate700/50 to-transparent" />
    </div>
  );
}
