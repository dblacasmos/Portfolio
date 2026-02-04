import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Experience } from "@/data/experience";

interface TimelineProps {
  items: Experience[];
  className?: string;
}

export default function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-orange500 via-slate700 to-transparent" />

      <div className="space-y-8 md:space-y-12">
        {items.map((item, index) => (
          <TimelineItem key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

interface TimelineItemProps {
  item: Experience;
  index: number;
}

function TimelineItem({ item, index }: TimelineItemProps) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "relative pl-12 md:pl-0 md:w-1/2",
        isEven ? "md:pr-12 md:text-right" : "md:ml-auto md:pl-12"
      )}
    >
      <div
        className={cn(
          "absolute top-1 w-3 h-3 rounded-full bg-orange500 shadow-glow-orange",
          "left-[10px] md:left-auto",
          isEven ? "md:right-[-6px]" : "md:left-[-6px]"
        )}
      />

      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-slate800/50 border border-slate700/50 rounded-xl p-5 backdrop-blur-sm hover:border-orange500/30 transition-colors"
      >
        <span className="text-xs font-mono text-orange500">{item.period}</span>
        <h3 className="mt-1 text-lg font-semibold text-slate50">{item.title}</h3>
        <p className="text-sm text-teal400 font-medium">{item.company}</p>
        <p className="mt-2 text-sm text-slate200">{item.description}</p>
        <p className="mt-1 text-xs text-slate200/60">{item.location}</p>
      </motion.div>
    </motion.div>
  );
}
