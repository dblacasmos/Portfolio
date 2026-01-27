import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseStudySection, CaseStudyCallout } from "@/types/caseStudy";

interface TOCItem {
  id: string;
  title: string;
  number?: string;
}

interface TableOfContentsProps {
  sections: CaseStudySection[];
  callouts?: CaseStudyCallout[];
  className?: string;
}

export default function TableOfContents({
  sections,
  callouts,
  className,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  // Build TOC items from sections and callouts
  const tocItems: TOCItem[] = [
    ...sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      number: section.number || String(index + 1).padStart(2, "0"),
    })),
    ...(callouts?.map((callout) => ({
      id: callout.id,
      title: callout.title,
    })) || []),
  ];

  // Track scroll position and update active section
  const updateActiveSection = useCallback(() => {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const scrollCenter = scrollY + viewportHeight * 0.3;

    // Find the current section
    for (let i = tocItems.length - 1; i >= 0; i--) {
      const element = document.getElementById(tocItems[i].id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        if (scrollCenter >= elementTop) {
          setActiveId(tocItems[i].id);
          return;
        }
      }
    }

    // Default to first item
    if (tocItems.length > 0) {
      setActiveId(tocItems[0].id);
    }
  }, [tocItems]);

  useEffect(() => {
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    updateActiveSection();
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, [updateActiveSection]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navbarOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav
      className={cn(
        "hidden xl:block sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto",
        className
      )}
      aria-label="Table of contents"
    >
      <div className="p-5 bg-slate800/30 border border-slate700/40 rounded-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate700/40">
          <List className="w-4 h-4 text-slate200/60" />
          <span className="text-sm font-medium text-slate200/80">
            On this page
          </span>
        </div>

        {/* TOC Items */}
        <ul className="space-y-1">
          {tocItems.map((item) => {
            const isActive = activeId === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleClick(item.id)}
                  className={cn(
                    "group relative w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    "focus-ring",
                    isActive
                      ? "text-orange500 bg-orange500/10"
                      : "text-slate200/70 hover:text-slate50 hover:bg-slate700/30"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="toc-indicator"
                      className="absolute left-0 top-1 bottom-1 w-0.5 bg-orange500 rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}

                  <span className="flex items-center gap-2">
                    {item.number && (
                      <span
                        className={cn(
                          "text-xs font-mono transition-colors",
                          isActive ? "text-orange500/70" : "text-slate200/40"
                        )}
                      >
                        {item.number}
                      </span>
                    )}
                    <span className="line-clamp-1">{item.title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Progress indicator */}
        <div className="mt-4 pt-3 border-t border-slate700/40">
          <div className="h-1 bg-slate700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange500 to-orange600"
              initial={{ width: "0%" }}
              animate={{
                width: `${((tocItems.findIndex((item) => item.id === activeId) + 1) / tocItems.length) * 100}%`,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
