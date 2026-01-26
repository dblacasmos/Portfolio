import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ChevronDown, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { experiences, type Experience } from "@/data/experience";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export default function ExperienceSection() {
  const prefersReducedMotion = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(experiences[0]?.id || null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <Section id="experience">
      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <motion.span
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-teal400 bg-teal400/10 border border-teal400/20 rounded-full"
            >
              <Briefcase className="w-3 h-3" />
              Experience
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate50">
              Professional <span className="text-gradient">Journey</span>
            </h2>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              My career path and the roles that shaped my expertise
            </p>
          </motion.div>

          {/* Accordion Timeline */}
          <div className="max-w-3xl mx-auto">
            {/* Timeline line */}
            <div className="relative">
              <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-orange500 via-slate700 to-transparent" />

              <div className="space-y-4">
                {experiences.map((exp, index) => (
                  <motion.div key={exp.id} variants={itemVariants}>
                    <ExperienceAccordionItem
                      experience={exp}
                      isExpanded={expandedId === exp.id}
                      onToggle={() => toggleExpanded(exp.id)}
                      index={index}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

interface ExperienceAccordionItemProps {
  experience: Experience;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
  prefersReducedMotion: boolean;
}

function ExperienceAccordionItem({
  experience,
  isExpanded,
  onToggle,
  prefersReducedMotion,
}: ExperienceAccordionItemProps) {
  const contentVariants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: prefersReducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: prefersReducedMotion ? 0 : 0.2 },
      },
    },
    expanded: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: prefersReducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.1 },
      },
    },
  };

  return (
    <div className="relative pl-12 md:pl-16">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-4 md:left-6 top-5 w-4 h-4 rounded-full border-2 transition-all duration-300",
          isExpanded
            ? "bg-orange500 border-orange500 shadow-glow-orange scale-110"
            : "bg-slate900 border-slate700 hover:border-orange500/50"
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "relative rounded-xl border transition-all duration-300",
          isExpanded
            ? "bg-slate800/60 border-orange500/30 shadow-lg shadow-orange500/5"
            : "bg-slate800/30 border-slate700/50 hover:border-slate600"
        )}
      >
        {/* Header - Always visible, clickable */}
        <button
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          className="w-full text-left p-5 focus-ring rounded-xl"
          aria-expanded={isExpanded}
          aria-controls={`experience-content-${experience.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              {/* Period badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-orange500 mb-2">
                <Calendar className="w-3 h-3" />
                {experience.period}
              </span>

              {/* Title & Company */}
              <h3 className="text-lg font-semibold text-slate50 leading-tight">
                {experience.title}
              </h3>
              <p className="text-sm text-teal400 font-medium mt-0.5">
                {experience.company}
              </p>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate200/60 mt-2">
                <MapPin className="w-3 h-3" />
                {experience.location}
              </div>
            </div>

            {/* Expand icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-lg transition-colors",
                isExpanded ? "bg-orange500/20 text-orange500" : "text-slate200/60"
              )}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={`experience-content-${experience.id}`}
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0">
                <div className="border-t border-slate700/50 pt-4">
                  {/* Description */}
                  <p className="text-sm text-slate200 leading-relaxed mb-4">
                    {experience.description}
                  </p>

                  {/* Highlights */}
                  {experience.highlights && experience.highlights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate200/60 uppercase tracking-wider">
                        Key Responsibilities
                      </h4>
                      <ul className="space-y-2">
                        {experience.highlights.map((highlight, idx) => (
                          <motion.li
                            key={idx}
                            initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: prefersReducedMotion ? 0 : idx * 0.05 + 0.1 }}
                            className="flex items-start gap-2 text-sm text-slate200/80"
                          >
                            <CheckCircle2 className="w-4 h-4 text-teal400 flex-shrink-0 mt-0.5" />
                            <span>{highlight}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
