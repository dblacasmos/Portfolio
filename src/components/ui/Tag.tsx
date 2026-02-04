import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Tag({ children, active, onClick, className }: TagProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 focus-ring",
        active
          ? "bg-orange500 text-slate50 border-orange500 shadow-glow-orange"
          : "bg-slate800/50 text-slate200 border-slate700 hover:border-slate200/30 hover:text-slate50",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
