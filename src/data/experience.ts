export interface Experience {
  id: string;
  title: string;
  company: string;
  period: string;
  location: string;
  description: string;
  highlights?: string[];
}

export const experiences: Experience[] = [
  {
    id: "fundacion-siglo-xxi",
    title: "Security Operations Coordinator",
    company: "Fundación Siglo XXI",
    period: "03/2018 – present",
    location: "Madrid, Spain",
    description:
      "Operations in regulated judicial environments, compliance, risk analysis, incident coordination, team leadership.",
    highlights: [
      "Operations in regulated judicial environments",
      "Compliance and risk analysis",
      "Incident coordination and team leadership",
    ],
  },
  {
    id: "securitas",
    title: "Security Guard",
    company: "Securitas",
    period: "06/2015 – 03/2018",
    location: "Madrid, Spain",
    description:
      "Prevention, incident response, coordination with authorities, strict procedures.",
    highlights: [
      "Prevention and incident response",
      "Coordination with authorities",
      "Strict procedural adherence",
    ],
  },
  {
    id: "spanish-armed-forces",
    title: "Military Personnel",
    company: "Spanish Armed Forces",
    period: "12/2004 – 04/2013",
    location: "Madrid, Spain",
    description:
      "International missions, operational discipline, teamwork in complex organizations.",
    highlights: [
      "International missions",
      "Operational discipline",
      "Teamwork in complex organizations",
    ],
  },
];
