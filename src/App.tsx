import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BackgroundFX from "@/components/layout/BackgroundFX";
import BackgroundScrollVideo from "@/components/layout/BackgroundScrollVideo";
import FloatingCode from "@/components/layout/FloatingCode";
import ScrollToTop from "@/components/layout/ScrollToTop";
import Loading from "@/components/ui/Loading";

// Lazy load page components for code splitting
const Home = lazy(() => import("@/pages/Home"));
const Projects = lazy(() => import("@/pages/Projects"));
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Set to true to enable scroll-controlled background video
// Requires: public/background.mp4
const ENABLE_SCROLL_VIDEO = true;

export default function App() {
  const location = useLocation();

  return (
    // NOTE: Using overflow-x-clip instead of overflow-x-hidden is CRITICAL.
    // overflow-hidden creates a scroll container that breaks position:sticky.
    // overflow-clip clips content without creating a scroll context.
    <div className="relative min-h-screen overflow-x-clip bg-slate950">
      {/*
        Layer order (back to front):
        -z-30: BackgroundScrollVideo (video layer)
        -z-10: BackgroundFX (gradient orbs + overlays)
        -z-5:  FloatingCode (floating code snippets)
        z-0+:  Content (Navbar, pages, Footer)
      */}
      {ENABLE_SCROLL_VIDEO && <BackgroundScrollVideo src="/background.mp4" />}
      <BackgroundFX />
      <FloatingCode />
      <Navbar />
      <ScrollToTop />
      <main id="main-content">
        <Suspense fallback={<Loading />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:slug" element={<CaseStudy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
