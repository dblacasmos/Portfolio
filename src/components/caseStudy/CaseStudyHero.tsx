import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { CaseStudyImage } from "@/types/caseStudy";

interface CaseStudyHeroProps {
  title: string;
  subtitle: string;
  roles: string[];
  stack: string[];
  heroImage: CaseStudyImage;
  className?: string;
}

export default function CaseStudyHero({
  title,
  subtitle,
  roles,
  stack,
  heroImage,
  className,
}: CaseStudyHeroProps) {
  const navigate = useNavigate();

  return (
    <header className={cn("relative", className)}>
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <button
          onClick={() => navigate("/projects")}
          className="group inline-flex items-center gap-2 text-sm text-slate200/70 hover:text-orange500 transition-colors focus-ring rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Projects</span>
        </button>
      </motion.div>

      {/* Title and Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-4xl mb-8"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate50 leading-tight mb-6">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-slate200/80 leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      {/* Roles and Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap gap-6 mb-12"
      >
        {/* Role */}
        <div>
          <span className="block text-xs font-medium text-slate200/50 uppercase tracking-wider mb-2">
            Role
          </span>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stack */}
        <div>
          <span className="block text-xs font-medium text-slate200/50 uppercase tracking-wider mb-2">
            Stack
          </span>
          <div className="flex flex-wrap gap-2">
            {stack.map((tech) => (
              <Badge key={tech} variant="primary">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Hero Image - Full Width */}
      <motion.figure
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-16 2xl:-mx-24"
      >
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-slate800 to-slate900 border border-slate700/50">
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate950/80 to-transparent pointer-events-none z-10" />

          {/* Image */}
          <img
            src={heroImage.src}
            alt={heroImage.alt}
            loading="eager"
            className="w-full h-auto object-contain aspect-[16/9] p-4 md:p-8"
          />
        </div>

        {/* Caption if provided */}
        {heroImage.caption && (
          <figcaption className="mt-4 text-center text-sm text-slate200/60 px-4">
            {heroImage.caption}
          </figcaption>
        )}
      </motion.figure>
    </header>
  );
}
