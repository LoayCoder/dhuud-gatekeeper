import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, MapPin, AlertTriangle, Shield, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskAssessment } from "@/features/risk-assessment/hooks/use-risk-assessments";
import { useRiskAssessmentDetails } from "@/features/risk-assessment/hooks/use-risk-assessment-details";
import { useRiskAssessmentTeam, type RiskAssessmentTeamMember } from "@/features/risk-assessment/hooks/use-risk-assessment-team";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  under_review: { label: "Under Review", variant: "default" },
  approved: { label: "Approved", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
};

const riskRatingConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function getRiskLevelClass(score: number | null) {
  if (!score) return "text-muted-foreground";
  if (score <= 4) return "text-green-600";
  if (score <= 9) return "text-yellow-600";
  if (score <= 16) return "text-orange-600";
  return "text-red-600";
}

export default function RiskAssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  const { data: assessment, isLoading: loadingAssessment, error: assessmentError } = useRiskAssessment(id);
  const { data: hazards = [], isLoading: loadingHazards } = useRiskAssessmentDetails(id);
  const { data: team = [], isLoading: loadingTeam } = useRiskAssessmentTeam(id);

  if (loadingAssessment) {
    return (
      <div className="container mx-auto p-4 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (assessmentError || !assessment) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              {direction === "rtl" ? "تقييم المخاطر غير موجود" : "Risk assessment not found"}
            </p>
            <Button variant="outline" onClick={() => navigate("/risk-assessments")}>
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {direction === "rtl" ? "العودة للقائمة" : "Back to list"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[assessment.status] || { label: assessment.status, variant: "secondary" as const };
  const riskRating = assessment.overall_risk_rating ? riskRatingConfig[assessment.overall_risk_rating] : null;

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-4xl" dir={direction}>
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/risk-assessments")} className="gap-2">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {direction === "rtl" ? "العودة" : "Back"}
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono">{assessment.assessment_number}</p>
              <CardTitle className="text-xl">
                {direction === "rtl" && assessment.activity_name_ar
                  ? assessment.activity_name_ar
                  : assessment.activity_name}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {riskRating && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskRating.className}`}>
                  {riskRating.label}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {assessment.activity_description && (
            <p className="text-sm text-muted-foreground">{assessment.activity_description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {assessment.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{assessment.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{format(new Date(assessment.assessment_date), "dd MMM yyyy")}</span>
            </div>
            {assessment.valid_until && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Valid until: {format(new Date(assessment.valid_until), "dd MMM yyyy")}</span>
              </div>
            )}
            {assessment.ai_risk_score != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0" />
                <span>AI Risk Score: {assessment.ai_risk_score}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hazards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {direction === "rtl" ? "المخاطر" : "Hazards"}
            {!loadingHazards && (
              <Badge variant="secondary" className="ms-2">{hazards.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHazards ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : hazards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {direction === "rtl" ? "لم يتم إضافة مخاطر بعد" : "No hazards added yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {hazards.map((hazard, idx) => (
                <div key={hazard.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold bg-muted rounded-full h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium">
                        {direction === "rtl" && hazard.hazard_description_ar
                          ? hazard.hazard_description_ar
                          : hazard.hazard_description}
                      </p>
                    </div>
                    {hazard.hazard_category && (
                      <Badge variant="outline" className="shrink-0 text-xs">{hazard.hazard_category}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {hazard.initial_risk_score != null && (
                      <span className={getRiskLevelClass(hazard.initial_risk_score)}>
                        Initial: {hazard.likelihood}×{hazard.severity} = {hazard.initial_risk_score}
                      </span>
                    )}
                    {hazard.residual_risk_score != null && (
                      <>
                        <span>→</span>
                        <span className={getRiskLevelClass(hazard.residual_risk_score)}>
                          Residual: {hazard.residual_likelihood}×{hazard.residual_severity} = {hazard.residual_risk_score}
                        </span>
                      </>
                    )}
                  </div>

                  {hazard.existing_controls && Array.isArray(hazard.existing_controls) && hazard.existing_controls.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">
                        {direction === "rtl" ? "الضوابط:" : "Controls:"}
                      </span>
                      <span className="ms-1 text-muted-foreground">
                        {hazard.existing_controls.map((c: unknown) =>
                          typeof c === "string" ? c : typeof c === "object" && c && "description" in c ? (c as { description: string }).description : ""
                        ).filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team & Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {direction === "rtl" ? "الفريق والتوقيعات" : "Team & Signatures"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTeam ? (
            <Skeleton className="h-20 w-full" />
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {direction === "rtl" ? "لا يوجد أعضاء فريق" : "No team members"}
            </p>
          ) : (
            <div className="space-y-2">
              {team.map((member: Record<string, unknown>) => (
                <div key={String(member.id)} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {String(member.member_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{String(member.member_name || "—")}</p>
                      {member.role && <p className="text-xs text-muted-foreground">{String(member.role)}</p>}
                    </div>
                  </div>
                  {member.signed_at ? (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      {direction === "rtl" ? "تم التوقيع" : "Signed"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {direction === "rtl" ? "في الانتظار" : "Pending"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
