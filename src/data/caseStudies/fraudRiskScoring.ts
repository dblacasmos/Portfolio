import type { CaseStudyData } from "@/types/caseStudy";

export const fraudRiskScoringCaseStudy: CaseStudyData = {
  slug: "fraud-risk-scoring-system",
  title: "Fraud Risk Scoring System",
  subtitle:
    "Risk scoring system for financial fraud detection, designed as a business decision problem rather than a naive binary classification task.",

  roles: [
    "Data Science",
    "Machine Learning",
    "Feature Engineering",
    "Model Evaluation",
  ],
  stack: ["Python", "Pandas", "Scikit-learn", "Jupyter", "Data Visualization"],

  heroImage: {
    src: "/projects/fraud-risk-scoring/cover.png",
    alt: "Fraud Risk Scoring System cover image showing the project dashboard",
  },

  sections: [
    {
      id: "business-problem",
      title: "Business Problem",
      paragraphs: [
        "Financial fraud detection is characterized by extreme class imbalance and a very high cost associated with false negatives.",
        "In this context, optimizing for accuracy leads to decisions that are incorrect from a business perspective.",
        "The real objective is to maximize fraud detection, even at the cost of a controlled increase in false positives, since the economic impact of undetected fraud is significantly higher.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-1.png",
          alt: "Dashboard showing highly imbalanced dataset distribution",
          caption: "Highly imbalanced dataset. Accuracy is not a valid metric.",
        },
      ],
    },
    {
      id: "system-architecture",
      title: "System Architecture",
      paragraphs: [
        "The project is designed as a complete risk scoring system, from data ingestion to decision-making based on a threshold optimized for business requirements.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/architecture.png",
          alt: "System architecture diagram showing the end-to-end pipeline",
          caption:
            "End-to-end pipeline from data ingestion to risk-based decision making.",
        },
      ],
    },
    {
      id: "data-ingestion",
      title: "Data Ingestion & Efficiency",
      paragraphs: [
        "Transaction and identity datasets are loaded independently and merged using TransactionID.",
        "From the ingestion stage, computational efficiency is prioritized, anticipating real-world high-volume scenarios.",
      ],
      bullets: [
        "Data type optimization to reduce memory usage",
        "Early removal of non-relevant columns",
        "Preparation for reproducible pipelines",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-4.png",
          alt: "Dashboard showing data loading optimization",
          caption:
            "Selective loading and optimized dtypes to reduce memory usage before modeling.",
        },
      ],
    },
    {
      id: "data-cleaning",
      title: "Robustness-Oriented Data Cleaning",
      paragraphs: [
        "Data cleaning is not focused on beautifying the dataset, but on ensuring pipeline robustness against missing values, inconsistent types, and atypical combinations commonly found in real fraud data.",
        "These decisions reduce silent failures and improve system stability in production.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-5.png",
          alt: "Data cleaning and imputation dashboard",
          caption:
            "Imputation and type control integrated into the pipeline to prevent data leakage.",
        },
      ],
    },
    {
      id: "feature-engineering",
      title: "Feature Engineering",
      paragraphs: [
        "Feature engineering is designed to capture identity reuse patterns, which are characteristic of fraudulent behavior.",
        "Composite identities are created, such as:",
      ],
      bullets: ["card_id", "billing_id", "email_pair", "device_id"],
      paragraphs2: [
        "In addition, graph-like features are generated using efficient tabular operations (groupby, transform, cumcount), replicating complex relationships without building explicit graphs.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-6.png",
          alt: "Feature engineering showing composite identity construction",
          caption:
            "Construction of composite identities to capture fraudulent reuse patterns.",
        },
        {
          src: "/projects/fraud-risk-scoring/dashboard-7.png",
          alt: "Graph-like features computed with tabular operations",
          caption:
            "Graph-like features computed with efficient tabular operations (no GNNs).",
        },
      ],
      imageLayout: "grid-2",
    },
    {
      id: "temporal-validation",
      title: "Temporal Validation",
      paragraphs: [
        "Instead of a random split, the dataset is divided temporally using TransactionDT, ensuring the model always predicts on future data.",
        "This approach simulates a real production scenario and prevents temporal data leakage.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-8.png",
          alt: "Temporal split visualization",
          caption:
            "Temporal split based on TransactionDT to simulate future predictions.",
        },
      ],
    },
    {
      id: "modeling",
      title: "Modeling",
      paragraphs: [
        "Multiple models are trained as benchmarks, prioritizing interpretability, stability, and adaptation to dataset imbalance.",
        "Models used:",
      ],
      bullets: [
        "Logistic Regression (class_weight=\"balanced\")",
        "Random Forest tuned to limit overfitting",
      ],
      paragraphs2: [
        "The entire process is encapsulated in scikit-learn pipelines to ensure reproducibility.",
      ],
    },
    {
      id: "metrics-optimization",
      title: "Metrics & Threshold Optimization",
      paragraphs: [
        "The system is evaluated using metrics appropriate for the fraud detection context.",
        "Accuracy is discarded as a primary metric, and the analysis focuses on probability outputs and Precision–Recall curves.",
        "The decision threshold is explicitly optimized to meet a business-aligned recall target.",
      ],
      images: [
        {
          src: "/projects/fraud-risk-scoring/dashboard-2.png",
          alt: "Precision-Recall curve showing threshold selection",
          caption:
            "Precision–Recall curve: threshold selection based on a business recall target.",
        },
        {
          src: "/projects/fraud-risk-scoring/dashboard-3.png",
          alt: "Confusion matrix showing the trade-off",
          caption:
            "Confusion matrix: accepted trade-off. Increased false positives to reduce false negatives.",
        },
      ],
      imageLayout: "grid-2",
    },
    {
      id: "outcome",
      title: "Outcome",
      paragraphs: [
        "The final system significantly improves fraud detection by reducing false negatives and providing an interpretable score that can be integrated into real decision flows.",
        "The result is not just a model, but a complete decision-making system.",
        "In a real-world deployment, this approach would reduce losses from undetected fraud at the cost of a controlled increase in manual reviews.",
      ],
    },
    {
      id: "scalability",
      title: "Scalability & Next Steps",
      paragraphs: ["The design allows the system to evolve towards:"],
      bullets: [
        "Economic cost-based optimization",
        "Probability calibration",
        "Concept drift detection",
        "Integration with rules and real-time systems",
      ],
      paragraphs2: ["This reflects a full lifecycle view of an antifraud system."],
    },
  ],

  callouts: [
    {
      id: "key-decisions",
      type: "decisions",
      title: "Key Technical Decisions",
      items: [
        "Recall is prioritized over accuracy due to economic impact.",
        "Temporal split is used to simulate future predictions.",
        "Composite identities model fraud-related reuse patterns.",
        "The decision threshold is explicitly optimized based on business objectives.",
      ],
    },
    {
      id: "what-i-didnt-do",
      type: "didnt-do",
      title: "What I Didn't Do (And Why)",
      items: [
        "No GNNs were used due to unnecessary cost and complexity.",
        "Accuracy was not optimized as it does not reflect business goals.",
        "No random split was used to avoid temporal data leakage.",
      ],
    },
  ],

  links: [
    {
      label: "Source Code",
      href: "https://github.com/dblacasmos/Fraud-Risk-Scoring-System.git",
      variant: "primary",
      icon: "github",
    },
    {
      label: "Reproducible Notebook",
      href: "https://github.com/dblacasmos/Fraud-Risk-Scoring-System/blob/main/Reto3_Detenci%C3%B3nFraude.ipynb",
      variant: "secondary",
      icon: "external",
    },
    {
      label: "Technical Documentation",
      href: "https://github.com/dblacasmos/Fraud-Risk-Scoring-System/blob/main/README.md",
      variant: "outline",
      icon: "docs",
    },
  ],

  seo: {
    title: "Fraud Risk Scoring System | David Blanco Casasola",
    description:
      "Case study: Building a fraud risk scoring system for financial fraud detection using Python, scikit-learn, and business-driven threshold optimization.",
    ogImage: "/projects/fraud-risk-scoring/cover.png",
    canonical: "https://dblacasmos.dev/projects/fraud-risk-scoring-system",
  },
};
