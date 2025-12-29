import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Brain,
  Users,
  AlertTriangle,
  Shield,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RiskMatrix } from "./RiskMatrix";
import { AIHazardSuggestions } from "./AIHazardSuggestions";
import { HazardForm, type HazardFormData } from "./HazardForm";
import { TeamSignatureSection } from "./TeamSignatureSection";
import { useRiskAssessmentAI } from "@/hooks/risk-assessment";
import { useAuth } from "@/contexts/AuthContext";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";
import { supabase } from "@/integrations/supabase/client";

interface WizardProps {
  projectId?: string;
  contractorId?: string;
  onComplete?: (assessmentId: string) => void;
}

const STEPS = [
  { id: 1, key: "activity", icon: FileText },
  { id: 2, key: "ai-analysis", icon: Brain },
  { id: 3, key: "team", icon: Users },
  { id: 4, key: "hazards", icon: AlertTriangle },
  { id: 5, key: "controls", icon: Shield },
  { id: 6, key: "signatures", icon: PenTool },
];

const TEAM_ROLES = [
  { value: "team_leader", label: "Team Leader", label_ar: "قائد الفريق" },
  { value: "safety_rep", label: "Safety Representative", label_ar: "ممثل السلامة" },
  { value: "sme", label: "Subject Matter Expert", label_ar: "خبير متخصص" },
  { value: "worker_rep", label: "Worker Representative", label_ar: "ممثل العمال" },
];

const createEmptyHazard = (): HazardFormData => ({
  hazard_description: "",
  hazard_category: "physical",
  likelihood: 3,
  severity: 3,
  existing_controls: [],
  additional_controls: [],
  residual_likelihood: 2,
  residual_severity: 2,
});

