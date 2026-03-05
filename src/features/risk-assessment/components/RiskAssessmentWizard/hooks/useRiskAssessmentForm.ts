import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useContractorProjects } from "@/features/contractors/hooks/use-contractor-projects";
import { supabase } from "@/integrations/supabase/client";
import { type HazardFormData } from '../../HazardForm';
import { type SelectedUser } from '../../TeamMemberSelector';
import { STEPS, TEAM_ROLES } from "../constants";

export const createEmptyHazard = (): HazardFormData => ({
  hazard_description: "",
  hazard_category: "physical",
  likelihood: 3,
  severity: 3,
  existing_controls: [],
  additional_controls: [],
  residual_likelihood: 2,
  residual_severity: 2,
  // ISO 45001 compliance fields
  job_step_number: undefined,
  job_step_description: "",
  persons_at_risk: [],
  number_exposed: undefined,
  control_hierarchy_level: "",
  higher_control_justification: "",
  required_ppe: [],
  control_status: "pending",
});

export function useRiskAssessmentForm(projectId?: string, contractorId?: string, onComplete?: (assessmentId: string) => void) {

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

  // ISO 45001 Compliance Fields - Activity Details
  const [activityType, setActivityType] = useState("routine");
  const [workEnvironment, setWorkEnvironment] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");
  const [applicableLegislation, setApplicableLegislation] = useState<string[]>(["iso_45001"]);

  // ISO 45001 Compliance Fields - Worker Consultation
  const [workerConsultationDate, setWorkerConsultationDate] = useState("");
  const [workerConsultationNotes, setWorkerConsultationNotes] = useState("");
  const [unionRepConsulted, setUnionRepConsulted] = useState(false);

  // ISO 45001 Compliance Fields - Risk Acceptability
  const [riskTolerance, setRiskTolerance] = useState("");
  const [acceptanceJustification, setAcceptanceJustification] = useState("");
  const [reviewFrequency, setReviewFrequency] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // Team state - simplified to Team Leader and Members
  const [teamLeader, setTeamLeader] = useState<SelectedUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<SelectedUser[]>([]);

  // Hazards state
  const [hazards, setHazards] = useState<HazardFormData[]>([createEmptyHazard()]);

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

  const addTeamMember = (user: SelectedUser) => {
    if (teamMembers.some((m) => m.user_id === user.user_id)) {
      toast.error(t("risk.team.userExists", "This user is already in the team"));
      return;
    }
    setTeamMembers((prev) => [...prev, user]);
  };

  const removeTeamMember = (userId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));
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

      // Determine if management approval is required
      const calculatedRating = overallRating || calculateOverallRisk();
      const managementApprovalRequired = calculatedRating === "high" || calculatedRating === "critical";

      // Insert risk assessment with compliance fields
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
          overall_risk_rating: calculatedRating,
          valid_until: validUntil || null,
          created_by: user?.id,
          // ISO 45001 Compliance Fields
          activity_type: activityType,
          work_environment: workEnvironment,
          scope_description: scopeDescription,
          applicable_legislation: applicableLegislation,
          worker_consultation_date: workerConsultationDate || null,
          worker_consultation_notes: workerConsultationNotes,
          union_representative_consulted: unionRepConsulted,
          risk_tolerance: riskTolerance,
          acceptance_justification: acceptanceJustification,
          review_frequency: reviewFrequency,
          next_review_date: nextReviewDate || null,
          management_approval_required: managementApprovalRequired,
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
          // ISO 45001 Compliance Fields
          job_step_number: h.job_step_number,
          job_step_description: h.job_step_description,
          persons_at_risk: h.persons_at_risk || [],
          number_exposed: h.number_exposed,
          control_hierarchy_level: h.control_hierarchy_level,
          higher_control_justification: h.higher_control_justification,
          required_ppe: h.required_ppe || [],
          control_status: h.control_status || "pending",
        }));

        const { error: detailsError } = await supabase
          .from("risk_assessment_details")
          .insert(hazardInserts);

        if (detailsError) throw detailsError;
      }

      // Insert team members
      const allTeamMembers: SelectedUser[] = [];
      if (teamLeader) {
        allTeamMembers.push(teamLeader);
      }
      allTeamMembers.push(...teamMembers);

      if (allTeamMembers.length > 0) {
        const teamInserts = allTeamMembers.map((m, idx) => ({
          tenant_id: profile.tenant_id,
          risk_assessment_id: assessment.id,
          role: idx === 0 && teamLeader ? "team_leader" : "member",
          role_ar: idx === 0 && teamLeader ? TEAM_ROLES.team_leader.label_ar : TEAM_ROLES.member.label_ar,
          worker_id: null,
          user_id: m.user_id,
          is_required: idx === 0, // Team leader is required
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
      case 1: {
        const hasRequiredFields = !!activityName && !!activityDescription && !!activityType;
        if (isProjectLinked) {
          return hasRequiredFields && !!selectedProjectId;
        }
        return hasRequiredFields;
      }
      case 2:
        // Require Team Leader + at least 1 member
        return teamLeader !== null && teamMembers.length >= 1;
      case 3:
        return hazards.length > 0 && hazards.every((h) => h.hazard_description);
      case 4:
        return hazards.every(
          (h) => h.residual_likelihood && h.residual_severity
        );
      case 5: {
        // Require risk tolerance and review frequency for ISO 45001 compliance
        const hasRating = !!overallRating;
        const hasRiskTolerance = !!riskTolerance;
        const hasReviewFrequency = !!reviewFrequency;
        const hasJustificationIfNeeded = riskTolerance !== "tolerable_alarp" || !!acceptanceJustification;
        const isNotUnacceptable = riskTolerance !== "unacceptable";
        return hasRating && hasRiskTolerance && hasReviewFrequency && hasJustificationIfNeeded && isNotUnacceptable;
      }
      default:
        return false;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return {
    t, isRTL, navigate, profile, user,
    currentStep, setCurrentStep, isSaving, setIsSaving,
    isProjectLinked, setIsProjectLinked, selectedProjectId, setSelectedProjectId, selectedContractorId, setSelectedContractorId,
    projects, projectsLoading, selectedProject,
    activityName, setActivityName, activityDescription, setActivityDescription,
    location, setLocation, validUntil, setValidUntil, overallRating, setOverallRating,
    activityType, setActivityType, workEnvironment, setWorkEnvironment,
    scopeDescription, setScopeDescription, applicableLegislation, setApplicableLegislation,
    workerConsultationDate, setWorkerConsultationDate, workerConsultationNotes, setWorkerConsultationNotes, unionRepConsulted, setUnionRepConsulted,
    riskTolerance, setRiskTolerance, acceptanceJustification, setAcceptanceJustification,
    reviewFrequency, setReviewFrequency, nextReviewDate, setNextReviewDate,
    teamLeader, setTeamLeader, teamMembers, setTeamMembers,
    hazards, setHazards,
    updateHazard, removeHazard, addTeamMember, removeTeamMember, calculateOverallRisk, saveAssessment, canProceed,
    progress
  };
}
