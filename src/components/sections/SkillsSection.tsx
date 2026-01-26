import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Code2, Database, Cloud, BarChart3, Wrench, Sparkles } from "lucide-react";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import Badge from "@/components/ui/Badge";
import { skillCategories } from "@/data/skills";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

// Filter categories with icons
const filterOptions = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "programming", label: "Frontend/Backend", icon: Code2 },
  { id: "data", label: "Data & ML", icon: Database },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "bi", label: "BI", icon: BarChart3 },
  { id: "tools", label: "Tools", icon: Wrench },
] as const;

type FilterId = typeof filterOptions[number]["id"];

// Map skill categories to filter IDs
const categoryFilterMap: Record<string, FilterId> = {
  "Programming": "programming",
  "Data & ML": "data",
  "Big Data & Cloud (AWS)": "cloud",
  "Data Visualization & BI": "bi",
  "Tools & Platforms": "tools",
  "Familiar With": "all",
};

const categoryIcons: Record<string, typeof Code2> = {
  "Programming": Code2,
  "Data & ML": Database,
  "Big Data & Cloud (AWS)": Cloud,
  "Data Visualization & BI": BarChart3,
  "Tools & Platforms": Wrench,
  "Familiar With": Sparkles,
};

const categoryColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "Programming": {
    bg: "from-orange500/20 to-orange600/10",
    border: "border-orange500/30",
    text: "text-orange500",
    glow: "group-hover:shadow-orange500/10",
  },
  "Data & ML": {
    bg: "from-teal400/20 to-teal500/10",
    border: "border-teal400/30",
    text: "text-teal400",
    glow: "group-hover:shadow-teal400/10",
  },
  "Big Data & Cloud (AWS)": {
    bg: "from-orange500/20 to-orange600/10",
    border: "border-orange500/30",
    text: "text-orange500",
    glow: "group-hover:shadow-orange500/10",
  },
  "Data Visualization & BI": {
    bg: "from-teal400/20 to-teal500/10",
    border: "border-teal400/30",
    text: "text-teal400",
    glow: "group-hover:shadow-teal400/10",
  },
  "Tools & Platforms": {
    bg: "from-slate600/20 to-slate700/10",
    border: "border-slate600/30",
    text: "text-slate200",
    glow: "group-hover:shadow-slate500/10",
  },
  "Familiar With": {
    bg: "from-slate600/20 to-slate700/10",
    border: "border-slate600/30",
    text: "text-slate200",
    glow: "group-hover:shadow-slate500/10",
  },
};

export default function SkillsSection() {
  const prefersReducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const filteredCategories = useMemo(() => {
    if (activeFilter === "all") return skillCategories;
    return skillCategories.filter(
      (cat) => categoryFilterMap[cat.name] === activeFilter || cat.name === "Familiar With"
    );
  }, [activeFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.95,
      transition: { duration: prefersReducedMotion ? 0.1 : 0.2 },
    },
  };

  return (
    <Section id="skills" className="bg-slate900/30">
      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <motion.span
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-orange500 bg-orange500/10 border border-orange500/20 rounded-full"
            >
              <Code2 className="w-3 h-3" />
              Tech Stack
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate50">
              Skills & <span className="text-gradient">Technologies</span>
            </h2>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Technologies and tools I work with daily
            </p>
          </motion.div>

          {/* Filter Chips */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {filterOptions.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;

              return (
                <motion.button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 focus-ring",
                    isActive
                      ? "bg-orange500 text-slate950 shadow-lg shadow-orange500/20"
                      : "bg-slate800/50 text-slate200 border border-slate700/50 hover:border-orange500/40 hover:text-slate50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Skills Grid */}
          <LayoutGroup>
            <motion.div
              layout={!prefersReducedMotion}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filteredCategories.map((category) => {
                  const Icon = categoryIcons[category.name] || Code2;
                  const colors = categoryColors[category.name] || categoryColors["Tools & Platforms"];

                  return (
                    <motion.div
                      key={category.name}
                      layout={!prefersReducedMotion}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="group relative"
                    >
                      <div
                        className={cn(
                          "relative h-full rounded-xl border bg-slate800/30 p-5 transition-all duration-300",
                          "hover:bg-slate800/50 hover:shadow-lg",
                          colors.border,
                          colors.glow
                        )}
                      >
                        {/* Spotlight hover effect */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                          <div
                            className={cn(
                              "absolute -inset-[100%] bg-gradient-to-r from-transparent to-transparent rotate-12",
                              "translate-x-[-100%] group-hover:translate-x-[100%]",
                              "transition-transform duration-1000",
                              colors.text === "text-orange500" ? "via-orange500/5" : "via-teal400/5"
                            )}
                          />
                        </div>

                        <div className="relative">
                          {/* Category header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={cn(
                                "p-2 rounded-lg bg-gradient-to-br",
                                colors.bg
                              )}
                            >
                              <Icon className={cn("w-4 h-4", colors.text)} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate50 uppercase tracking-wider">
                              {category.name}
                            </h3>
                          </div>

                          {/* Skills */}
                          <div className="flex flex-wrap gap-2">
                            {category.skills.map((skill, idx) => (
                              <motion.div
                                key={skill}
                                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  delay: prefersReducedMotion ? 0 : idx * 0.03,
                                  duration: 0.2,
                                }}
                              >
                                <Badge
                                  variant={
                                    colors.text === "text-orange500"
                                      ? "primary"
                                      : colors.text === "text-teal400"
                                      ? "secondary"
                                      : "default"
                                  }
                                  className="transition-all duration-200 hover:scale-105"
                                >
                                  {skill}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </motion.div>
      </Container>
    </Section>
  );
}
