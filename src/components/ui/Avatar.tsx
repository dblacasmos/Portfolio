import { cn } from "@/lib/utils";

interface AvatarProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "hero";
  className?: string;
  priority?: boolean;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
  "2xl": "w-40 h-40",
  // Hero size: matches combined height of title + subtitle + paragraph
  hero: "w-64 h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80",
};

export default function Avatar({
  src,
  alt,
  size = "md",
  className,
  priority = false,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-slate800 ring-2 ring-slate700/50",
        "before:absolute before:inset-0 before:rounded-full before:shadow-inner before:shadow-slate950/20 before:z-10",
        sizeClasses[size],
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="w-full h-full object-cover"
        // Prevent layout shift with aspect ratio
        style={{ aspectRatio: "1 / 1" }}
      />
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate950/10 via-transparent to-white/5 pointer-events-none" />
    </div>
  );
}
