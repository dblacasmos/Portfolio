import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { projects } from "@/data/projects";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function ProjectsSection() {
  const navigate = useNavigate();
  const featuredProjects = projects.slice(0, 3);

  return (
    <Section id="projects">
      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate50">
              Featured <span className="text-gradient">Projects</span>
            </h2>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              A selection of my recent work in data science and software
              development
            </p>
          </motion.div>

          {/* Project Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredProjects.map((project) => (
              <motion.article
                key={project.id}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => navigate("/projects")}
                className="group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer bg-slate800/40 border border-slate700/50 backdrop-blur-sm hover:border-orange500/40 hover:bg-slate800/60 transition-colors duration-250"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/projects");
                  }
                }}
                aria-label={`View ${project.title}`}
              >
                {/* Cover Image */}
                {project.cover && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate900">
                    <img
                      src={project.cover}
                      alt={`${project.title} preview`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate900/90 via-slate900/30 to-transparent" />

                    {/* Hover indicator */}
                    <div className="absolute top-3 right-3 p-2 bg-slate950/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowUpRight className="w-4 h-4 text-slate50" />
                    </div>

                    {/* Tags on image */}
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs font-medium bg-slate950/60 backdrop-blur-sm text-slate200 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate950/60 backdrop-blur-sm text-slate200/60 rounded-md">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col flex-grow p-5">
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-slate50 mb-2 line-clamp-2 group-hover:text-orange300 transition-colors duration-200">
                    {project.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate200/60 mb-3">
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

                  {/* Tags (fallback if no cover) */}
                  {!project.cover && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* View details link */}
                  <div className="pt-4 border-t border-slate700/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-orange500 group-hover:text-orange300 transition-colors duration-200">
                      View details
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-orange500 group-hover:text-orange300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/projects")}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              View All Projects
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
