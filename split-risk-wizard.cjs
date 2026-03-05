const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/risk-assessment/RiskAssessmentWizard.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/risk-assessment/RiskAssessmentWizard');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr;
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `export interface WizardProps {
  projectId?: string;
  contractorId?: string;
  onComplete?: (assessmentId: string) => void;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. constants.ts
const constantsImports = `import {
  FileText,
  Users,
  AlertTriangle,
  Shield,
  PenTool,
} from "lucide-react";\n\n`;
const constantsContent = extractBetween(content, 'const STEPS = [', 'const createEmptyHazard');
fs.writeFileSync(path.join(targetDir, 'constants.ts'), constantsImports + "export const STEPS = [" + constantsContent);

// 3. hooks/useRiskAssessmentForm.ts
const hookImports = `import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";
import { supabase } from "@/integrations/supabase/client";
import { type HazardFormData } from "../HazardForm";
import { type SelectedUser } from "../TeamMemberSelector";
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
`;

const hookBodyTemp = extractBetween(content, 'export function RiskAssessmentWizard({ projectId, contractorId, onComplete }: WizardProps) {', 'const progress = (currentStep / STEPS.length) * 100;');
// remove the first few lines of hookBodyTemp that duplicate the parameters
const hookBodyLines = hookBodyTemp.split('\\n');
// We just take it directly it starts from inside the function
const stateContent = hookBodyTemp;

const hookBottom = `
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
`;
fs.writeFileSync(path.join(hooksDir, 'useRiskAssessmentForm.ts'), hookImports + stateContent + hookBottom);

// 4. components/WizardStep1.tsx
const step1Content = `import React from "react";
import { FileText, FolderKanban, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityDetailsSection } from "../../ActivityDetailsSection";

