import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "secondary" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate700/50 text-slate200 border-slate700",
  primary: "bg-orange500/10 text-orange500 border-orange500/30",
  secondary: "bg-teal400/10 text-teal400 border-teal400/30",
  outline: "bg-transparent text-slate200 border-slate700",
};

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.span>
  );
}
