import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { User, GraduationCap, Globe, Briefcase, Code2 } from "lucide-react";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { profile, education } from "@/data/profile";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function AboutSection() {
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fallback for autoplay if blocked
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("scroll", tryPlay, { once: true });

    return () => {
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("scroll", tryPlay);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 30,
      scale: prefersReducedMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const cardHoverVariants = {
    rest: { scale: 1, y: 0 },
    hover: prefersReducedMotion ? {} : { scale: 1.02, y: -4 },
  };

  return (
    <Section id="about" className="relative overflow-hidden">
      {/* Background video layer (z-0) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
        src="/backgroundAbout.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden="true"
      />

      {/* Dark overlay for readability (z-10) */}
      <div
        className="absolute inset-0 bg-slate950/75 pointer-events-none"
        style={{ zIndex: 10 }}
        aria-hidden="true"
      />

      <Container className="relative z-20">
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
              className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-orange500 bg-orange500/10 border border-orange500/20 rounded-full"
            >
              <User className="w-3 h-3" />
              About Me
            </motion.span>

            <h2 className="text-3xl md:text-4xl font-bold text-slate50">
              Getting to Know <span className="text-gradient">My Story</span>
            </h2>

            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Background, journey, and what drives me as a developer
            </p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Profile Card */}
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card hover={false} className="h-full group relative overflow-hidden">
                  {/* Spotlight effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-orange500/5 to-transparent rotate-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>

                  <div className="relative">
                    {/* Avatar + Header row */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar
                        src="/avatar.webp"
                        alt={profile.name}
                        size="lg"
                        className="ring-orange500/20 flex-shrink-0"
                      />
                      <div className="flex-grow min-w-0">
                        <h3 className="text-lg font-semibold text-slate50">
                          {profile.name}
                        </h3>
                        <p className="text-sm text-orange500 font-medium">
                          {profile.role}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate200/60">
                          <Briefcase className="w-3 h-3" />
                          <span>Available for opportunities</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate200 leading-relaxed text-sm">
                      {profile.summaries.about}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate700/50 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-teal400" />
                        <span className="text-slate200/60">Language:</span>
                        <span className="text-slate50">
                          {profile.languages[0].name} ({profile.languages[0].level})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Code2 className="w-4 h-4 text-orange500" />
                        <span className="text-slate200/60">Focus:</span>
                        <span className="text-slate50">
                          Big Data & AI, Software Development
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            {/* Education Card */}
            <motion.div variants={itemVariants}>
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card hover={false} className="h-full group relative overflow-hidden">
                  {/* Spotlight effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-teal400/5 to-transparent rotate-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-teal400/20 to-teal500/10 rounded-xl ring-1 ring-teal400/20">
                        <GraduationCap className="w-5 h-5 text-teal400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate50">
                          Education
                        </h3>
                        <p className="text-xs text-slate200/60">
                          Academic background
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {education.map((edu, index) => (
                        <motion.div
                          key={index}
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            delay: prefersReducedMotion ? 0 : index * 0.1 + 0.2,
                          }}
                          className="relative pl-4 border-l-2 border-teal400/30 hover:border-teal400 transition-colors duration-200"
                        >
                          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal400/50" />

                          <h4 className="text-sm font-semibold text-slate50 leading-tight">
                            {edu.title}
                          </h4>

                          <p className="text-sm text-teal400 font-medium mt-0.5">
                            {edu.institution}
                          </p>

                          <p className="text-xs text-slate200/60 mt-1">
                            {edu.period} • {edu.location}
                          </p>

                          {edu.description && (
                            <p className="text-xs text-slate200/80 mt-2 leading-relaxed">
                              {edu.description}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
