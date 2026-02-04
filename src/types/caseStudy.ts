// Case Study Data Types
// Structured data format for scrollytelling case study pages

export interface CaseStudyImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface CaseStudyLink {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
  icon?: "github" | "external" | "docs";
}

export interface CaseStudySection {
  id: string;
  number?: string; // e.g., "01", "02" - optional, can be auto-generated
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  paragraphs2?: string[]; // Additional paragraphs after bullets
  images?: CaseStudyImage[];
  imageLayout?: "single" | "grid-2"; // grid-2 for 2-up layout
}

export interface CaseStudyCallout {
  id: string;
  type: "decisions" | "didnt-do";
  title: string;
  items: string[];
}

export interface CaseStudySEO {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
}

export interface CaseStudyData {
  // Basic info
  slug: string;
  title: string;
  subtitle: string;

  // Metadata
  roles: string[];
  stack: string[];

  // Hero
  heroImage: CaseStudyImage;

  // Content sections
  sections: CaseStudySection[];

  // Callouts (Key Technical Decisions, What I Didn't Do)
  callouts?: CaseStudyCallout[];

  // Links (GitHub, Docs)
  links?: CaseStudyLink[];

  // SEO metadata
  seo: CaseStudySEO;
}
