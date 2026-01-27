import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Calendar,
  MapPin,
  X,
  Github,
  ExternalLink,
  FileText,
  Play,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import Container from "@/components/layout/Container";
import Badge from "@/components/ui/Badge";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { projects, allTags, type Project } from "@/data/projects";


// Animation Variants


const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const previewVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};


// Main Projects Page


export default function Projects() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<Project>(projects[0]);
  const [spotlightProject, setSpotlightProject] = useState<Project | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.title = "Projects | David Blanco Casasola";
  }, []);

  const filteredProjects = useMemo(() => {
    if (selectedTags.length === 0) return projects;
    return projects.filter((project) =>
      selectedTags.some((tag) => project.tags.includes(tag))
    );
  }, [selectedTags]);

  // Reset active project when filters change
  useEffect(() => {
    if (filteredProjects.length > 0 && !filteredProjects.includes(activeProject)) {
      setActiveProject(filteredProjects[0]);
    }
  }, [filteredProjects, activeProject]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => setSelectedTags([]);

  const handleProjectHover = useCallback((project: Project) => {
    setActiveProject(project);
  }, []);

  const handleProjectClick = useCallback((project: Project) => {
    setSpotlightProject(project);
  }, []);

  return (
    <LayoutGroup>
      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
        className="pt-24 pb-16 min-h-screen"
      >
        <Container>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate50">
              All <span className="text-gradient">Projects</span>
            </h1>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Explore my complete portfolio of data science and software
              development projects
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.1, duration: reducedMotion ? 0 : 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider">
                Filter by Technology
              </h2>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-orange500 hover:text-orange300 transition-colors duration-200"
                >
                  Clear ({selectedTags.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Tag
                  key={tag}
                  active={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </motion.div>

          {/* Main Content: Split Layout */}
          {filteredProjects.length > 0 ? (
            <div className="grid lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] gap-8">
              {/* Left: Project List */}
              <div className="space-y-3">
                {filteredProjects.map((project, index) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    isActive={activeProject.id === project.id}
                    index={index}
                    onHover={handleProjectHover}
                    onClick={handleProjectClick}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>

              {/* Right: Sticky Preview (Desktop only) */}
              <div className="hidden lg:block">
                <div className="sticky top-28">
                  <AnimatePresence mode="wait">
                    <StickyPreview
                      key={activeProject.id}
                      project={activeProject}
                      onExpand={() => setSpotlightProject(activeProject)}
                      reducedMotion={reducedMotion}
                    />
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState onClear={clearFilters} />
          )}
        </Container>

        {/* Spotlight Modal */}
        <AnimatePresence>
          {spotlightProject && (
            <SpotlightModal
              project={spotlightProject}
              onClose={() => setSpotlightProject(null)}
              reducedMotion={reducedMotion}
            />
          )}
        </AnimatePresence>
      </motion.main>
    </LayoutGroup>
  );
}


// Project List Item


interface ProjectListItemProps {
  project: Project;
  isActive: boolean;
  index: number;
  onHover: (project: Project) => void;
  onClick: (project: Project) => void;
  reducedMotion: boolean;
}

function ProjectListItem({
  project,
  isActive,
  index,
  onHover,
  onClick,
  reducedMotion,
}: ProjectListItemProps) {
  return (
    <motion.article
      layoutId={`project-card-${project.id}`}
      custom={index}
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      whileHover={reducedMotion ? {} : { x: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onMouseEnter={() => onHover(project)}
      onFocus={() => onHover(project)}
      onClick={() => onClick(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(project);
        }
      }}
      className={cn(
        "group relative flex gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
        "border backdrop-blur-sm",
        isActive
          ? "bg-slate800/70 border-orange500/50 shadow-lg shadow-orange500/5"
          : "bg-slate800/30 border-slate700/50 hover:bg-slate800/50 hover:border-slate700"
      )}
      role="button"
      tabIndex={0}
      aria-label={`View ${project.title}`}
      aria-current={isActive ? "true" : undefined}
    >
      {/* Thumbnail */}
      {project.cover && (
        <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-slate800 to-slate900">
          <img
            src={project.cover}
            alt=""
            className="w-full h-full object-contain p-1"
            loading="lazy"
          />
          <div className={cn(
            "absolute inset-0 transition-colors duration-200",
            isActive ? "bg-orange500/10" : "bg-transparent"
          )} />
        </div>
      )}

      {/* Content */}
      <div className="flex-grow min-w-0">
        <h3 className={cn(
          "font-semibold text-base mb-1 line-clamp-1 transition-colors duration-200",
          isActive ? "text-orange300" : "text-slate50 group-hover:text-orange300"
        )}>
          {project.title}
        </h3>
        <p className="text-sm text-slate200/70 line-clamp-2 mb-2">
          {project.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-slate200/50">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {project.period.split(" – ")[0]}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {project.location.split(",")[0]}
          </span>
        </div>
      </div>

      {/* Arrow indicator */}
      <div className={cn(
        "flex-shrink-0 self-center transition-all duration-200",
        isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0"
      )}>
        <ArrowUpRight className="w-5 h-5 text-orange500" />
      </div>

      {/* Active indicator line */}
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-3 bottom-3 w-1 bg-orange500 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.article>
  );
}


// Sticky Preview Panel


interface StickyPreviewProps {
  project: Project;
  onExpand: () => void;
  reducedMotion: boolean;
}

function StickyPreview({ project, onExpand, reducedMotion }: StickyPreviewProps) {
  const navigate = useNavigate();
  const hasLinks = project.links && Object.keys(project.links).length > 0;
  const hasCaseStudy = !!project.caseStudySlug;

  return (
    <motion.div
      variants={previewVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-slate800/50 border border-slate700/50 rounded-2xl overflow-hidden backdrop-blur-sm"
    >
      {/* Cover Image */}
      {project.cover && (
        <div
          className="relative aspect-[16/10] overflow-hidden cursor-pointer group bg-gradient-to-br from-slate800 to-slate900"
          onClick={onExpand}
        >
          <img
            src={project.cover}
            alt={`${project.title} preview`}
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate900/90 via-transparent to-transparent pointer-events-none" />

          {/* Expand button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate950/0 group-hover:bg-slate950/40 transition-colors duration-200">
            <div className="p-4 bg-slate950/70 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
              <ImageIcon className="w-6 h-6 text-slate50" />
            </div>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl font-bold text-slate50 mb-2">{project.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate200/80">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {project.period}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {project.location}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Description */}
        <p className="text-slate200 leading-relaxed mb-5">
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="primary">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Quick CTAs */}
        {hasLinks && (
          <div className="flex flex-wrap gap-3 mb-6">
            {project.links?.demo && (
              <a
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange500 to-orange600 hover:from-orange600 hover:to-orange500 rounded-lg text-sm font-medium text-slate50 shadow-glow-orange hover:shadow-glow-orange-lg transition-all duration-200 focus-ring"
              >
                <ExternalLink className="w-4 h-4" />
                Live Demo
              </a>
            )}
            {project.links?.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate700/50 hover:bg-slate700 border border-slate600/50 hover:border-slate500 rounded-lg text-sm font-medium text-slate50 transition-all duration-200 focus-ring"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            )}
          </div>
        )}

        {/* Case Study Button */}
        {hasCaseStudy && (
          <Button
            variant="primary"
            onClick={() => navigate(`/projects/${project.caseStudySlug}`)}
            className="w-full mb-3"
            icon={<BookOpen className="w-4 h-4" />}
          >
            View Case Study
          </Button>
        )}

        {/* Expand button */}
        <Button
          variant="secondary"
          onClick={onExpand}
          className="w-full"
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconPosition="right"
        >
          View Full Details
        </Button>
      </div>
    </motion.div>
  );
}


// Spotlight Modal (Expanded View)


interface SpotlightModalProps {
  project: Project;
  onClose: () => void;
  reducedMotion: boolean;
}

function SpotlightModal({ project, onClose, reducedMotion }: SpotlightModalProps) {
  const navigate = useNavigate();
  const galleryImages = project.gallery || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const hasLinks = project.links && Object.keys(project.links).length > 0;
  const hasVideos = project.links?.videos && project.links.videos.length > 0;
  const hasCaseStudy = !!project.caseStudySlug;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const goToImage = useCallback((index: number) => {
    if (index === currentImageIndex) return;
    setSlideDirection(index > currentImageIndex ? "right" : "left");
    setCurrentImageIndex(index);
  }, [currentImageIndex]);

  const goNext = useCallback(() => {
    if (galleryImages.length <= 1) return;
    setSlideDirection("right");
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const goPrev = useCallback(() => {
    if (galleryImages.length <= 1) return;
    setSlideDirection("left");
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Push-slide animation variants
  const slideVariants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "right" ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "right" ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4 bg-slate950/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layoutId={`project-card-${project.id}`}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reducedMotion ? 0 : 40 }}
        transition={{
          type: reducedMotion ? "tween" : "spring",
          stiffness: 300,
          damping: 30,
          duration: reducedMotion ? 0.15 : undefined
        }}
        className="relative w-full max-w-5xl bg-slate800/95 border border-slate700/60 rounded-2xl shadow-2xl backdrop-blur-sm my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 text-slate200 hover:text-slate50 bg-slate900/90 hover:bg-slate700 rounded-full transition-all duration-200 focus-ring"
          aria-label="Close spotlight"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery Section */}
        {galleryImages.length > 0 && (
          <div className="relative">
            {/* Main Image with Push-Slide Animation */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate800 to-slate900">
              <AnimatePresence mode="popLayout" custom={slideDirection}>
                <motion.img
                  key={currentImageIndex}
                  src={galleryImages[currentImageIndex]}
                  alt={`${project.title} - Image ${currentImageIndex + 1}`}
                  custom={slideDirection}
                  variants={reducedMotion ? {} : slideVariants}
                  initial={reducedMotion ? { opacity: 0 } : "enter"}
                  animate={reducedMotion ? { opacity: 1 } : "center"}
                  exit={reducedMotion ? { opacity: 0 } : "exit"}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute inset-0 w-full h-full object-contain p-4"
                />
              </AnimatePresence>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate900/80 via-transparent to-transparent pointer-events-none" />

              {/* Navigation arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-slate200 hover:text-slate50 bg-slate900/70 hover:bg-slate800 backdrop-blur-sm rounded-full transition-all duration-200 focus-ring"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-slate200 hover:text-slate50 bg-slate900/70 hover:bg-slate800 backdrop-blur-sm rounded-full transition-all duration-200 focus-ring"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {galleryImages.length > 1 && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-slate900/70 backdrop-blur-sm rounded-full text-sm text-slate200 font-mono">
                  {currentImageIndex + 1} / {galleryImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate900/80 backdrop-blur-sm rounded-xl max-w-[90%] overflow-x-auto">
                {galleryImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); goToImage(index); }}
                    className={cn(
                      "relative flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden transition-all duration-200 focus-ring bg-slate800",
                      index === currentImageIndex
                        ? "ring-2 ring-orange500 scale-105"
                        : "opacity-60 hover:opacity-100"
                    )}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-contain p-0.5"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate50 pr-12 mb-3">
              {project.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate200/70">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {project.period}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {project.location}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate200 leading-relaxed mb-6 text-base">
            {project.description}
          </p>

          {/* Case Study CTA */}
          {hasCaseStudy && (
            <div className="mb-6">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/projects/${project.caseStudySlug}`);
                }}
                className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange500 to-orange600 hover:from-orange600 hover:to-orange500 rounded-xl text-base font-semibold text-slate50 shadow-glow-orange hover:shadow-glow-orange-lg transition-all duration-200 focus-ring"
              >
                <BookOpen className="w-5 h-5" />
                Read Full Case Study
              </button>
            </div>
          )}

          {/* CTAs Section */}
          {hasLinks && (
            <div className="mb-8 p-4 bg-slate900/40 rounded-xl border border-slate700/30">
              <h3 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider mb-4">
                Links & Resources
              </h3>
              <div className="flex flex-wrap gap-3">
                {project.links?.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange500 to-orange600 hover:from-orange600 hover:to-orange500 rounded-xl text-sm font-semibold text-slate50 shadow-glow-orange hover:shadow-glow-orange-lg transition-all duration-200 focus-ring"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
                  </a>
                )}
                {project.links?.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-slate700/60 hover:bg-slate700 border border-slate600/50 hover:border-slate500 rounded-xl text-sm font-medium text-slate50 transition-all duration-200 focus-ring"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {project.links?.docs && (
                  <a
                    href={project.links.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-slate700/60 hover:bg-slate700 border border-slate600/50 hover:border-slate500 rounded-xl text-sm font-medium text-slate50 transition-all duration-200 focus-ring"
                  >
                    <FileText className="w-4 h-4" />
                    Documentation
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Videos Section */}
          {hasVideos && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider mb-4">
                Video Demos
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {project.links?.videos?.map((video, index) => (
                  <a
                    key={index}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 p-4 bg-slate900/50 hover:bg-slate700/50 border border-slate700/50 hover:border-teal400/40 rounded-xl transition-all duration-200 focus-ring"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-teal400/10 group-hover:bg-teal400/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                      <Play className="w-5 h-5 text-teal400" />
                    </div>
                    <span className="text-sm text-slate200 group-hover:text-slate50 line-clamp-2 transition-colors duration-200">
                      {video.label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Two Column: Highlights + Technologies */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Highlights */}
            <div>
              <h3 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider mb-4">
                Key Highlights
              </h3>
              <ul className="space-y-3">
                {project.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-slate200"
                  >
                    <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-orange500" />
                    <span className="text-sm leading-relaxed">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technologies */}
            <div>
              <h3 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider mb-4">
                Technologies Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


// Empty State Component


interface EmptyStateProps {
  onClear: () => void;
}

function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate800/50 flex items-center justify-center">
        <ImageIcon className="w-10 h-10 text-slate200/30" />
      </div>
      <h3 className="text-xl font-semibold text-slate50 mb-2">
        No projects found
      </h3>
      <p className="text-slate200/60 mb-6 max-w-md mx-auto">
        No projects match the selected filters. Try selecting different
        technologies or clear all filters.
      </p>
      <Button variant="secondary" onClick={onClear}>
        Clear filters
      </Button>
    </motion.div>
  );
}
