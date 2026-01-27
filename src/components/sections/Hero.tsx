import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { profile } from "@/data/profile";
import { scrollToSection } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ============================================================================
// Animation Timing Configuration
// ============================================================================

const TIMING = {
  titleDelay: 0.8,
  titleDuration: 6.0,

  gap1: 0.5, // respiro entre título y subtítulo
  subtitleDuration: 4.0,

  gap2: 0.7, // respiro antes del reveal
  revealDuration: 1.4,
  revealStagger: 0.3,

  // Intro row (badge + mobile avatar)
  introRowOffset: 0.2, // aparece justo después de terminar el título
};

const titleEnd = TIMING.titleDelay + TIMING.titleDuration;
const subtitleDelay = titleEnd + TIMING.gap1;
const subtitleEnd = subtitleDelay + TIMING.subtitleDuration;
const revealDelay = subtitleEnd + TIMING.gap2;

const introRowDelay = titleEnd + TIMING.introRowOffset;

const EASE_OUT = [0.12, 0.95, 0.25, 1]; // Premium-ish easeOut curve

export default function Hero() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(false);

  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const backgroundOpacity = useTransform(scrollY, [0, 300], [0.6, 0.2]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Title: slides from right
  const titleVariants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : 40,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: prefersReducedMotion ? 0.3 : TIMING.titleDuration,
        delay: prefersReducedMotion ? 0 : TIMING.titleDelay,
        ease: EASE_OUT,
      },
    },
  };

  // Subtitle: slides from bottom
  const subtitleVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 32,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.3 : TIMING.subtitleDuration,
        delay: prefersReducedMotion ? 0 : subtitleDelay,
        ease: EASE_OUT,
      },
    },
  };

  // Final reveal: fade + scale
  const revealVariants = {
    hidden: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.98,
    },
    visible: (custom: number = 0) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : TIMING.revealDuration,
        delay: prefersReducedMotion ? 0 : revealDelay + custom * TIMING.revealStagger,
        ease: EASE_OUT,
      },
    }),
  };

  // Avatar special reveal (bounce)
  const avatarVariants = {
    hidden: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.9,
    },
    visible: (delay = 0) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.9,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.34, 1.56, 0.64, 1], // slight overshoot
      },
    }),
  };

  // Location badge (with the intro row)
  const badgeVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.6,
        delay: prefersReducedMotion ? 0 : introRowDelay,
        ease: EASE_OUT,
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
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <Container className="relative z-10">
        {/* CSS Grid Layout: 2-column on lg+ */}
        <div className="grid lg:grid-cols-[1fr_auto] lg:gap-16 xl:gap-20 items-center">
          {/* Left Column: Text Content */}
          <div className="max-w-2xl">
            {/* Location badge */}
            <motion.div
              variants={badgeVariants}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
              className="mb-6"
            >
              {/* Mobile avatar + badge row */}
              <div className="flex items-center gap-4">
                <motion.div
                  variants={avatarVariants}
                  custom={introRowDelay}
                  initial="hidden"
                  animate={isLoaded ? "visible" : "hidden"}
                  className="lg:hidden"
                >
                  <Avatar
                    src="/avatar.webp"
                    alt={profile.name}
                    size="lg"
                    priority
                    className="ring-orange500/30 ring-offset-2 ring-offset-slate950"
                  />
                </motion.div>

                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate800/50 backdrop-blur-sm border border-slate700/50 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-orange500" />
                  <span className="text-sm text-slate200">{profile.location}</span>
                </span>
              </div>
            </motion.div>

            {/* Main title */}
            <motion.h1
              variants={titleVariants}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]"
            >
              <span className="text-slate50">Hi, I'm </span>
              <span className="text-gradient inline-block">{profile.name.split(" ")[0]}</span>
            </motion.h1>

            {/* Role subtitle */}
            <motion.p
              variants={subtitleVariants}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
              className="mt-5 text-xl sm:text-2xl md:text-3xl text-slate200 font-medium"
            >
              {profile.role}
            </motion.p>

            {/* Summary */}
            <motion.p
              variants={revealVariants}
              custom={0}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
              className="mt-6 text-base sm:text-lg text-slate200/80 max-w-2xl leading-relaxed"
            >
              {profile.summary}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={revealVariants}
              custom={1}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/projects")}
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                View Projects
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => scrollToSection("contact")}
                icon={<Mail className="w-5 h-5" />}
              >
                Contact Me
              </Button>
            </motion.div>

            {/* Social links */}
            <motion.div
              variants={revealVariants}
              custom={2}
              initial="hidden"
              animate={isLoaded ? "visible" : "hidden"}
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
          </div>

          {/* Right Column: Large Avatar (Desktop only) */}
          <motion.div
            variants={avatarVariants}
            custom={revealDelay}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              {/* Glow effect behind avatar */}
              <div className="absolute inset-0 scale-125 bg-gradient-to-br from-orange500/25 via-teal400/15 to-transparent blur-3xl rounded-full" />
              {/* Secondary glow ring */}
              <div className="absolute inset-0 scale-110 bg-gradient-to-tr from-orange600/10 to-teal500/10 blur-2xl rounded-full" />
              <Avatar
                src="/avatar.webp"
                alt={profile.name}
                size="hero"
                priority
                className="relative ring-4 ring-orange500/20 ring-offset-4 ring-offset-slate950 shadow-2xl shadow-orange500/10"
              />
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ delay: prefersReducedMotion ? 0.2 : revealDelay + 0.6, duration: 0.5 }}
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
