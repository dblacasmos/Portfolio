import { useEffect, useState } from "react";
import {
  motion,
  useAnimationControls,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { profile } from "@/data/profile";
import { scrollToSection } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import BackgroundHomeVideo from "@/components/background/BackgroundHomeVideo";

// ============================================================================
// Animation Configuration
// ============================================================================

const STORAGE_KEY = "hero_intro_played";

// Smooth easeOut curve
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ============================================================================
// Helpers
// ============================================================================

function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Ignore storage errors
  }
}

// Wait for next animation frame (promisified)
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// ============================================================================
// Component
// ============================================================================

export default function Hero() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Desktop detection (one-time snapshot, no resize reactivity on purpose)
  const isDesktop =
    typeof window !== "undefined" && window.innerWidth >= 1024;

  // Full motion config (~4s total) - more theatrical on desktop
  const FULL_MOTION = {
    titleX: isDesktop ? 260 : 180, // pixels from right
    subtitleY: isDesktop ? 200 : 120, // pixels from bottom
    avatarScale: 0.85,
    buttonY: 40,
    phase1Duration: 1.8, // Title + Subtitle
    phase2Duration: 1.1, // Avatar + Paragraph
    phase3Duration: 0.8, // Badge + Buttons + Social
    phase3Stagger: 0.14, // Stagger between phase 3 items
  };

  // Reduced motion config (still visible, just gentler) - also scales by desktop
  const REDUCED_MOTION = {
    titleX: isDesktop ? 120 : 80, // still moves, but less
    subtitleY: isDesktop ? 80 : 60,
    avatarScale: 0.95,
    buttonY: 16,
    phase1Duration: 0.7,
    phase2Duration: 0.5,
    phase3Duration: 0.4,
    phase3Stagger: 0.08,
  };

  // Select motion config
  const m = prefersReducedMotion ? REDUCED_MOTION : FULL_MOTION;

  // Determine if we should animate (first load only)
  const [shouldAnimate] = useState(() => shouldPlayIntro());

  // Content visibility - starts false, set true when ready to show
  const [isReady, setIsReady] = useState(false);

  // Animation controls for orchestrated sequence
  const titleControls = useAnimationControls();
  const subtitleControls = useAnimationControls();
  const avatarControls = useAnimationControls();
  const paragraphControls = useAnimationControls();
  const badgeControls = useAnimationControls();
  const buttonsControls = useAnimationControls();
  const socialControls = useAnimationControls();
  const scrollIndicatorControls = useAnimationControls();

  // Parallax background
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);
  const backgroundOpacity = useTransform(scrollY, [0, 300], [0.6, 0.2]);

  // Run orchestrated animation sequence
  useEffect(() => {
    const runSequence = async () => {
      // Debug logging
      console.log("[Hero] Mount", {
        shouldAnimate,
        prefersReducedMotion,
        isDesktop,
        timestamp: Date.now(),
      });

      if (!shouldAnimate) {
        // Already played - jump to final state instantly
        console.log("[Hero] Skipping intro (already played this session)");
        titleControls.set({ opacity: 1, x: 0 });
        subtitleControls.set({ opacity: 1, y: 0 });
        avatarControls.set({ opacity: 1, scale: 1 });
        paragraphControls.set({ opacity: 1, scale: 1 });
        badgeControls.set({ opacity: 1, y: 0 });
        buttonsControls.set({ opacity: 1, y: 0 });
        socialControls.set({ opacity: 1, y: 0 });
        scrollIndicatorControls.set({ opacity: 1 });
        setIsReady(true);
        return;
      }

      // Wait for DOM to be ready (double-rAF ensures paint happened)
      await nextFrame();
      await nextFrame();

      // Now show content in hidden state
      setIsReady(true);

      // Small delay to ensure React has rendered the hidden state
      await nextFrame();
      await nextFrame();

      console.log("[Hero] Starting animation sequence");

      // ========================================
      // PHASE 1: Title + Subtitle (simultaneous)
      // ========================================
      console.log("[Hero] Phase 1: Title + Subtitle");
      await Promise.all([
        titleControls.start({
          opacity: 1,
          x: 0,
          transition: { duration: m.phase1Duration, ease: EASE },
        }),
        subtitleControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: m.phase1Duration, ease: EASE },
        }),
      ]);

      // ========================================
      // PHASE 2: Avatar + Paragraph
      // ========================================
      console.log("[Hero] Phase 2: Avatar + Paragraph");
      await Promise.all([
        avatarControls.start({
          opacity: 1,
          scale: 1,
          transition: { duration: m.phase2Duration, ease: EASE },
        }),
        paragraphControls.start({
          opacity: 1,
          scale: 1,
          transition: { duration: m.phase2Duration, ease: EASE },
        }),
      ]);

      // ========================================
      // PHASE 3: Badge → Buttons → Social (staggered)
      // ========================================
      console.log("[Hero] Phase 3: Badge + Buttons + Social");
      await badgeControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: m.phase3Duration, ease: EASE },
      });

      // Small stagger
      await new Promise((r) => setTimeout(r, m.phase3Stagger * 1000));

      await buttonsControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: m.phase3Duration, ease: EASE },
      });

      // Small stagger
      await new Promise((r) => setTimeout(r, m.phase3Stagger * 1000));

      await socialControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: m.phase3Duration, ease: EASE },
      });

      // ========================================
      // PHASE 4: Scroll indicator
      // ========================================
      console.log("[Hero] Phase 4: Scroll indicator");
      await scrollIndicatorControls.start({
        opacity: 1,
        transition: { duration: 0.5, ease: EASE },
      });

      // Mark intro as played
      markIntroPlayed();
      console.log("[Hero] Animation sequence complete");
    };

    runSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - deps intentionally empty

  // ============================================================================
  // Initial (hidden) states - using motion config values
  // ============================================================================
  const titleInitial = { opacity: 0, x: m.titleX };
  const subtitleInitial = { opacity: 0, y: m.subtitleY };
  const avatarInitial = { opacity: 0, scale: m.avatarScale };
  const paragraphInitial = { opacity: 0, scale: m.avatarScale };
  const badgeInitial = { opacity: 0, y: m.buttonY };
  const buttonsInitial = { opacity: 0, y: m.buttonY };
  const socialInitial = { opacity: 0, y: m.buttonY };
  const scrollIndicatorInitial = { opacity: 0 };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Section-scoped background video */}
      <BackgroundHomeVideo />

      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
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
        {/* Content - hidden until isReady */}
        <div
          className="grid lg:grid-cols-[1fr_auto] lg:gap-16 xl:gap-20 items-center"
          style={{ visibility: isReady ? "visible" : "hidden" }}
        >
          {/* Left Column: Text Content */}
          <div className="max-w-2xl">
            {/* Location badge with mobile avatar */}
            <motion.div
              initial={badgeInitial}
              animate={badgeControls}
              className="mb-6"
            >
              <div className="flex items-center gap-4">
                {/* Mobile avatar */}
                <motion.div
                  initial={avatarInitial}
                  animate={avatarControls}
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
                  <span className="text-sm text-slate200">
                    {profile.location}
                  </span>
                </span>
              </div>
            </motion.div>

            {/* Main title - slides from right */}
            <motion.h1
              initial={titleInitial}
              animate={titleControls}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]"
            >
              <span className="text-slate50">Hi, I'm </span>
              <span className="text-gradient inline-block">
                {profile.name.split(" ")[0]}
              </span>
            </motion.h1>

            {/* Subtitle - slides from bottom */}
            <motion.p
              initial={subtitleInitial}
              animate={subtitleControls}
              className="mt-5 text-xl sm:text-2xl md:text-3xl text-slate200 font-medium"
            >
              {profile.role}
            </motion.p>

            {/* Summary paragraph */}
            <motion.p
              initial={paragraphInitial}
              animate={paragraphControls}
              className="mt-6 text-base sm:text-lg text-slate200/80 max-w-2xl leading-relaxed"
            >
              {profile.summaries.home}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={buttonsInitial}
              animate={buttonsControls}
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
              initial={socialInitial}
              animate={socialControls}
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
                  <span className="inline-block transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
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
                  <span className="inline-block transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </a>
            </motion.div>
          </div>

          {/* Right Column: Large Avatar (Desktop only) */}
          <motion.div
            initial={avatarInitial}
            animate={avatarControls}
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
        initial={scrollIndicatorInitial}
        animate={scrollIndicatorControls}
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
