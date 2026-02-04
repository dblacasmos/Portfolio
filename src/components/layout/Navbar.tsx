import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Terminal } from "lucide-react";
import { cn, scrollToSection } from "@/lib/utils";
import Container from "./Container";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const navLinks = [
  { name: "Home", href: "/", section: "hero" },
  { name: "About", href: "/about", section: "about" },
  { name: "Projects", href: "/projects", section: "projects" },
  { name: "Skills", href: "/#skills", section: "skills" },
  { name: "Contact", href: "/contact", section: "contact" },
];

const sectionIds = ["hero", "about", "projects", "skills", "experience", "contact"];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Track scroll position and active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      // Only track sections on home page
      if (location.pathname !== "/") return;

      // Find current section based on scroll position
      const viewportHeight = window.innerHeight;
      const scrollCenter = scrollY + viewportHeight * 0.4;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const rect = section.getBoundingClientRect();
          const sectionTop = rect.top + scrollY;
          if (scrollCenter >= sectionTop) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleNavClick = useCallback((href: string, section: string) => {
    if (location.pathname === "/" && section) {
      scrollToSection(section);
    } else if (href.startsWith("/#") && section) {
      navigate("/");
      setTimeout(() => scrollToSection(section), 100);
    } else if (href === "/" && section === "hero") {
      if (location.pathname === "/") {
        scrollToSection("hero");
      } else {
        navigate("/");
      }
    } else {
      navigate(href);
    }
  }, [location.pathname, navigate]);

  const isLinkActive = (section: string) => {
    if (location.pathname !== "/") {
      // Check if we're on a matching page
      if (section === "projects" && location.pathname === "/projects") return true;
      if (section === "about" && location.pathname === "/about") return true;
      if (section === "contact" && location.pathname === "/contact") return true;
      return false;
    }
    return activeSection === section;
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all",
        prefersReducedMotion ? "duration-0" : "duration-300",
        isScrolled
          ? "bg-slate950/70 backdrop-blur-xl border-b border-slate700/40 shadow-lg shadow-slate950/20"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <Container>
        <nav
          aria-label="Main navigation"
          className={cn(
            "flex items-center justify-between transition-all",
            prefersReducedMotion ? "duration-0" : "duration-300",
            isScrolled ? "h-14 md:h-16" : "h-16 md:h-20"
          )}
        >
          {/* Logo */}
          <Link
            to="/"
            onClick={() => handleNavClick("/", "hero")}
            className="flex items-center gap-2 text-slate50 font-bold text-xl focus-ring rounded-lg group"
          >
            <motion.div
              whileHover={prefersReducedMotion ? {} : { rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Terminal className="w-6 h-6 text-orange500" />
            </motion.div>
            <span className="hidden sm:inline group-hover:text-orange300 transition-colors duration-200">
              DAVID BLANCO
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                href={link.href}
                section={link.section}
                isActive={isLinkActive(link.section)}
                onClick={() => handleNavClick(link.href, link.section)}
                prefersReducedMotion={prefersReducedMotion}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-slate200 hover:text-slate50 focus-ring rounded-lg"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={prefersReducedMotion ? {} : { rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? {} : { rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={prefersReducedMotion ? {} : { rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? {} : { rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </nav>
      </Container>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden bg-slate900/95 backdrop-blur-xl border-b border-slate700/50 overflow-hidden"
          >
            <Container>
              <motion.div
                initial={prefersReducedMotion ? {} : { y: -10 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="py-4 flex flex-col gap-1"
              >
                {navLinks.map((link, index) => (
                  <motion.button
                    key={link.name}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                    onClick={() => handleNavClick(link.href, link.section)}
                    className={cn(
                      "px-4 py-3 text-left rounded-lg transition-colors focus-ring",
                      isLinkActive(link.section)
                        ? "bg-orange500/10 text-orange500 border-l-2 border-orange500"
                        : "text-slate200 hover:bg-slate800 hover:text-slate50 border-l-2 border-transparent"
                    )}
                  >
                    {link.name}
                  </motion.button>
                ))}
              </motion.div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

interface NavLinkProps {
  href: string;
  section: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  prefersReducedMotion: boolean;
}

function NavLink({ isActive, onClick, children, prefersReducedMotion }: NavLinkProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 text-sm font-medium transition-colors focus-ring rounded-lg",
        isActive ? "text-orange500" : "text-slate200 hover:text-slate50"
      )}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="navbar-indicator"
          className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-orange500 to-orange400 rounded-full"
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      {/* Hover highlight */}
      {!isActive && (
        <span className="absolute inset-0 rounded-lg bg-slate700/0 hover:bg-slate700/30 transition-colors duration-200" />
      )}
    </button>
  );
}
