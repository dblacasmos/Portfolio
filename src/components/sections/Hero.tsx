import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import { profile } from "@/data/profile";
import { scrollToSection } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function Hero() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(false);

  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const backgroundOpacity = useTransform(scrollY, [0, 300], [0.6, 0.2]);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Animation variants with reduced motion support
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 30,
      filter: prefersReducedMotion ? "none" : "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: [0.22, 1, 0.36, 1]
      },
    },
  };

  const titleVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 40,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.7,
        ease: [0.22, 1, 0.36, 1]
      },
    },
  };

  const buttonContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.05,
      },
    },
  };

  const buttonVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
      scale: prefersReducedMotion ? 1 : 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.5,
        ease: [0.22, 1, 0.36, 1]
      },
    },
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <motion.div
          style={{ y: prefersReducedMotion ? 0 : backgroundY }}
          className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
        >
          <motion.div
            style={{ opacity: prefersReducedMotion ? 0.4 : backgroundOpacity }}
            className="w-full h-full rounded-full bg-gradient-to-br from-orange500/30 via-orange600/20 to-transparent blur-[100px]"
          />
        </motion.div>

        {/* Secondary gradient orb */}
        <motion.div
          style={{ y: prefersReducedMotion ? 0 : backgroundY }}
          className="absolute -bottom-[30%] -left-[15%] w-[50%] h-[50%] rounded-full"
        >
          <motion.div
            style={{ opacity: prefersReducedMotion ? 0.3 : backgroundOpacity }}
            className="w-full h-full rounded-full bg-gradient-to-tr from-teal400/20 via-teal500/10 to-transparent blur-[80px]"
          />
        </motion.div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Container className="relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          className="max-w-4xl"
        >
          {/* Location badge */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-6"
          >
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate800/50 backdrop-blur-sm border border-slate700/50 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-orange500" />
              <span className="text-sm text-slate200">{profile.location}</span>
            </span>
          </motion.div>

          {/* Main title */}
          <motion.h1
            variants={titleVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]"
          >
            <span className="text-slate50">Hi, I'm </span>
            <span className="text-gradient inline-block">{profile.name.split(" ")[0]}</span>
          </motion.h1>

          {/* Role subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-5 text-xl sm:text-2xl md:text-3xl text-slate200 font-medium"
          >
            {profile.role}
          </motion.p>

          {/* Summary */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-base sm:text-lg text-slate200/80 max-w-2xl leading-relaxed"
          >
            {profile.summary}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={buttonContainerVariants}
            className="mt-10 flex flex-wrap gap-4"
          >
            <motion.div variants={buttonVariants}>
              <Button
                size="lg"
                onClick={() => navigate("/projects")}
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                View Projects
              </Button>
            </motion.div>
            <motion.div variants={buttonVariants}>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => scrollToSection("contact")}
                icon={<Mail className="w-5 h-5" />}
              >
                Contact Me
              </Button>
            </motion.div>
          </motion.div>

          {/* Social links */}
          <motion.div
            variants={itemVariants}
            className="mt-12 flex items-center gap-6"
          >
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-slate200 hover:text-orange500 transition-colors text-sm font-mono focus-ring rounded"
            >
              <span className="inline-flex items-center gap-1">
                GitHub
                <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-slate200 hover:text-orange500 transition-colors text-sm font-mono focus-ring rounded"
            >
              <span className="inline-flex items-center gap-1">
                LinkedIn
                <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </a>
          </motion.div>
        </motion.div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ delay: prefersReducedMotion ? 0.2 : 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 border-2 border-slate700 rounded-full flex justify-center"
        >
          <motion.div
            animate={prefersReducedMotion ? {} : { y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-3 bg-orange500 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
