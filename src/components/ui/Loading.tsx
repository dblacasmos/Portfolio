import { motion } from "framer-motion";

interface LoadingProps {
  fullScreen?: boolean;
}

export default function Loading({ fullScreen = true }: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-screen" : "min-h-[200px]"
      } bg-slate950`}
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <motion.div
          className="w-12 h-12 border-4 border-slate700 border-t-orange500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <span className="text-slate200 text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}