export function RiskAssessmentWizard({ projectId, contractorId, onComplete }: WizardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isRTL = i18n.language === "ar";

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Project linking state
  const [isProjectLinked, setIsProjectLinked] = useState(!!projectId);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [selectedContractorId, setSelectedContractorId] = useState(contractorId || "");

  // Fetch active projects
  const { data: projects, isLoading: projectsLoading } = useContractorProjects({
    status: "active",
  });

  // Form state
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [location, setLocation] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [overallRating, setOverallRating] = useState<string>("");

  // Team state
  const [teamMembers, setTeamMembers] = useState<
    { role: string; role_ar: string; worker_id?: string; user_id?: string }[]
  >([]);

  // Hazards state
  const [hazards, setHazards] = useState<HazardFormData[]>([createEmptyHazard()]);

  // AI state
  const { analyzeActivity, suggestHazards, isLoading: aiLoading } = useRiskAssessmentAI();
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{
    risk_score?: number;
    confidence?: number;
    recommendations?: string[];
  } | null>(null);

  // Auto-populate location and contractor from selected project
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (isProjectLinked && selectedProjectId && selectedProject) {
      // Auto-populate location from project if not already set
      if (selectedProject.location_description && !location) {
        setLocation(selectedProject.location_description);
      }
      // Auto-populate contractor from project's company
      if (selectedProject.company_id) {
        setSelectedContractorId(selectedProject.company_id);
      }
    }
  }, [selectedProjectId, selectedProject, isProjectLinked, location]);

  const runAIAnalysis = useCallback(async () => {
    if (!activityName || !activityDescription) {
      toast.error(t("risk.ai.missingInfo", "Please provide activity details first"));
      return;
    }

    try {
      const [analysisResult, hazardResult] = await Promise.all([
        analyzeActivity({
          activityName,
          activityDescription,
          location,
        }),
        suggestHazards({
          activityName,
          activityDescription,
        }),
      ]);

      if (analysisResult) {
        setAiAnalysis(analysisResult);
      }
      if (hazardResult?.hazards) {
        setAiSuggestions(hazardResult.hazards);
      }

      toast.success(t("risk.ai.analysisComplete", "AI analysis complete"));
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error(t("risk.ai.analysisFailed", "AI analysis failed"));
    }
  }, [activityName, activityDescription, location, analyzeActivity, suggestHazards, t]);

  const addAISuggestion = (suggestion: any) => {
    const newHazard: HazardFormData = {
      hazard_description: suggestion.description,
      hazard_description_ar: suggestion.description_ar,
      hazard_category: suggestion.category || "physical",
      likelihood: suggestion.likelihood || 3,
      severity: suggestion.severity || 3,
      existing_controls: [],
      additional_controls: suggestion.suggested_controls?.map((c: string) => ({
        description: c,
        responsible: "",
        target_date: "",
      })) || [],
      residual_likelihood: Math.max(1, (suggestion.likelihood || 3) - 1),
      residual_severity: Math.max(1, (suggestion.severity || 3) - 1),
    };
    setHazards((prev) => [...prev, newHazard]);
  };

  const updateHazard = (index: number, field: string, value: unknown) => {
    setHazards((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const removeHazard = (index: number) => {
    if (hazards.length <= 1) {
      toast.error(t("risk.hazard.atLeastOne", "At least one hazard is required"));
      return;
    }
    setHazards((prev) => prev.filter((_, i) => i !== index));
  };

  const addTeamMember = (role: typeof TEAM_ROLES[number]) => {
    if (teamMembers.some((m) => m.role === role.value)) {
      toast.error(t("risk.team.roleExists", "This role is already assigned"));
      return;
    }
    setTeamMembers((prev) => [...prev, { role: role.value, role_ar: role.label_ar }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateOverallRisk = (): string => {
    if (hazards.length === 0) return "low";
    const maxScore = Math.max(...hazards.map((h) => h.residual_likelihood * h.residual_severity));
    if (maxScore <= 4) return "low";
    if (maxScore <= 9) return "medium";
    if (maxScore <= 15) return "high";
    return "critical";
  };

  const saveAssessment = async (status: "draft" | "under_review") => {
    if (!profile?.tenant_id) {
      toast.error(t("common.error", "Error"));
      return;
    }

    setIsSaving(true);
    try {
      // Generate assessment number
      const assessmentNumber = `RA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      // Insert risk assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("risk_assessments")
        .insert({
          tenant_id: profile.tenant_id,
          assessment_number: assessmentNumber,
          contractor_id: isProjectLinked ? selectedContractorId || null : contractorId || null,
          project_id: isProjectLinked ? selectedProjectId || null : projectId || null,
          activity_name: activityName,
          activity_name_ar: null,
          activity_description: activityDescription,
          location,
          status,
          ai_risk_score: aiAnalysis?.risk_score || null,
          ai_confidence_level: aiAnalysis?.confidence || null,
          overall_risk_rating: overallRating || calculateOverallRisk(),
          valid_until: validUntil || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Insert hazard details
      if (hazards.length > 0) {
        const hazardInserts = hazards.map((h, idx) => ({
          tenant_id: profile.tenant_id,
          risk_assessment_id: assessment.id,
          hazard_description: h.hazard_description,
          hazard_description_ar: h.hazard_description_ar || null,
          hazard_category: h.hazard_category,
          likelihood: h.likelihood,
          severity: h.severity,
          existing_controls: h.existing_controls,
          additional_controls: h.additional_controls,
          residual_likelihood: h.residual_likelihood,
          residual_severity: h.residual_severity,
          sort_order: idx,
        }));

        const { error: detailsError } = await supabase
          .from("risk_assessment_details")
          .insert(hazardInserts);

        if (detailsError) throw detailsError;
      }

      // Insert team members
      if (teamMembers.length > 0) {
        const teamInserts = teamMembers.map((m) => ({
          tenant_id: profile.tenant_id,
          risk_assessment_id: assessment.id,
          role: m.role,
          role_ar: m.role_ar,
          worker_id: m.worker_id || null,
          user_id: m.user_id || user?.id,
          is_required: true,
        }));

        const { error: teamError } = await supabase
          .from("risk_assessment_team")
          .insert(teamInserts);

        if (teamError) throw teamError;
      }

      toast.success(
        status === "draft"
          ? t("risk.savedAsDraft", "Saved as draft")
          : t("risk.submittedForReview", "Submitted for review")
      );

      if (onComplete) {
        onComplete(assessment.id);
      } else {
        navigate(`/risk-assessments/${assessment.id}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("risk.saveFailed", "Failed to save assessment"));
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        const hasRequiredFields = !!activityName && !!activityDescription;
        if (isProjectLinked) {
          return hasRequiredFields && !!selectedProjectId;
        }
        return hasRequiredFields;
      case 2:
        return true; // AI analysis is optional
      case 3:
        return teamMembers.length >= 2;
      case 4:
        return hazards.length > 0 && hazards.every((h) => h.hazard_description);
      case 5:
        return hazards.every(
          (h) => h.residual_likelihood && h.residual_severity
        );
      case 6:
        return !!overallRating;
      default:
        return false;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {t("risk.wizard.title", "Risk Assessment")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`risk.wizard.step${currentStep}`, `Step ${currentStep}`)}
              </p>
            </div>
            <Badge variant="outline">
              {currentStep} / {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isActive ? "text-primary" : isComplete ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Activity Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("risk.step1.title", "Activity Details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Link Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  {t("risk.project.linkToggle", "Link to Project")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("risk.project.linkDescription", "Associate this assessment with a contractor project")}
                </p>
              </div>
              <Switch 
                checked={isProjectLinked}
                onCheckedChange={(checked) => {
                  setIsProjectLinked(checked);
                  if (!checked) {
                    setSelectedProjectId("");
                    setSelectedContractorId("");
                  }
                }}
              />
            </div>

            {/* Project Selector - Only shows when toggle is ON */}
            {isProjectLinked && (
              <div className="space-y-2">
                <Label>{t("risk.project.select", "Select Project")} *</Label>
                {projectsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("risk.project.selectPlaceholder", "Choose a project...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <span>{project.project_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({project.project_code})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Show auto-populated info */}
                {selectedProjectId && selectedProject && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-1 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{t("risk.project.contractor", "Contractor")}:</strong>{" "}
                      {selectedProject.company?.company_name || "-"}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{t("risk.project.location", "Location")}:</strong>{" "}
                      {selectedProject.location_description || "-"}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t("risk.project.autoPopulated", "Auto-populated from project")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>{t("risk.activity.name", "Activity Name")} *</Label>
              <Input
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder={t("risk.activity.namePlaceholder", "e.g., Hot Work - Welding Operations")}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t("risk.activity.location", "Location")}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("risk.activity.locationPlaceholder", "e.g., Processing Unit 2, Deck Level")}
                className="mt-1"
              />
            </div>

            <div>
              <Label>{t("risk.activity.description", "Activity Description")} *</Label>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder={t("risk.activity.descriptionPlaceholder", "Describe the work activities, equipment, duration...")}
                className="mt-1 min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: AI Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              {t("risk.step2.title", "AI Risk Analysis")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <Button
                onClick={runAIAnalysis}
                disabled={aiLoading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("risk.ai.analyzing", "Analyzing...")}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 me-2" />
                    {t("risk.ai.startAnalysis", "Start AI Analysis")}
                  </>
                )}
              </Button>
            </div>

            {aiAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700">
                      {aiAnalysis.risk_score?.toFixed(1) || "N/A"}/5.0
                    </div>
                    <div className="text-sm text-orange-600">
                      {t("risk.ai.riskScore", "AI Risk Score")}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {aiAnalysis.confidence ? `${Math.round(aiAnalysis.confidence * 100)}%` : "N/A"}
                    </div>
                    <div className="text-sm text-blue-600">
                      {t("risk.ai.confidence", "Confidence")}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {aiSuggestions.length}
                    </div>
                    <div className="text-sm text-green-600">
                      {t("risk.ai.suggestionsFound", "Hazards Identified")}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <AIHazardSuggestions
              suggestions={aiSuggestions}
              isLoading={aiLoading}
              onAddHazard={addAISuggestion}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Team Selection */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("risk.step3.title", "Assessment Team")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("risk.team.requirement", "Risk assessments must be conducted by a competent team including supervisor, safety rep, and worker representative.")}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {TEAM_ROLES.map((role) => {
                const assigned = teamMembers.find((m) => m.role === role.value);
                const roleLabel = isRTL ? role.label_ar : role.label;

                return (
                  <div
                    key={role.value}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{roleLabel}</div>
                    </div>
                    {assigned ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTeamMember(teamMembers.indexOf(assigned))}
                      >
                        {t("common.remove", "Remove")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTeamMember(role)}
                      >
                        {t("common.assign", "Assign")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {teamMembers.length < 2 && (
              <p className="text-sm text-destructive">
                {t("risk.team.minimum", "At least 2 team members are required")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Hazard Analysis */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                {t("risk.step4.title", "Hazard Identification")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskMatrix
                hazards={hazards.map((h, i) => ({
                  id: String(i),
                  likelihood: h.likelihood,
                  severity: h.severity,
                  hazard_description: h.hazard_description,
                }))}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {hazards.map((hazard, index) => (
              <HazardForm
                key={index}
                hazard={hazard}
                index={index}
                onChange={updateHazard}
                onRemove={removeHazard}
                showResidual={false}
              />
            ))}

            <Button
              variant="outline"
              onClick={() => setHazards((prev) => [...prev, createEmptyHazard()])}
              className="w-full"
            >
              {t("risk.hazard.add", "+ Add Hazard")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Control Measures */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                {t("risk.step5.title", "Control Measures & Residual Risk")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  {t("risk.controls.hierarchy", "Apply controls in order: Elimination → Substitution → Engineering → Administrative → PPE")}
                </AlertDescription>
              </Alert>

              <RiskMatrix
                hazards={hazards.map((h, i) => ({
                  id: String(i),
                  likelihood: h.likelihood,
                  severity: h.severity,
                  residual_likelihood: h.residual_likelihood,
                  residual_severity: h.residual_severity,
                  hazard_description: h.hazard_description,
                }))}
                showResidual
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {hazards.map((hazard, index) => (
              <HazardForm
                key={index}
                hazard={hazard}
                index={index}
                onChange={updateHazard}
                onRemove={removeHazard}
                showResidual
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Final Review & Signatures */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                {t("risk.step6.title", "Final Review")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("risk.overall.rating", "Overall Risk Rating")} *</Label>
                  <Select value={overallRating} onValueChange={setOverallRating}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("risk.overall.selectRating", "Select rating...")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("risk.level.low", "Low")}</SelectItem>
                      <SelectItem value="medium">{t("risk.level.medium", "Medium")}</SelectItem>
                      <SelectItem value="high">{t("risk.level.high", "High")}</SelectItem>
                      <SelectItem value="critical">{t("risk.level.critical", "Critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("risk.validUntil", "Valid Until")}</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{hazards.length}</div>
                  <div className="text-xs text-muted-foreground">{t("risk.summary.hazards", "Hazards")}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{teamMembers.length}</div>
                  <div className="text-xs text-muted-foreground">{t("risk.summary.team", "Team Members")}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {hazards.reduce((sum, h) => sum + h.additional_controls.length, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("risk.summary.controls", "Controls")}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold capitalize">{overallRating || calculateOverallRisk()}</div>
                  <div className="text-xs text-muted-foreground">{t("risk.summary.rating", "Rating")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          {isRTL ? <ChevronRight className="h-4 w-4 me-2" /> : <ChevronLeft className="h-4 w-4 me-2" />}
          {t("common.back", "Back")}
        </Button>

        <div className="flex items-center gap-2">
          {currentStep === 6 ? (
            <>
              <Button
                variant="outline"
                onClick={() => saveAssessment("draft")}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 me-2" />
                {t("risk.saveAsDraft", "Save Draft")}
              </Button>
              <Button
                onClick={() => saveAssessment("under_review")}
                disabled={isSaving || !canProceed()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 me-2" />
                )}
                {t("risk.submitForReview", "Submit for Review")}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setCurrentStep((s) => Math.min(6, s + 1))}
              disabled={!canProceed()}
            >
              {t("common.next", "Next")}
              {isRTL ? <ChevronLeft className="h-4 w-4 ms-2" /> : <ChevronRight className="h-4 w-4 ms-2" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
