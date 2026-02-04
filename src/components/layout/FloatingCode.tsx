import { useEffect, useRef, useState, useMemo } from "react";

// CONFIGURATION

const CODE_SNIPPETS = [
  "const data = await fetch()",
  "import { useState }",
  "function transform()",
  "export default App",
  "return <Component />",
  "async function query()",
  "interface Props {}",
  "type Result = T[]",
  "npm run build",
  "git commit -m",
  "SELECT * FROM",
  "WHERE id = $1",
  "CREATE TABLE",
  "docker compose up",
  "kubectl apply -f",
  "def train_model():",
  "model.fit(X, y)",
  "torch.tensor()",
  "df.groupby()",
  "plt.figure()",
];

interface FloatingElement {
  id: number;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // font size in px
  opacity: number;
  speed: number; // parallax multiplier
  drift: { x: number; y: number }; // slow drift direction
  phase: number; // animation phase offset
}

// Seeded random for consistent renders
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate floating elements with deterministic positions
function generateElements(count: number, seed: number): FloatingElement[] {
  const random = seededRandom(seed);
  const elements: FloatingElement[] = [];

  for (let i = 0; i < count; i++) {
    elements.push({
      id: i,
      text: CODE_SNIPPETS[Math.floor(random() * CODE_SNIPPETS.length)],
      x: random() * 90 + 5, // 5-95%
      y: random() * 85 + 5, // 5-90%
      size: Math.floor(random() * 4) + 10, // 10-14px
      opacity: random() * 0.06 + 0.02, // 0.02-0.08
      speed: random() * 0.3 + 0.1, // 0.1-0.4 parallax
      drift: {
        x: (random() - 0.5) * 0.02, // slow horizontal drift
        y: (random() - 0.5) * 0.01, // slow vertical drift
      },
      phase: random() * Math.PI * 2, // random phase
    });
  }

  return elements;
}

// COMPONENT

export default function FloatingCode() {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const [isVisible, setIsVisible] = useState(true);

  // Generate elements once with consistent seed
  const elements = useMemo(() => generateElements(15, 42), []);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Check for small screens
    const isSmallScreen = window.innerWidth < 1024;

    if (prefersReducedMotion || isSmallScreen) {
      setIsVisible(false);
      return;
    }

    // Listen for resize
    const handleResize = () => {
      setIsVisible(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    startTimeRef.current = performance.now();
    let scrollY = window.scrollY;

    // Scroll handler (throttled via rAF)
    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Animation loop
    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000; // seconds

      elementsRef.current.forEach((el, i) => {
        if (!el) return;

        const config = elements[i];

        // Calculate drift offset (slow oscillation)
        const driftX = Math.sin(elapsed * 0.2 + config.phase) * 20 * config.drift.x;
        const driftY = Math.cos(elapsed * 0.15 + config.phase) * 15 * config.drift.y;

        // Calculate parallax offset based on scroll
        const parallaxY = scrollY * config.speed * -0.1;

        // Apply transform using translate3d for GPU acceleration
        el.style.transform = `translate3d(${driftX}px, ${parallaxY + driftY}px, 0)`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisible, elements]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-[5] overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {elements.map((el, i) => (
        <span
          key={el.id}
          ref={(node) => { elementsRef.current[i] = node; }}
          className="absolute font-mono text-slate200 whitespace-nowrap will-change-transform"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            fontSize: `${el.size}px`,
            opacity: el.opacity,
          }}
        >
          {el.text}
        </span>
      ))}
    </div>
  );
}
