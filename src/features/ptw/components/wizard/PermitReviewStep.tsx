import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePTWTypes, usePTWProjects } from "@/hooks/ptw";
import { useSites } from "@/hooks/use-sites";
import { format } from "date-fns";
import { 
  MapPin, 
  Calendar, 
  FileText, 
  User, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Flame,
  Construction,
  Shield,
  Shovel,
  Radiation,
  Zap,
  Mountain,
  FileWarning
} from "lucide-react";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  HOT_WORK: Flame,
  LIFTING: Construction,
  CONFINED_SPACE: Shield,
  EXCAVATION: Shovel,
  RADIOGRAPHY: Radiation,
  ELECTRICAL: Zap,
  HEIGHT: Mountain,
};

interface PermitReviewStepProps {
  data: {
    project_id?: string;
    type_id?: string;
    site_id?: string;
    location_details?: string;
    planned_start_time?: string;
    planned_end_time?: string;
    job_description?: string;
    operational_data?: Record<string, unknown>;
    safety_responses?: Array<{
      requirement_id: string;
      is_checked: boolean;
    }>;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    risk_assessment_ref?: string;
  };
}

export function PermitReviewStep({ data }: PermitReviewStepProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  
  const { data: permitTypes } = usePTWTypes();
  const { data: projects } = usePTWProjects();
  const { data: sites } = useSites();

  const selectedType = permitTypes?.find(pt => pt.id === data.type_id);
  const selectedProject = projects?.find(p => p.id === data.project_id);
  const selectedSite = sites?.find(s => s.id === data.site_id);
  
  const IconComponent = selectedType?.code 
    ? permitTypeIcons[selectedType.code] || FileWarning 
    : FileWarning;

  const checkedRequirements = data.safety_responses?.filter(r => r.is_checked).length || 0;
  const totalRequirements = data.safety_responses?.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="text-center py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <IconComponent className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">
          {isRTL && selectedType?.name_ar ? selectedType.name_ar : selectedType?.name || t("ptw.review.unknownType", "Unknown Type")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {selectedProject?.name || t("ptw.review.noProject", "No project selected")}
        </p>
      </div>

      <Separator />

      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t("ptw.review.basicInfo", "Basic Information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("ptw.review.location", "Location")}</p>
              <p className="text-sm text-muted-foreground">
                {selectedSite?.name || t("ptw.review.noSite", "Not specified")}
                {data.location_details && ` • ${data.location_details}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("ptw.review.schedule", "Schedule")}</p>
              <p className="text-sm text-muted-foreground">
                {data.planned_start_time 
                  ? format(new Date(data.planned_start_time), "PPp")
                  : t("ptw.review.notSet", "Not set")}
                {" → "}
                {data.planned_end_time 
                  ? format(new Date(data.planned_end_time), "PPp")
                  : t("ptw.review.notSet", "Not set")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("ptw.review.jobDescription", "Job Description")}</p>
              <p className="text-sm text-muted-foreground">
                {data.job_description || t("ptw.review.noDescription", "No description provided")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Data Summary */}
      {data.operational_data && Object.keys(data.operational_data).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("ptw.review.operationalData", "Operational Data")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(data.operational_data).map(([key, value]) => {
                if (value === null || value === undefined || value === "") return null;
                const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formattedKey}:</span>
                    <span className="font-medium">
                      {typeof value === "boolean" 
                        ? (value ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />)
                        : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            {t("ptw.review.safetyChecklist", "Safety Checklist")}
            <Badge variant={checkedRequirements === totalRequirements ? "default" : "secondary"}>
              {checkedRequirements}/{totalRequirements} {t("ptw.review.checked", "checked")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.risk_assessment_ref && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("ptw.review.riskAssessment", "Risk Assessment")}:</span>
              <span className="font-medium">{data.risk_assessment_ref}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t("ptw.review.emergencyContact", "Emergency Contact")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {data.emergency_contact_name || t("ptw.review.notProvided", "Not provided")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {data.emergency_contact_number || t("ptw.review.notProvided", "Not provided")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Permit Type Badges */}
      {selectedType && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedType.requires_gas_test && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t("ptw.form.requiresGasTest", "Requires Gas Test")}
            </Badge>
          )}
          {selectedType.requires_loto && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t("ptw.form.requiresLOTO", "Requires LOTO")}
            </Badge>
          )}
          <Badge variant="secondary">
            {t("ptw.form.validityHours", "Valid for {{hours}}h", { hours: selectedType.validity_hours })}
          </Badge>
        </div>
      )}

      {/* Submission Notice */}
      <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
        {t("ptw.review.submissionNotice", "By submitting this permit request, you confirm that all information provided is accurate and complete. The permit will be sent for approval.")}
      </div>
    </div>
  );
}