export function WizardStep1({ state }: { state: any }) {
  const { t } = state;
  const {
    isProjectLinked, setIsProjectLinked, setSelectedProjectId, setSelectedContractorId,
    selectedProjectId, projectsLoading, projects, selectedProject,
    activityName, setActivityName, location, setLocation,
    activityDescription, setActivityDescription, activityType, setActivityType,
    workEnvironment, setWorkEnvironment, scopeDescription, setScopeDescription,
    applicableLegislation, setApplicableLegislation
  } = state;

  return (
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
                  {projects?.map((project: any) => (
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

        {/* ISO 45001 Compliance Section */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">{t("risk.compliance.sectionTitle", "ISO 45001 / OSHA Compliance")}</h3>
          </div>
          
          <ActivityDetailsSection
            activityType={activityType}
            onActivityTypeChange={setActivityType}
            workEnvironment={workEnvironment}
            onWorkEnvironmentChange={setWorkEnvironment}
            scopeDescription={scopeDescription}
            onScopeDescriptionChange={setScopeDescription}
            applicableLegislation={applicableLegislation}
            onApplicableLegislationChange={setApplicableLegislation}
          />
        </div>
      </CardContent>
    </Card>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardStep1.tsx'), step1Content);

// 5. components/WizardStep2.tsx
const step2Content = `import React from "react";
import { Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamMemberSelector, SelectedMemberCard } from "../../TeamMemberSelector";
import { TEAM_ROLES } from "../constants";

export function WizardStep2({ state }: { state: any }) {
  const { t, isRTL } = state;
  const {
    teamLeader, setTeamLeader,
    teamMembers, removeTeamMember, addTeamMember
  } = state;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("risk.step2.title", "Risk Assessment Team")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("risk.team.requirement", "Risk assessments must be conducted by a competent team including a Team Leader and at least one Team Member.")}
          </AlertDescription>
        </Alert>

        {/* Team Leader Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              {isRTL ? TEAM_ROLES.team_leader.label_ar : TEAM_ROLES.team_leader.label}
              <Badge variant="destructive" className="text-xs">
                {t("common.required", "Required")}
              </Badge>
            </Label>
          </div>
          
          {teamLeader ? (
            <SelectedMemberCard
              user={teamLeader}
              role={isRTL ? TEAM_ROLES.team_leader.label_ar : TEAM_ROLES.team_leader.label}
              onRemove={() => setTeamLeader(null)}
              isRequired
            />
          ) : (
            <TeamMemberSelector
              onSelect={(user) => setTeamLeader(user)}
              excludeIds={teamMembers.map((m: any) => m.user_id)}
              placeholder={t("risk.team.searchLeaderPlaceholder", "Search for Team Leader by name or ID...")}
            />
          )}
        </div>

        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              {isRTL ? TEAM_ROLES.member.label_ar : TEAM_ROLES.member.label}
            </Label>
            <Badge variant="outline">
              {teamMembers.length} {t("common.selected", "selected")}
            </Badge>
          </div>

          {/* Selected Members */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {teamMembers.map((member: any) => (
                <SelectedMemberCard
                  key={member.user_id}
                  user={member}
                  role={isRTL ? TEAM_ROLES.member.label_ar : TEAM_ROLES.member.label}
                  onRemove={() => removeTeamMember(member.user_id)}
                />
              ))}
            </div>
          )}

          {/* Add Member Selector */}
          <TeamMemberSelector
            onSelect={addTeamMember}
            excludeIds={[
              ...(teamLeader ? [teamLeader.user_id] : []),
              ...teamMembers.map((m: any) => m.user_id),
            ]}
            placeholder={t("risk.team.searchMemberPlaceholder", "Add team member by name or ID...")}
          />
        </div>

        {/* Validation Message */}
        {(!teamLeader || teamMembers.length < 1) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!teamLeader
                ? t("risk.team.leaderRequired", "Please select a Team Leader")
                : t("risk.team.memberRequired", "Please add at least one Team Member")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardStep2.tsx'), step2Content);

// 6. components/WizardStep3.tsx
const step3Content = `import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactRiskMatrix } from "../../CompactRiskMatrix";
import { HazardForm } from "../../HazardForm";
import { createEmptyHazard } from "../hooks/useRiskAssessmentForm";

export function WizardStep3({ state }: { state: any }) {
  const { t } = state;
  const {
    hazards, setHazards, updateHazard, removeHazard
  } = state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {t("risk.step3.title", "Hazard Identification")}
          </CardTitle>
        </CardHeader>
      <CardContent>
          <CompactRiskMatrix
            hazards={hazards.map((h: any, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              hazard_description: h.hazard_description,
            }))}
            mode="single"
            size="md"
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {hazards.map((hazard: any, index: number) => (
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
          onClick={() => setHazards((prev: any) => [...prev, createEmptyHazard()])}
          className="w-full"
        >
          {t("risk.hazard.add", "+ Add Hazard")}
        </Button>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardStep3.tsx'), step3Content);

// 7. components/WizardStep4.tsx
const step4Content = `import React from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CompactRiskMatrix } from "../../CompactRiskMatrix";
import { RiskReductionSummary } from "../../RiskReductionSummary";
import { HazardForm } from "../../HazardForm";

export function WizardStep4({ state }: { state: any }) {
  const { t } = state;
  const {
    hazards, updateHazard, removeHazard
  } = state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            {t("risk.step4.title", "Control Measures & Residual Risk")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="mb-4">
            <AlertDescription>
              {t("risk.controls.hierarchy", "Apply controls in order: Elimination → Substitution → Engineering → Administrative → PPE")}
            </AlertDescription>
          </Alert>

          <CompactRiskMatrix
            hazards={hazards.map((h: any, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              residual_likelihood: h.residual_likelihood,
              residual_severity: h.residual_severity,
              hazard_description: h.hazard_description,
            }))}
            mode="comparison"
            size="md"
            showReductionStats
          />

          <RiskReductionSummary
            hazards={hazards.map((h: any, i: number) => ({
              id: String(i),
              likelihood: h.likelihood,
              severity: h.severity,
              residual_likelihood: h.residual_likelihood,
              residual_severity: h.residual_severity,
              hazard_description: h.hazard_description,
            }))}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {hazards.map((hazard: any, index: number) => (
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
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardStep4.tsx'), step4Content);

// 8. components/WizardStep5.tsx
const step5Content = `import React from "react";
import { PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerConsultationSection } from "../../WorkerConsultationSection";
import { RiskAcceptabilitySection } from "../../RiskAcceptabilitySection";

export function WizardStep5({ state }: { state: any }) {
  const { t } = state;
  const {
    workerConsultationDate, setWorkerConsultationDate,
    workerConsultationNotes, setWorkerConsultationNotes,
    unionRepConsulted, setUnionRepConsulted,
    riskTolerance, setRiskTolerance,
    acceptanceJustification, setAcceptanceJustification,
    reviewFrequency, setReviewFrequency,
    nextReviewDate, setNextReviewDate,
    overallRating, setOverallRating,
    calculateOverallRisk, hazards, teamMembers,
    validUntil, setValidUntil
  } = state;

  return (
    <div className="space-y-6">
      {/* Worker Consultation (ISO 45001 7.4) */}
      <WorkerConsultationSection
        consultationDate={workerConsultationDate}
        onConsultationDateChange={setWorkerConsultationDate}
        consultationNotes={workerConsultationNotes}
        onConsultationNotesChange={setWorkerConsultationNotes}
        unionRepConsulted={unionRepConsulted}
        onUnionRepConsultedChange={setUnionRepConsulted}
      />

      {/* Risk Acceptability (ISO 45001 6.1.2.2) */}
      <RiskAcceptabilitySection
        riskTolerance={riskTolerance}
        onRiskToleranceChange={setRiskTolerance}
        acceptanceJustification={acceptanceJustification}
        onAcceptanceJustificationChange={setAcceptanceJustification}
        reviewFrequency={reviewFrequency}
        onReviewFrequencyChange={setReviewFrequency}
        nextReviewDate={nextReviewDate}
        onNextReviewDateChange={setNextReviewDate}
        managementApprovalRequired={overallRating === "high" || overallRating === "critical" || calculateOverallRisk() === "high" || calculateOverallRisk() === "critical"}
        overallRiskRating={overallRating || calculateOverallRisk()}
        hazardCount={hazards.length}
        highRiskCount={hazards.filter((h: any) => h.residual_likelihood * h.residual_severity > 9).length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            {t("risk.step5.title", "Final Review")}
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
                {hazards.reduce((sum: number, h: any) => sum + h.additional_controls.length, 0)}
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
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardStep5.tsx'), step5Content);

// 9. components/WizardNavigation.tsx
const navContent = `import React from "react";
import { ChevronLeft, ChevronRight, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WizardNavigation({ state }: { state: any }) {
  const { t, isRTL } = state;
  const {
    currentStep, setCurrentStep,
    saveAssessment, isSaving, canProceed
  } = state;

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={() => setCurrentStep((s: number) => Math.max(1, s - 1))}
        disabled={currentStep === 1}
      >
        {isRTL ? <ChevronRight className="h-4 w-4 me-2" /> : <ChevronLeft className="h-4 w-4 me-2" />}
        {t("common.back", "Back")}
      </Button>

      <div className="flex items-center gap-2">
        {currentStep === 5 ? (
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
            onClick={() => setCurrentStep((s: number) => Math.min(5, s + 1))}
            disabled={!canProceed()}
          >
            {t("common.next", "Next")}
            {isRTL ? <ChevronLeft className="h-4 w-4 ms-2" /> : <ChevronRight className="h-4 w-4 ms-2" />}
          </Button>
        )}
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'WizardNavigation.tsx'), navContent);

// 10. RiskAssessmentWizard.tsx (shell)
const shellContent = `import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WizardProps } from "./types";
import { useRiskAssessmentForm } from "./hooks/useRiskAssessmentForm";
import { STEPS } from "./constants";
import { WizardStep1 } from "./components/WizardStep1";
import { WizardStep2 } from "./components/WizardStep2";
import { WizardStep3 } from "./components/WizardStep3";
import { WizardStep4 } from "./components/WizardStep4";
import { WizardStep5 } from "./components/WizardStep5";
import { WizardNavigation } from "./components/WizardNavigation";

export default function RiskAssessmentWizard({ projectId, contractorId, onComplete }: WizardProps) {
  const state = useRiskAssessmentForm(projectId, contractorId, onComplete);
  const { t, currentStep, progress } = state;

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
                {t(\`risk.wizard.step\${currentStep}\`, \`Step \${currentStep}\`)}
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
                  className={\`flex flex-col items-center \${
                    isActive ? "text-primary" : isComplete ? "text-green-600" : "text-muted-foreground"
                  }\`}
                >
                  <div
                    className={\`w-8 h-8 rounded-full flex items-center justify-center \${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-muted"
                    }\`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentStep === 1 && <WizardStep1 state={state} />}
      {currentStep === 2 && <WizardStep2 state={state} />}
      {currentStep === 3 && <WizardStep3 state={state} />}
      {currentStep === 4 && <WizardStep4 state={state} />}
      {currentStep === 5 && <WizardStep5 state={state} />}

      <WizardNavigation state={state} />
    </div>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'RiskAssessmentWizard.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './RiskAssessmentWizard';\nexport * from './types';\n");

console.log('RiskAssessmentWizard split successfully');
