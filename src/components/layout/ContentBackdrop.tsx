import { cn } from "@/lib/utils";

// ============================================================================
// ContentBackdrop
// ============================================================================
// A wrapper component that adds a subtle backdrop behind content areas
// to ensure readability over the background video.
//
// Usage:
//   <ContentBackdrop>
//     <YourContent />
//   </ContentBackdrop>
//
// Or with custom intensity:
//   <ContentBackdrop intensity="heavy">...</ContentBackdrop>
// ============================================================================

interface ContentBackdropProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Backdrop intensity:
   * - "light": Subtle darkening, video still visible
   * - "medium": Moderate darkening (default)
   * - "heavy": Strong darkening for dense content
   * - "none": No backdrop (pass-through)
   */
  intensity?: "none" | "light" | "medium" | "heavy";
  /**
   * Whether to add blur effect
   */
  blur?: boolean;
  /**
   * HTML element to render as
   */
  as?: "div" | "section" | "article" | "aside";
}

const intensityClasses = {
  none: "",
  light: "bg-slate950/40",
  medium: "bg-slate950/60",
  heavy: "bg-slate950/80",
};

export default function ContentBackdrop({
  children,
  className,
  intensity = "medium",
  blur = false,
  as: Component = "div",
}: ContentBackdropProps) {
  if (intensity === "none") {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <Component
      className={cn(
        "relative",
        intensityClasses[intensity],
        blur && "backdrop-blur-sm",
        className
      )}
    >
      {children}
    </Component>
  );
}
