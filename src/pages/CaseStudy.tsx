import { useParams, Navigate } from "react-router-dom";
import { getCaseStudyBySlug } from "@/data/caseStudies";
import CaseStudyPage from "@/components/caseStudy/CaseStudyPage";

export default function CaseStudy() {
  const { slug } = useParams<{ slug: string }>();

  // Get case study data by slug
  const caseStudyData = slug ? getCaseStudyBySlug(slug) : undefined;

  // Redirect to 404 if case study not found
  if (!caseStudyData) {
    return <Navigate to="/404" replace />;
  }

  return <CaseStudyPage data={caseStudyData} />;
}
