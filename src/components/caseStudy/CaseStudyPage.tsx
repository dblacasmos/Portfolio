import { motion } from "framer-motion";
import Container from "@/components/layout/Container";
import { useSEO } from "@/hooks/useSEO";
import type { CaseStudyData } from "@/types/caseStudy";

import CaseStudyHero from "./CaseStudyHero";
import CaseStudySection from "./CaseStudySection";
import TableOfContents from "./TableOfContents";
import Callout from "./Callout";
import CaseStudyLinks from "./CaseStudyLinks";

interface CaseStudyPageProps {
  data: CaseStudyData;
}

export default function CaseStudyPage({ data }: CaseStudyPageProps) {
  // Apply SEO meta tags
  useSEO({
    title: data.seo.title,
    description: data.seo.description,
    ogImage: data.seo.ogImage,
    canonical: data.seo.canonical,
    type: "article",
  });

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pt-24 pb-20 min-h-screen"
      itemScope
      itemType="https://schema.org/Article"
    >
      {/* Hero Section */}
      <Container>
        <CaseStudyHero
          title={data.title}
          subtitle={data.subtitle}
          roles={data.roles}
          stack={data.stack}
          heroImage={data.heroImage}
        />
      </Container>

      {/* Main Content with Sidebar */}
      <Container className="mt-20">
        {/*
          Grid layout for content + sidebar.
          xl:items-start is CRITICAL for sticky sidebar to work:
          - Without it, grid items stretch to fill the row
          - With it, items align to start and sticky can "travel" within the row
        */}
        <div className="grid xl:grid-cols-[1fr_320px] gap-12 xl:gap-16 xl:items-start">
          {/* Main Content */}
          <div className="min-w-0">
            {/* Mobile/Tablet TOC - sticky below navbar */}
            <div className="xl:hidden sticky top-20 z-20 -mx-4 px-4 py-3 bg-slate950/95 backdrop-blur-sm border-b border-slate700/30 mb-8">
              <TableOfContents
                sections={data.sections}
                callouts={data.callouts}
                collapsible
              />
            </div>

            {/* Sections */}
            <div className="space-y-20">
              {data.sections.map((section, index) => (
                <CaseStudySection
                  key={section.id}
                  {...section}
                  index={index}
                />
              ))}
            </div>

            {/* Callouts */}
            {data.callouts && data.callouts.length > 0 && (
              <div className="mt-20 grid md:grid-cols-2 gap-6">
                {data.callouts.map((callout) => (
                  <Callout key={callout.id} {...callout} />
                ))}
              </div>
            )}

            {/* Links */}
            {data.links && data.links.length > 0 && (
              <div className="mt-20">
                <CaseStudyLinks links={data.links} />
              </div>
            )}

            {/* Article Footer */}
            <footer className="mt-20 pt-12 border-t border-slate700/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p className="text-sm text-slate200/60">
                    Thanks for reading this case study.
                  </p>
                  <p className="text-sm text-slate200/60 mt-1">
                    Have questions?{" "}
                    <a
                      href="/contact"
                      className="text-orange500 hover:text-orange400 transition-colors"
                    >
                      Get in touch
                    </a>
                  </p>
                </div>

                <motion.button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate200/70 hover:text-slate50 bg-slate800/50 hover:bg-slate800 border border-slate700/50 rounded-lg transition-colors focus-ring"
                >
                  <span>Back to top</span>
                  <span className="text-lg">↑</span>
                </motion.button>
              </div>
            </footer>
          </div>

          {/* Sidebar: Sticky Cover + TOC (Desktop only) */}
          <aside className="hidden xl:block sticky top-24 h-fit space-y-6">
            {/* Cover Image */}
            <div className="rounded-xl overflow-hidden border border-slate700/50 bg-slate800/30">
              <img
                src={data.heroImage.src}
                alt={data.heroImage.alt}
                className="w-full h-auto object-contain aspect-[16/10]"
              />
            </div>

            {/* Table of Contents - scrollable if content is long */}
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
              <TableOfContents
                sections={data.sections}
                callouts={data.callouts}
              />
            </div>
          </aside>
        </div>
      </Container>

      {/* Hidden structured data for SEO */}
      <meta itemProp="headline" content={data.title} />
      <meta itemProp="description" content={data.subtitle} />
      {data.seo.ogImage && <meta itemProp="image" content={data.seo.ogImage} />}
    </motion.article>
  );
}
