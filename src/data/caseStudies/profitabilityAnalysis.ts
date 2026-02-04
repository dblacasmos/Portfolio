import type { CaseStudyData } from "@/types/caseStudy";

export const profitabilityAnalysisCaseStudy: CaseStudyData = {
  slug: "profitability-analysis-pricing-strategy",
  title: "Profitability Analysis & Pricing Strategy",
  subtitle:
    "Profitability and pricing analysis system oriented to business decision-making, designed to understand what is sold, where money is made, and what destroys margin beyond pure sales volume.",

  roles: [
    "Data Analysis",
    "Business Analytics",
    "Feature Engineering",
    "Decision Support",
  ],
  stack: ["Python", "Pandas", "Matplotlib / Seaborn", "Jupyter", "Scikit-learn"],

  heroImage: {
    src: "/projects/profitability-analysis/cover.png",
    alt: "Profitability Analysis & Pricing Strategy cover image showing business analytics dashboard",
  },

  sections: [
    {
      id: "business-problem",
      title: "Business Problem",
      paragraphs: [
        "In many businesses, optimization is driven by sales volume rather than profit.",
        "This leads to wrong decisions: aggressive discounting, \"star\" products that actually lose money, and unprofitable growth.",
        "The real objective is to understand profitability by product, customer, segment, region, and time, identifying pricing, discount, and logistics levers.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-1.png",
          alt: "Dashboard showing sales vs profitability comparison",
          caption: "High sales do not imply high profitability. Profit is the real metric.",
        },
      ],
    },
    {
      id: "analytical-architecture",
      title: "Analytical Architecture",
      paragraphs: [
        "The project is designed as a complete analytical pipeline, from operational dataset validation to the generation of a dataset prepared for profit modeling.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/architecture.png",
          alt: "System architecture diagram showing the analytical pipeline",
          caption: "Analytical pipeline from transactional data to an ML-ready dataset.",
        },
      ],
    },
    {
      id: "data-ingestion",
      title: "Data Ingestion & Validation",
      paragraphs: [
        "The Store.csv dataset is loaded with date parsing and basic data quality validations to ensure decisions are based on consistent data.",
      ],
      bullets: [
        "Early verification of missing values and duplicates",
        "Correct data types for dates and economic metrics",
        "Consistency checks before extracting conclusions",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-4.png",
          alt: "Initial dataset view showing column structure",
          caption: "Initial dataset view: column structure and key sales, customer, and product metrics.",
        },
        {
          src: "/projects/profitability-analysis/dashboard-5.png",
          alt: "Data validation results",
          caption: "Data type validation, parsed dates, and absence of missing values before analysis.",
        },
      ],
      imageLayout: "grid-2",
    },
    {
      id: "feature-engineering",
      title: "Business-Oriented Feature Engineering",
      paragraphs: [
        "Feature engineering translates transactional variables into real economic and operational indicators:",
      ],
      bullets: [
        "Estimated cost per order",
        "Profit margin (%)",
        "Profitable vs non-profitable orders",
        "Effective unit price",
        "Days to ship",
        "Discount bands",
        "Temporal variables",
      ],
      paragraphs2: [
        "These variables allow the analysis to move from \"what sells\" to \"what generates value\".",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-6.png",
          alt: "Feature engineering showing financial and operational variables",
          caption: "Financial and operational variables connecting data to real business decisions.",
        },
      ],
    },
    {
      id: "global-eda",
      title: "Global EDA: Profit & Loss View",
      paragraphs: [
        "A simplified P&L-style global view is built:",
      ],
      bullets: [
        "Total sales",
        "Costs",
        "Profit",
        "Aggregated margin",
      ],
      paragraphs2: [
        "This answers the first fundamental question: Is the business profitable overall?",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-1.png",
          alt: "Executive P&L view showing sales, costs, and profit",
          caption: "Executive view of the global economic result (sales, costs, and profit).",
        },
      ],
    },
    {
      id: "product-profitability",
      title: "Profitability by Product & Category",
      paragraphs: [
        "The analysis goes down to the level where problems usually appear:",
      ],
      bullets: [
        "Categories with high sales but low contribution",
        "Sub-categories with systematic losses",
        "Top products by sales vs top products by profit",
      ],
      paragraphs2: [
        "This is where \"star\" lines and margin-destroying lines are identified.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-7.png",
          alt: "Sales volume by product line chart",
          caption: "Sales volume by product line.",
        },
        {
          src: "/projects/profitability-analysis/dashboard-3.png",
          alt: "Real profitability by product line",
          caption: "Real profitability by product line.",
        },
      ],
      imageLayout: "grid-2",
    },
    {
      id: "discount-analysis",
      title: "Discounts, Quantity & Margin Levers",
      paragraphs: [
        "The real impact of discounts is analyzed:",
      ],
      bullets: [
        "Discount vs Profit",
        "Discount vs Sales",
        "Quantity vs Profit",
      ],
      paragraphs2: [
        "This allows evaluation of whether discounts increase profit, only push volume, or directly destroy margin.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-2.png",
          alt: "Discount impact analysis chart",
          caption: "High discounts do not guarantee profitability.",
        },
      ],
    },
    {
      id: "temporal-dimension",
      title: "Temporal Dimension",
      paragraphs: [
        "Temporal analysis makes it possible to identify:",
      ],
      bullets: [
        "Year-over-year growth",
        "Monthly seasonality",
        "Category-level differences over time",
      ],
      paragraphs2: [
        "This is key for dynamic pricing and planning decisions.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-8.png",
          alt: "Temporal evolution of sales by category",
          caption: "Temporal evolution of sales by category.",
        },
      ],
    },
    {
      id: "geography-segments",
      title: "Geography & Segments",
      paragraphs: [
        "The commercial mix is analyzed by:",
      ],
      bullets: [
        "City",
        "State",
        "Region",
        "Customer segment",
      ],
      paragraphs2: [
        "The objective is to detect profitable markets, regions that sell but do not earn, and segments that destroy value.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-9.png",
          alt: "Regional profitability analysis",
          caption: "Uneven profitability across regions.",
        },
      ],
    },
    {
      id: "logistics",
      title: "Logistics & Customer Experience",
      paragraphs: [
        "The operational dimension is incorporated:",
      ],
      bullets: [
        "Ship Mode",
        "Days to ship",
        "Relationship between logistics, sales, and profit",
      ],
      paragraphs2: [
        "This enables discussion of real trade-offs between logistics cost and margin.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-10.png",
          alt: "Shipping mode operational impact",
          caption: "Operational impact of shipping mode.",
        },
      ],
    },
    {
      id: "ml-preparation",
      title: "ML Preparation",
      paragraphs: [
        "The project does not stop at analysis:",
      ],
      bullets: [
        "One-hot encoding",
        "Feature selection",
        "Target definition (Profit)",
        "Train / test split",
      ],
      paragraphs2: [
        "The dataset is left ready to model pricing and profitability scenarios.",
      ],
      images: [
        {
          src: "/projects/profitability-analysis/dashboard-11.png",
          alt: "Transformed dataset ready for ML",
          caption: "Transformed dataset ready for predictive modeling.",
        },
      ],
    },
    {
      id: "outcome",
      title: "Outcome",
      paragraphs: [
        "The result is a profitability analysis system, not a decorative EDA.",
        "It allows identification of what to sell, to whom, where, and at what price.",
        "A solid foundation for pricing, promotion, and logistics decisions.",
      ],
    },
    {
      id: "scalability",
      title: "Scalability & Next Steps",
      paragraphs: [
        "The design allows the system to evolve towards:",
      ],
      bullets: [
        "Profit predictive models",
        "Discount scenario simulation",
        "Margin optimization",
        "Integration into business dashboards",
      ],
    },
  ],

  callouts: [
    {
      id: "key-decisions",
      type: "decisions",
      title: "Key Technical Decisions",
      items: [
        "Focus on profit, not sales",
        "Feature engineering translates business logic, not cosmetic data",
        "Real impact of discounts and logistics is analyzed",
        "The system is prepared for future ML development",
      ],
    },
    {
      id: "what-i-didnt-do",
      type: "didnt-do",
      title: "What I Didn't Do (And Why)",
      items: [
        "No models were trained yet: business understanding comes first",
        "Optimization by volume was avoided: it does not reflect profitability",
        "Unnecessary complexity was deliberately avoided",
      ],
    },
  ],

  links: [
    {
      label: "Source Code",
      href: "https://github.com/dblacasmos/Profitability-Analysis-Pricing-Strategy.git",
      variant: "primary",
      icon: "github",
    },
    {
      label: "Reproducible Notebook",
      href: "https://github.com/dblacasmos/Profitability-Analysis-Pricing-Strategy/blob/main/Profitability_Analysis_Pricing_Strategy_FIXED.ipynb",
      variant: "secondary",
      icon: "external",
    },
    {
      label: "Technical Documentation",
      href: "https://github.com/dblacasmos/Profitability-Analysis-Pricing-Strategy/blob/main/README.md",
      variant: "outline",
      icon: "docs",
    },
  ],

  seo: {
    title: "Profitability Analysis & Pricing Strategy | David Blanco Casasola",
    description:
      "Case study: Building a profitability and pricing analysis system using Python, Pandas, and business analytics to understand what generates value beyond sales volume.",
    ogImage: "/projects/profitability-analysis/cover.png",
    canonical: "https://dblacasmos.dev/projects/profitability-analysis-pricing-strategy",
  },
};
