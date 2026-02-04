import type { CaseStudyData } from "@/types/caseStudy";

export const petTrackingCaseStudy: CaseStudyData = {
  slug: "pet-tracking-emotional-analytics",
  title: "Pet Tracking & Emotional Analytics System",
  subtitle:
    "Intelligent system to monitor pet health, activity, and emotional state through batch and streaming data analytics on AWS.",

  roles: [
    "Big Data Engineering",
    "Streaming Analytics",
    "Cloud Architecture",
    "Data Processing",
  ],
  stack: [
    "AWS (S3, Glue, Kinesis, EMR, Redshift)",
    "Spark",
    "Python",
    "Power BI",
  ],

  heroImage: {
    src: "/projects/pet-tracking/cover.png",
    alt: "Pet Tracking & Emotional Analytics System cover image",
  },

  sections: [
    {
      id: "business-problem",
      title: "Business Problem",
      paragraphs: [
        "Animal wellbeing interpretation is subjective and reactive. Without continuous data, stress, pain, or illness are detected too late.",
        "The challenge is processing large volumes of heterogeneous signals (sensors, audio, activity) and translating them into actionable indicators in near real time.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-1.png",
          alt: "Dashboard showing multimodal pet data sources",
          caption:
            "Multimodal and unstructured data makes manual analysis unfeasible.",
        },
      ],
    },
    {
      id: "system-architecture",
      title: "System Architecture",
      paragraphs: [
        "The project is designed as a complete Big Data pipeline: batch + streaming ingestion, distributed processing, analytical storage, and visualization.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/architecture.png",
          alt: "Hybrid AWS Big Data architecture diagram",
          caption:
            "Hybrid AWS Big Data architecture for batch and streaming analytics.",
        },
      ],
    },
    {
      id: "data-ingestion",
      title: "Data Ingestion (Batch & Streaming)",
      paragraphs: ["Data is ingested from multiple sources:"],
      bullets: [
        "Daily batch ingestion with Glue",
        "Continuous streaming with Kinesis + Firehose",
      ],
      paragraphs2: [
        "Time-based partitioning is designed from day one for efficiency and scalability.",
        "Key decisions: S3 as the Data Lake, Parquet + year/month/day partitions, and Glue Data Catalog as the semantic layer.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-2.png",
          alt: "Batch and streaming data ingestion architecture",
          caption:
            "Batch and streaming ingestion coexisting on a single Data Lake.",
        },
      ],
    },
    {
      id: "data-quality",
      title: "Data Quality & Robustness",
      paragraphs: ["Before any analysis, quality rules are enforced:"],
      bullets: [
        "Inconsistent data types",
        "Out-of-range values",
        "Corrupted streaming records",
      ],
      paragraphs2: [
        "This prevents silent downstream failures. Quality is not assumed. It is measured, broken, and fixed.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-3.png",
          alt: "Data quality validation dashboard",
          caption: "Automated quality validations before analytical processing.",
        },
      ],
    },
    {
      id: "distributed-processing",
      title: "Distributed Processing (EMR / Spark)",
      paragraphs: ["Analytical processing runs on EMR with Spark:"],
      bullets: [
        "Activity classification",
        "Per-pet aggregations",
        "Critical alert detection",
      ],
      paragraphs2: ["All workloads are distributed and reproducible."],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-4.png",
          alt: "EMR Spark processing dashboard",
          caption: "Distributed Spark processing at scale.",
        },
      ],
    },
    {
      id: "real-time-streaming",
      title: "Real-Time Streaming",
      paragraphs: [
        "Real-time signals (audio, events) are processed using Kinesis Streams, Lambda, and Firehose.",
        "The goal is minimizing latency between event detection and alert generation.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-5.png",
          alt: "Streaming pipeline for real-time events",
          caption: "Streaming pipeline for real-time critical events.",
        },
      ],
    },
    {
      id: "analytical-storage",
      title: "Analytical Storage",
      paragraphs: ["Processed data is exposed through:"],
      bullets: [
        "Athena for ad-hoc queries",
        "Redshift for structured analytics and ML",
      ],
      paragraphs2: [
        "Clear separation of layers: Raw, Processed, and Results.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-6.png",
          alt: "Analytics layer architecture",
          caption: "Analytics layer optimized for querying and reporting.",
        },
      ],
    },
    {
      id: "machine-learning",
      title: "Machine Learning in Redshift",
      paragraphs: [
        "An unsupervised model (K-Means) is trained to cluster behavioral patterns and identify anomalous behavior.",
        "Machine learning runs directly inside the warehouse for seamless integration.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-7.png",
          alt: "ML integration in Redshift",
          caption:
            "Machine Learning integrated in Redshift for advanced analytics.",
        },
      ],
    },
    {
      id: "visualization",
      title: "Visualization & Decision Making",
      paragraphs: ["Power BI translates data into:"],
      bullets: ["Emotional state indicators", "Activity level metrics", "Risk alerts"],
      paragraphs2: [
        "The output is designed for humans, not engineers. Dashboards are built for veterinary use and pet owner monitoring.",
      ],
      images: [
        {
          src: "/projects/pet-tracking/dashboard-8.png",
          alt: "Power BI decision dashboard",
          caption: "Decision-oriented dashboards for veterinary use.",
        },
      ],
    },
    {
      id: "outcome",
      title: "Outcome",
      paragraphs: [
        "The system enables continuous monitoring, early risk detection, and real scalability.",
        "This is not a dashboard. It is a full production-grade data system.",
      ],
    },
    {
      id: "scalability",
      title: "Scalability & Next Steps",
      paragraphs: ["The architecture is designed to scale towards:"],
      bullets: [
        "Additional sensor types and data sources",
        "Multi-tenant deployment for veterinary clinics",
        "Advanced ML models for predictive health analytics",
        "Mobile app integration for pet owners",
      ],
    },
  ],

  callouts: [
    {
      id: "key-decisions",
      type: "decisions",
      title: "Key Technical Decisions",
      items: [
        "Hybrid batch + streaming architecture for flexibility",
        "Parquet with time-based partitioning for efficient queries",
        "Spark for distributed processing at scale",
        "ML inside the data warehouse for seamless integration",
      ],
    },
    {
      id: "what-i-didnt-do",
      type: "didnt-do",
      title: "What I Didn't Do (And Why)",
      items: [
        "No deep learning: unnecessary cost for the current use case",
        "No ultra-low latency real time: not critical for pet monitoring",
        "No generic dashboards without context: focus on actionable insights",
      ],
    },
  ],

  links: [
    {
      label: "Source Code",
      href: "https://github.com/dblacasmos/Pet-Tracking.git",
      variant: "primary",
      icon: "github",
    },
    {
      label: "EMR / Spark Scripts",
      href: "https://github.com/dblacasmos/Pet-Tracking/blob/main/pet_behavior_processing.py",
      variant: "secondary",
      icon: "external",
    },
    {
      label: "Technical Documentation",
      href: "https://github.com/dblacasmos/Pet-Tracking/blob/main/README.md",
      variant: "outline",
      icon: "docs",
    },
  ],

  seo: {
    title: "Pet Tracking & Emotional Analytics | David Blanco Casasola",
    description:
      "Case study: Building an intelligent pet monitoring system using AWS Big Data services, Spark, and Power BI for real-time emotional and health analytics.",
    ogImage: "/projects/pet-tracking/cover.png",
    canonical: "https://dblacasmos.dev/projects/pet-tracking-emotional-analytics",
  },
};
