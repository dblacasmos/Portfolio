import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CaseStudySection as SectionType } from "@/types/caseStudy";
import ImageWithCaption from "./ImageWithCaption";

interface CaseStudySectionProps extends SectionType {
  index: number;
  className?: string;
}

export default function CaseStudySection({
  id,
  number,
  title,
  paragraphs,
  bullets,
  paragraphs2,
  images,
  imageLayout = "single",
  index,
  className,
}: CaseStudySectionProps) {
  const sectionNumber = number || String(index + 1).padStart(2, "0");

  return (
    <section
      id={id}
      className={cn("scroll-mt-24", className)}
      aria-labelledby={`${id}-title`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Section Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-orange500/70">
              {sectionNumber}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate700/50 to-transparent max-w-16" />
          </div>
          <h2
            id={`${id}-title`}
            className="text-2xl md:text-3xl font-bold text-slate50"
          >
            {title}
          </h2>
        </header>

        {/* Content */}
        <div className="space-y-4">
          {/* Paragraphs */}
          {paragraphs?.map((paragraph, i) => (
            <p
              key={i}
              className="text-slate200/90 leading-relaxed text-base md:text-lg"
            >
              {paragraph}
            </p>
          ))}

          {/* Bullets */}
          {bullets && bullets.length > 0 && (
            <ul className="space-y-2 my-4">
              {bullets.map((bullet, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full bg-orange500" />
                  <span className="text-slate200/90">{bullet}</span>
                </motion.li>
              ))}
            </ul>
          )}

          {/* Additional paragraphs after bullets */}
          {paragraphs2?.map((paragraph, i) => (
            <p
              key={`p2-${i}`}
              className="text-slate200/90 leading-relaxed text-base md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Images */}
        {images && images.length > 0 && (
          <div
            className={cn(
              "mt-8",
              imageLayout === "grid-2" &&
                "grid md:grid-cols-2 gap-6"
            )}
          >
            {images.map((image, i) => (
              <ImageWithCaption
                key={i}
                {...image}
                aspectRatio={imageLayout === "grid-2" ? "16/10" : "16/10"}
              />
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
