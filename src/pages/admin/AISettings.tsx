import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObservationAISettingsTab } from "@/components/ai/settings/ObservationAISettingsTab";
import { IncidentAISettingsTab } from "@/components/ai/settings/IncidentAISettingsTab";
import { TagManagementTab } from "@/components/ai/settings/TagManagementTab";
import { Brain, Eye, AlertTriangle, Tags } from "lucide-react";

export default function AISettings() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("admin.ai.title", "AI Settings")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.ai.subtitle", "Configure AI behavior for observations and incidents")}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="observation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:inline-flex">
          <TabsTrigger value="observation" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("admin.ai.observationTab", "Observation AI")}
            </span>
            <span className="sm:hidden">
              {t("admin.ai.observationTabShort", "Observation")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="incident" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("admin.ai.incidentTab", "Incident AI")}
            </span>
            <span className="sm:hidden">
              {t("admin.ai.incidentTabShort", "Incident")}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("admin.ai.tagsTab", "Tag Management")}
            </span>
            <span className="sm:hidden">
              {t("admin.ai.tagsTabShort", "Tags")}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observation">
          <ObservationAISettingsTab />
        </TabsContent>

        <TabsContent value="incident">
          <IncidentAISettingsTab />
        </TabsContent>

        <TabsContent value="tags">
          <TagManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
