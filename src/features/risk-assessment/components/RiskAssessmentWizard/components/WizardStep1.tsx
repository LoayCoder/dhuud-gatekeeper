import React from "react";
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
                  {projects?.map((project: unknown) => (
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
