export type ProjectLinks = {
  github?: string;
  demo?: string;  //demo principal
  docs?: string;
  videos?: { label: string; url: string }[];
};

export interface Project {
  id: string;
  title: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
  tags: string[];
  cover?: string;
  gallery?: string[];
  links?: ProjectLinks;
  caseStudySlug?: string; // Link to detailed case study page
}

export const projects: Project[] = [
  {
    id: "fraud-risk-scoring",
    title: "Fraud Risk Scoring System",
    period: "11/2025 – 12/2025",
    location: "Madrid, Spain",
    description:
      "Built a fraud risk scoring system using transactional and identity data with highly imbalanced classes.",
    highlights: [
      "Built a fraud risk scoring system using transactional and identity data (highly imbalanced classes)",
      "Feature engineering + ML pipelines with scikit-learn to reduce false negatives",
      "Models: Logistic Regression and Random Forest; threshold tuning prioritizing recall",
    ],
    tags: ["Python", "scikit-learn", "ML", "Fraud", "Feature Engineering"],
    links: {
      github: "https://github.com/dblacasmos/Fraud-Risk-Scoring-System",
      docs: "https://github.com/dblacasmos/Fraud-Risk-Scoring-System/blob/main/README.md",
    },
    cover: "/projects/fraud-risk-scoring/cover.png",
    gallery: [
      "/projects/fraud-risk-scoring/cover.png",
      "/projects/fraud-risk-scoring/architecture.png",
      "/projects/fraud-risk-scoring/dashboard-1.png",
      "/projects/fraud-risk-scoring/dashboard-2.png",
      "/projects/fraud-risk-scoring/dashboard-3.png",
    ],
    caseStudySlug: "fraud-risk-scoring-system",
  },
  {
    id: "profitability-analysis",
    title: "Profitability Analysis & Pricing Strategy",
    period: "10/2025 – 11/2025",
    location: "Madrid, Spain",
    description:
      "Retail profitability analysis and pricing strategy using sales data.",
    highlights: [
      "Retail profitability analysis and pricing strategy using sales data",
      "KPIs: estimated costs, margin, discount bands, shipping times, unit price metrics",
      "Prepared dataset for ML: encoding + train/test split for predictive models",
    ],
    tags: ["Python", "SQL", "Analytics", "BI", "Data Prep"],
    links: {
      github: "https://github.com/dblacasmos/Profitability-Analysis-Pricing-Strategy",
      docs: "https://github.com/dblacasmos/Profitability-Analysis-Pricing-Strategy/blob/main/README.md",
    },
    cover: "/projects/profitability-analysis/cover.png",
    gallery: [
      "/projects/profitability-analysis/cover.png",
      "/projects/profitability-analysis/architecture.png",
      "/projects/profitability-analysis/dashboard-1.png",
      "/projects/profitability-analysis/dashboard-2.png",
      "/projects/profitability-analysis/dashboard-3.png",
    ],
  },
  {
    id: "pet-monitoring",
    title: "Pet Tracking – Emotional Interpretation System",
    period: "06/2025 – 07/2025",
    location: "Madrid, Spain",
    description:
      "Big Data system for real-time analysis of pet behavior and emotional state using AWS streaming + dashboards.",
    highlights: [
      "Designed batch + streaming pipelines on AWS (S3, Glue, Kinesis, EMR, Redshift).",
      "Applied clustering to detect behavior patterns and emotional signals.",
      "Built Power BI dashboards for insights and monitoring.",
    ],
    tags: ["AWS", "Big Data", "Streaming", "Spark", "Power BI"],
    links: {
      github: "https://github.com/dblacasmos/Pet-Tracking",
      docs: "https://github.com/dblacasmos/Pet-Tracking/blob/main/README.es.md",
    },
    cover: "/projects/pet-tracking/cover.png",
    gallery: [
      "/projects/pet-tracking/cover.png",
      "/projects/pet-tracking/architecture.png",
      "/projects/pet-tracking/dashboard-1.png",
    ],
  },
  {
    id: "home-clothing-tester",
    title: "Home Clothing Tester",
    period: "05/2025 – 06/2025",
    location: "Madrid, Spain",
    description:
      "Full-stack e-commerce app using Java (Spring Boot), MySQL, and Docker.",
    highlights: [
      "Full-stack e-commerce app using Java (Spring Boot), MySQL, and Docker",
      "Auth, favorites, admin panel, analytics dashboard with Streamlit",
      "Exploration: TensorFlow.js, MediaPipe, Three.js for virtual try-on (not fully implemented)",
    ],
    tags: ["Java", "Spring Boot", "MySQL", "Docker", "Full-Stack"],
    links: {
      github: "https://github.com/dblacasmos/Home_Clothing_Tester",
      docs: "https://github.com/dblacasmos/Home_Clothing_Tester/blob/main/README.es.md",
      demo: "https://www.youtube.com/playlist?list=PL20E_dbZAg6NRchb4f-cXrPwNIGhl4tFR",
      videos: [
        { label: "1) Demo general + arquitectura", url: "https://youtu.be/VmeO8TDuLWM" },
        { label: "2) Auth (Spring Security)", url: "https://youtu.be/ce_CYnc_5cQ" },
        { label: "3) JDBC + MySQL", url: "https://youtu.be/EOzAcERS74k" },
        { label: "4) Dashboard (Streamlit + Docker)", url: "https://youtu.be/olsfdqmR7YA" },
      ],
    },
    cover: "/projects/home-clothing-tester/cover.png",
    gallery: [
      "/projects/home-clothing-tester/cover.png",
    ]
  },
];

export const allTags = Array.from(
  new Set(projects.flatMap((p) => p.tags))
).sort();
