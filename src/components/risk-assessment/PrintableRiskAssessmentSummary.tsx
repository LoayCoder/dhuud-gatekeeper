import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Shield, Users, FileText } from "lucide-react";

interface Hazard {
  id: string;
  hazard_description: string;
  likelihood: number;
  severity: number;
  residual_likelihood?: number;
  residual_severity?: number;
  existing_controls?: { description: string }[];
  additional_controls?: { description: string; responsible?: string; target_date?: string }[];
}

interface TeamMember {
  role: string;
  role_ar?: string;
  user_id?: string;
  worker_id?: string;
  signed_at?: string;
}

interface PrintableRiskAssessmentSummaryProps {
  assessmentNumber: string;
  activityName: string;
  activityDescription?: string;
  location?: string;
  validUntil?: string;
  activityType?: string;
  workEnvironment?: string;
  scopeDescription?: string;
  applicableLegislation?: string[];
  overallRiskRating?: string;
  riskTolerance?: string;
  acceptanceJustification?: string;
  reviewFrequency?: string;
  nextReviewDate?: string;
  hazards: Hazard[];
  teamMembers?: TeamMember[];
  createdBy?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  className?: string;
}

const getRiskColor = (score: number): string => {
  if (score <= 4) return "bg-emerald-500";
  if (score <= 9) return "bg-amber-500";
  if (score <= 15) return "bg-orange-500";
  return "bg-red-500";
};

const getRiskLabel = (score: number): string => {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 15) return "High";
  return "Critical";
};

