import { motion } from "framer-motion";
import { Lightbulb, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStudyCallout } from "@/types/caseStudy";

interface CalloutProps extends CaseStudyCallout {
  className?: string;
}

const calloutConfig = {
  decisions: {
    icon: Lightbulb,
    bgColor: "bg-orange500/5",
    borderColor: "border-orange500/20",
    iconColor: "text-orange500",
    bulletColor: "bg-orange500",
  },
  "didnt-do": {
    icon: XCircle,
    bgColor: "bg-slate700/20",
    borderColor: "border-slate600/30",
    iconColor: "text-slate200",
    bulletColor: "bg-slate200/60",
  },
};

export default function Callout({
  title,
  items,
  type,
  className,
}: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative rounded-2xl border p-6 md:p-8",
        config.bgColor,
        config.borderColor,
        className
      )}
      role="complementary"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl",
            type === "decisions" ? "bg-orange500/10" : "bg-slate700/50"
          )}
        >
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-slate50">{title}</h3>
      </div>

      {/* Items */}
      <ul className="space-y-3">
        {items.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            <span
              className={cn(
                "flex-shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full",
                config.bulletColor
              )}
            />
            <span className="text-slate200 leading-relaxed">{item}</span>
          </motion.li>
        ))}
      </ul>

      {/* Decorative element for decisions type */}
      {type === "decisions" && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange500/5 to-transparent rounded-tr-2xl pointer-events-none" />
      )}
    </motion.aside>
  );
}

// Compact version for inline use
export function CalloutCompact({
  title,
  items,
  type,
  className,
}: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = type === "decisions" ? CheckCircle : XCircle;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", config.iconColor)} />
        <span className="text-sm font-medium text-slate50">{title}</span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-slate200/80">
            <span className="text-slate200/40 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
