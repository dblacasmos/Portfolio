import type { CaseStudyData } from "@/types/caseStudy";
import { fraudRiskScoringCaseStudy } from "./fraudRiskScoring";
import { profitabilityAnalysisCaseStudy } from "./profitabilityAnalysis";
import { petTrackingCaseStudy } from "./petTracking";

// Registry of all case studies by slug
export const caseStudies: Record<string, CaseStudyData> = {
  "fraud-risk-scoring-system": fraudRiskScoringCaseStudy,
  "profitability-analysis-pricing-strategy": profitabilityAnalysisCaseStudy,
  "pet-tracking-emotional-analytics": petTrackingCaseStudy,
};

// Helper to get a case study by slug
export function getCaseStudyBySlug(slug: string): CaseStudyData | undefined {
  return caseStudies[slug];
}

// Get all case study slugs
export function getAllCaseStudySlugs(): string[] {
  return Object.keys(caseStudies);
}
