import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className,
  hover = true,
  onClick,
}: CardProps) {
  const Component = hover ? motion.div : "div";

  const hoverProps = hover
    ? {
        whileHover: {
          y: -4,
          boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4)",
        },
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }
    : {};

  return (
    <Component
      onClick={onClick}
      className={cn(
        "relative bg-slate800/50 border border-slate700/50 rounded-xl p-6 backdrop-blur-sm",
        "transition-colors duration-200",
        hover && "hover:border-orange500/30 hover:bg-slate800/70 cursor-pointer",
        className
      )}
      {...hoverProps}
    >
      {children}
    </Component>
  );
}
