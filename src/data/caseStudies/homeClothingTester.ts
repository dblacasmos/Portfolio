import type { CaseStudyData } from "@/types/caseStudy";

export const homeClothingTesterCaseStudy: CaseStudyData = {
  slug: "home-clothing-tester",
  title: "Home Clothing Tester",
  subtitle:
    "Full-stack web application designed to preview clothing using a camera, manage favorites and user accounts, and operate the system through an administration panel and a metrics dashboard.",

  roles: [
    "Full-Stack",
    "Frontend Web",
    "Backend API",
    "Dockerization",
    "Dashboarding",
  ],
  stack: [
    "PHP (MVC)",
    "Java (Spring Boot)",
    "MySQL",
    "JavaScript",
    "Three.js",
    "Streamlit",
    "Docker Compose",
    "PowerShell",
  ],

  heroImage: {
    src: "/projects/home-clothing-tester/cover.png",
    alt: "Home Clothing Tester application cover showing the main interface",
  },

  sections: [
    {
      id: "business-problem",
      title: "Business Problem",
      paragraphs: [
        "Buying clothes online has a clear friction point: users cannot visualize the product in their own context.",
        "This reduces conversion rates and increases returns.",
        "The goal of the system is to improve the catalog exploration experience by incorporating visualization, camera preview, and interaction signals such as favorites and navigation.",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/problem-1.png",
          alt: "Diagram showing online clothing purchase friction points",
          caption:
            "Improving catalog exploration through visualization and camera preview.",
        },
      ],
    },
    {
      id: "system-architecture",
      title: "System Architecture",
      paragraphs: [
        "Modular system designed as a real product:",
      ],
      bullets: [
        "Web App (PHP MVC): UI, sessions, catalog, favorites, user/admin flows",
        "Camera Preview (Frontend JS): Webcam access and real-time visualization (non-adaptive)",
        "API (Spring Boot): Backend services and data access",
        "MySQL: Persistence for users, catalog, and activity",
        "Streamlit: Operational metrics dashboard",
        "Docker Compose + PowerShell: Reproducible deployment on Windows",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/architecture.png",
          alt: "System architecture diagram showing all components",
          caption:
            "Modular full-stack architecture: frontend, backend, database, and dashboard.",
        },
      ],
    },
    {
      id: "functional-flows",
      title: "Functional Flows and Roles",
      paragraphs: [
        "The system is designed with a clear separation between user, administrator, and external system flows, ensuring responsibility separation and access control.",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/use-cases.png",
          alt: "Use case diagram showing different user roles and their interactions",
          caption:
            "System use cases differentiated by role: user, administrator, and external systems.",
        },
      ],
    },
    {
      id: "data-model",
      title: "Data Model (MySQL)",
      paragraphs: [
        "Domain design and its relational implementation, aligned with the system's functional flows.",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/data-model-classes.png",
          alt: "Class diagram showing domain model relationships",
          caption:
            "Domain model and main system relationships (users, purchases, catalog, and administration).",
        },
        {
          src: "/projects/home-clothing-tester/data-model-er.png",
          alt: "Entity-relationship diagram for MySQL database",
          caption:
            "Entity–relationship model used for the MySQL implementation.",
        },
      ],
      imageLayout: "grid-2",
    },
    {
      id: "camera-preview",
      title: "Camera Preview (Frontend)",
      paragraphs: [
        "Client-side camera functionality:",
      ],
      bullets: [
        "Explicit permission request",
        "Real-time video stream visualization",
        "Integrated into the navigation experience",
      ],
      paragraphs2: [
        "⚠️ Non-adaptive. No body fitting or inference is performed.",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/video/camera-preview-1.mp4",
          alt: "Camera preview interface showing live video stream",
          caption:
            "Camera preview feature: real-time webcam visualization without adaptive try-on.",
        },
      ],
    },
    {
      id: "catalog-queries",
      title: "Catalog and Dynamic Queries",
      paragraphs: [
        "The system allows querying catalog data and generating aggregated views by category, providing a foundation for sales analysis and decision-making.",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/catalog-1.png",
          alt: "Catalog view showing product categories and aggregated data",
          caption:
            "Aggregated catalog view: category ranking by units sold and revenue.",
        },
      ],
    },
    {
      id: "favorites",
      title: "Favorites and User Experience",
      paragraphs: [
        "Real product features:",
      ],
      bullets: [
        "Add / remove favorites",
        "Persistent personal list",
        "Direct signal of user interest",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/favorites-1.png",
          alt: "Favorites management interface",
          caption: "Favorites management as a signal of user intent.",
        },
      ],
    },
    {
      id: "admin-panel",
      title: "Administration Panel",
      paragraphs: [
        "Operational tools:",
      ],
      bullets: [
        "User management",
        "State control",
        "Basic metrics",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/admin-1.png",
          alt: "Administration panel interface",
          caption: "Administration panel for system operation.",
        },
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard (Streamlit)",
      paragraphs: [
        "Standalone dashboard for observability:",
      ],
      bullets: [
        "Usage metrics",
        "Basic KPIs",
        "System activity",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/dashboard-1.png",
          alt: "Streamlit dashboard showing operational metrics",
          caption:
            "Operational dashboard built with Streamlit and connected to MySQL.",
        },
      ],
    },
    {
      id: "validation-scripts",
      title: "Validation and Scripts",
      paragraphs: [
        "Utility scripts for robustness:",
      ],
      bullets: [
        "Path verification",
        "Asset validation",
        "Early error detection",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/verification-1.png",
          alt: "Validation script output showing system checks",
          caption: "Validation scripts to prevent silent system breakages.",
        },
      ],
    },
    {
      id: "deployment",
      title: "Reproducible Deployment",
      paragraphs: [
        "Windows environment automation:",
      ],
      bullets: [
        "Docker validation",
        "Service startup",
        "Error-free verification",
      ],
      images: [
        {
          src: "/projects/home-clothing-tester/video/deploy-1.mp4",
          alt: "Docker deployment process showing container startup",
          caption:
            "Reproducible system startup using Docker and PowerShell.",
        },
      ],
    },
    {
      id: "outcome",
      title: "Outcome",
      paragraphs: [
        "The system delivers:",
      ],
      bullets: [
        "Catalog exploration",
        "Functional camera preview",
        "Favorites and user accounts",
        "Administration tools",
        "Operational dashboard",
      ],
      paragraphs2: [
        "A deployable full-stack product, not an isolated demo.",
      ],
    },
    {
      id: "scalability",
      title: "Scalability & Next Steps",
      paragraphs: [
        "The design allows the system to evolve towards:",
      ],
      bullets: [
        "Behavioral analytics",
        "Data-driven recommendations",
        "Authentication hardening",
        "Asset optimization / CDN",
      ],
    },
  ],

  callouts: [
    {
      id: "key-decisions",
      type: "decisions",
      title: "Key Technical Decisions",
      items: [
        "Simple and honest camera preview",
        "Modular and maintainable architecture",
        "Docker Compose for reproducibility",
        "PowerShell scripts for Windows",
        "Clear separation of roles and flows",
      ],
    },
    {
      id: "what-i-didnt-do",
      type: "didnt-do",
      title: "What I Didn't Do (And Why)",
      items: [
        "Did not implement adaptive try-on without a solid technical basis",
        "Did not introduce ML without real data",
        "Did not add unnecessary complexity",
      ],
    },
  ],

  links: [
    {
      label: "Source Code",
      href: "https://github.com/dblacasmos/Home_Clothing_Tester",
      variant: "primary",
      icon: "github",
    },
    {
      label: "Technical Documentation",
      href: "https://github.com/dblacasmos/Home_Clothing_Tester/blob/main/README.es.md",
      variant: "outline",
      icon: "docs",
    },
  ],

  seo: {
    title: "Home Clothing Tester | David Blanco Casasola",
    description:
      "Case study: Full-stack web application for clothing preview with camera integration, favorites management, administration panel, and operational dashboard using PHP, Spring Boot, and Docker.",
    ogImage: "/projects/home-clothing-tester/cover.png",
    canonical: "https://dblacasmos.dev/projects/home-clothing-tester",
  },
};
