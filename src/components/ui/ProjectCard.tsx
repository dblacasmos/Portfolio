import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Badge from "./Badge";
import type { Project } from "@/data/projects";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  selectedTags?: string[];
  className?: string;
  featured?: boolean;
}

export default function ProjectCard({
  project,
  onClick,
  selectedTags = [],
  className,
  featured = false,
}: ProjectCardProps) {
  const hasCover = !!project.cover;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer",
        "bg-slate800/40 border border-slate700/50 backdrop-blur-sm",
        "hover:border-orange500/40 hover:bg-slate800/60",
        "transition-colors duration-250",
        "focus-within:ring-2 focus-within:ring-orange500 focus-within:ring-offset-2 focus-within:ring-offset-slate950",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${project.title}`}
    >
      {/* Cover Image */}
      {hasCover && (
        <div className="relative aspect-[16/9] overflow-hidden bg-slate900">
          <img
            src={project.cover}
            alt={`${project.title} cover`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate900/90 via-slate900/20 to-transparent" />

          {/* Hover indicator */}
          <div className="absolute top-4 right-4 p-2 bg-slate950/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ArrowUpRight className="w-4 h-4 text-slate50" />
          </div>

          {/* Tags overlay on image (featured cards) */}
          {featured && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium bg-slate950/70 backdrop-blur-sm text-slate200 rounded-md"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate950/70 backdrop-blur-sm text-slate200/60 rounded-md">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn("flex flex-col flex-grow p-5", !hasCover && "pt-6")}>
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate50 mb-2 line-clamp-2 group-hover:text-orange300 transition-colors duration-200">
          {project.title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-slate200/60 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {project.period}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {project.location}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate200/80 mb-4 line-clamp-2 flex-grow">
          {project.description}
        </p>

        {/* Tags (non-featured or no cover) */}
        {(!featured || !hasCover) && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "primary" : "default"}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* View details indicator */}
        <div className="mt-4 pt-4 border-t border-slate700/50 flex items-center justify-between">
          <span className="text-sm font-medium text-orange500 group-hover:text-orange300 transition-colors duration-200">
            View details
          </span>
          <ArrowUpRight className="w-4 h-4 text-orange500 group-hover:text-orange300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
        </div>
      </div>
    </motion.article>
  );
}
