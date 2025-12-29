import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RiskAssessmentWizard } from "@/components/risk-assessment";

export default function RiskAssessmentCreate() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  
  const projectId = searchParams.get("projectId") || undefined;
  const contractorId = searchParams.get("contractorId") || undefined;

  return (
    <div className="container mx-auto py-6">
      <RiskAssessmentWizard
        projectId={projectId}
        contractorId={contractorId}
      />
    </div>
  );
}
