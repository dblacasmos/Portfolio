import { motion } from "framer-motion";
import { Github, ExternalLink, FileText, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStudyLink } from "@/types/caseStudy";

interface CaseStudyLinksProps {
  links: CaseStudyLink[];
  className?: string;
}

const iconMap = {
  github: Github,
  external: ExternalLink,
  docs: FileText,
};

const variantStyles = {
  primary:
    "bg-gradient-to-r from-orange500 to-orange600 text-slate50 hover:from-orange600 hover:to-orange500 shadow-glow-orange hover:shadow-glow-orange-lg border-transparent",
  secondary:
    "bg-slate800 text-slate50 hover:bg-slate700 border-slate700 hover:border-slate600",
  outline:
    "bg-transparent text-slate200 hover:text-slate50 border-slate700 hover:border-slate600 hover:bg-slate800/50",
};

export default function CaseStudyLinks({
  links,
  className,
}: CaseStudyLinksProps) {
  return (
    <section
      id="links"
      className={cn("scroll-mt-24", className)}
      aria-labelledby="links-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Section Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-orange500/70">Links</span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate700/50 to-transparent max-w-16" />
          </div>
          <h2
            id="links-title"
            className="text-2xl md:text-3xl font-bold text-slate50"
          >
            Resources & Code
          </h2>
        </header>

        {/* Links Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link, index) => {
            const Icon = iconMap[link.icon || "external"];
            const variant = link.variant || "secondary";

            return (
              <motion.a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 focus-ring",
                  variantStyles[variant]
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    variant === "primary"
                      ? "bg-white/10"
                      : "bg-slate700/50 group-hover:bg-slate600/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label */}
                <div className="flex-grow min-w-0">
                  <span className="font-medium">{link.label}</span>
                </div>

                {/* Arrow */}
                <ArrowUpRight
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform",
                    "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                    variant === "primary"
                      ? "text-white/70"
                      : "text-slate200/50 group-hover:text-slate200"
                  )}
                />
              </motion.a>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