export const PrintableRiskAssessmentSummary = forwardRef<HTMLDivElement, PrintableRiskAssessmentSummaryProps>(
  ({
    assessmentNumber,
    activityName,
    activityDescription,
    location,
    validUntil,
    activityType,
    workEnvironment,
    scopeDescription,
    applicableLegislation,
    overallRiskRating,
    riskTolerance,
    acceptanceJustification,
    reviewFrequency,
    nextReviewDate,
    hazards,
    teamMembers,
    createdBy,
    createdAt,
    approvedBy,
    approvedAt,
    className,
  }, ref) => {
    const { t } = useTranslation();

    const stats = useMemo(() => {
      const totalInitial = hazards.reduce((sum, h) => sum + h.likelihood * h.severity, 0);
      const totalResidual = hazards.reduce((sum, h) => {
        const l = h.residual_likelihood || h.likelihood;
        const s = h.residual_severity || h.severity;
        return sum + l * s;
      }, 0);
      const reduction = totalInitial > 0 ? Math.round(((totalInitial - totalResidual) / totalInitial) * 100) : 0;
      
      return { totalInitial, totalResidual, reduction };
    }, [hazards]);

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white text-black p-8 max-w-[210mm] mx-auto print:max-w-none print:p-4",
          "font-sans text-sm leading-relaxed",
          className
        )}
        style={{ fontFamily: "'Rubik', sans-serif" }}
      >
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("risk.pdf.title", "Risk Assessment Report")}
              </h1>
              <p className="text-lg font-semibold text-gray-700 mt-1">{activityName}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-gray-500">{t("risk.pdf.referenceId", "Reference ID")}</p>
              <p className="font-mono font-bold text-lg">{assessmentNumber}</p>
              <p className="text-xs text-gray-500 mt-2">
                {t("risk.pdf.generatedOn", "Generated on")} {format(new Date(), "dd MMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Details Section */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            <FileText className="w-4 h-4" />
            {t("risk.step1.title", "Activity Details")}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">{t("risk.activity.type", "Activity Type")}</p>
              <p className="font-medium capitalize">{activityType || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.location", "Location")}</p>
              <p className="font-medium">{location || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.environment", "Work Environment")}</p>
              <p className="font-medium capitalize">{workEnvironment || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.validUntil", "Valid Until")}</p>
              <p className="font-medium">{validUntil ? format(new Date(validUntil), "dd MMM yyyy") : "-"}</p>
            </div>
          </div>
          {activityDescription && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs">{t("risk.description", "Description")}</p>
              <p className="text-sm">{activityDescription}</p>
            </div>
          )}
          {scopeDescription && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs">{t("risk.scope", "Scope")}</p>
              <p className="text-sm">{scopeDescription}</p>
            </div>
          )}
        </section>

        {/* Risk Matrix Comparison - Static for print */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            {t("risk.pdf.riskComparison", "Risk Comparison")}
          </h2>
          
          <div className="flex items-center justify-center gap-8 my-4">
            {/* Initial Risk Matrix (Mini) */}
            <div className="text-center">
              <p className="text-xs font-semibold mb-2">{t("risk.matrix.initialRisk", "Initial Risk")}</p>
              <PrintMiniMatrix hazards={hazards} showResidual={false} />
              <p className="text-xs mt-1 text-gray-600">
                {t("risk.matrix.totalScore", "Total")}: {stats.totalInitial}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center">
              <div className="text-2xl">→</div>
              <p className="text-xs font-bold text-emerald-600">↓{stats.reduction}%</p>
            </div>

            {/* Residual Risk Matrix (Mini) */}
            <div className="text-center">
              <p className="text-xs font-semibold mb-2">{t("risk.matrix.residualRisk", "Residual Risk")}</p>
              <PrintMiniMatrix hazards={hazards} showResidual={true} />
              <p className="text-xs mt-1 text-gray-600">
                {t("risk.matrix.totalScore", "Total")}: {stats.totalResidual}
              </p>
            </div>
          </div>
        </section>

        {/* Hazard Summary Table */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            <Shield className="w-4 h-4" />
            {t("risk.pdf.hazardSummary", "Hazard Summary")}
          </h2>
          
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-start">#</th>
                <th className="border border-gray-300 p-2 text-start">{t("risk.hazard.description", "Hazard")}</th>
                <th className="border border-gray-300 p-2 text-center">{t("risk.matrix.initialRisk", "Initial")}</th>
                <th className="border border-gray-300 p-2 text-center">{t("risk.matrix.residualRisk", "Residual")}</th>
                <th className="border border-gray-300 p-2 text-center">{t("risk.matrix.reduction", "Reduction")}</th>
              </tr>
            </thead>
            <tbody>
              {hazards.map((hazard, index) => {
                const initialScore = hazard.likelihood * hazard.severity;
                const residualScore = (hazard.residual_likelihood || hazard.likelihood) * (hazard.residual_severity || hazard.severity);
                const reduction = initialScore > 0 ? Math.round(((initialScore - residualScore) / initialScore) * 100) : 0;
                
                return (
                  <tr key={hazard.id}>
                    <td className="border border-gray-300 p-2">{index + 1}</td>
                    <td className="border border-gray-300 p-2">{hazard.hazard_description}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={cn(
                        "inline-block w-6 h-6 rounded text-white text-xs font-bold leading-6",
                        getRiskColor(initialScore)
                      )}>
                        {initialScore}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={cn(
                        "inline-block w-6 h-6 rounded text-white text-xs font-bold leading-6",
                        getRiskColor(residualScore)
                      )}>
                        {residualScore}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={cn(
                        "font-bold",
                        reduction > 0 ? "text-emerald-600" : "text-gray-500"
                      )}>
                        {reduction > 0 ? `↓${reduction}%` : "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Control Measures */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            <CheckCircle2 className="w-4 h-4" />
            {t("risk.pdf.controlMeasures", "Control Measures")}
          </h2>
          
          {hazards.map((hazard, index) => (
            <div key={hazard.id} className="mb-4 p-3 border border-gray-200 rounded">
              <p className="font-semibold text-xs mb-2">
                {index + 1}. {hazard.hazard_description}
              </p>
              
              {hazard.existing_controls && hazard.existing_controls.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500">{t("risk.controls.existing", "Existing Controls")}:</p>
                  <ul className="list-disc list-inside text-xs ms-2">
                    {hazard.existing_controls.map((c, i) => (
                      <li key={i}>{c.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {hazard.additional_controls && hazard.additional_controls.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">{t("risk.controls.additional", "Additional Controls")}:</p>
                  <ul className="list-disc list-inside text-xs ms-2">
                    {hazard.additional_controls.map((c, i) => (
                      <li key={i}>
                        {c.description}
                        {c.responsible && <span className="text-gray-400"> ({c.responsible})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Risk Decision */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            {t("risk.pdf.riskDecision", "Risk Acceptability Decision")}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">{t("risk.overall.rating", "Overall Risk Rating")}</p>
              <p className="font-bold capitalize">{overallRiskRating || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.tolerance", "Risk Tolerance")}</p>
              <p className="font-medium">{riskTolerance?.replace(/_/g, " ") || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.reviewFrequency", "Review Frequency")}</p>
              <p className="font-medium capitalize">{reviewFrequency || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t("risk.nextReview", "Next Review Date")}</p>
              <p className="font-medium">
                {nextReviewDate ? format(new Date(nextReviewDate), "dd MMM yyyy") : "-"}
              </p>
            </div>
          </div>
          {acceptanceJustification && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs">{t("risk.justification", "Justification")}</p>
              <p className="text-sm">{acceptanceJustification}</p>
            </div>
          )}
        </section>

        {/* Team & Signatures */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            <Users className="w-4 h-4" />
            {t("risk.pdf.signatures", "Team & Signatures")}
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-300 p-3 rounded">
              <p className="text-xs text-gray-500">{t("risk.pdf.preparedBy", "Prepared By")}</p>
              <p className="font-medium text-sm">{createdBy || "-"}</p>
              <p className="text-xs text-gray-400 mt-1">
                {createdAt ? format(new Date(createdAt), "dd MMM yyyy") : ""}
              </p>
              <div className="h-8 border-b border-gray-300 mt-4 mb-1" />
              <p className="text-[10px] text-gray-400">{t("risk.signature", "Signature")}</p>
            </div>
            
            <div className="border border-gray-300 p-3 rounded">
              <p className="text-xs text-gray-500">{t("risk.pdf.reviewedBy", "Reviewed By")}</p>
              <p className="font-medium text-sm">-</p>
              <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              <div className="h-8 border-b border-gray-300 mt-4 mb-1" />
              <p className="text-[10px] text-gray-400">{t("risk.signature", "Signature")}</p>
            </div>
            
            <div className="border border-gray-300 p-3 rounded">
              <p className="text-xs text-gray-500">{t("risk.pdf.approvedBy", "Approved By")}</p>
              <p className="font-medium text-sm">{approvedBy || "-"}</p>
              <p className="text-xs text-gray-400 mt-1">
                {approvedAt ? format(new Date(approvedAt), "dd MMM yyyy") : ""}
              </p>
              <div className="h-8 border-b border-gray-300 mt-4 mb-1" />
              <p className="text-[10px] text-gray-400">{t("risk.signature", "Signature")}</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-300 pt-3 mt-6 text-xs text-gray-500 text-center">
          <p>{t("risk.pdf.confidential", "CONFIDENTIAL - For authorized use only")}</p>
        </footer>
      </div>
    );
  }
);

PrintableRiskAssessmentSummary.displayName = "PrintableRiskAssessmentSummary";

// Mini Matrix for Print
function PrintMiniMatrix({ hazards, showResidual }: { hazards: Hazard[]; showResidual: boolean }) {
  const positions: Record<string, number> = {};
  
  hazards.forEach((hazard) => {
    const l = showResidual ? (hazard.residual_likelihood || hazard.likelihood) : hazard.likelihood;
    const s = showResidual ? (hazard.residual_severity || hazard.severity) : hazard.severity;
    const key = `${l}-${s}`;
    positions[key] = (positions[key] || 0) + 1;
  });

  return (
    <div className="inline-grid grid-cols-5 gap-px bg-gray-300 p-px">
      {[5, 4, 3, 2, 1].map((likelihood) =>
        [1, 2, 3, 4, 5].map((severity) => {
          const score = likelihood * severity;
          const key = `${likelihood}-${severity}`;
          const count = positions[key] || 0;
          
          return (
            <div
              key={`${likelihood}-${severity}`}
              className={cn(
                "w-5 h-5 flex items-center justify-center text-[8px] font-bold text-white",
                getRiskColor(score)
              )}
            >
              {count > 0 ? count : ""}
            </div>
          );
        })
      )}
    </div>
  );
}
