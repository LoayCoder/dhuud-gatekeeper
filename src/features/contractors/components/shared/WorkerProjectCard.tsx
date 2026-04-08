import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { useWorkerProjectAssignment } from "@/features/contractors/hooks/use-worker-project-assignment";

interface WorkerProjectCardProps {
  workerId?: string;
}

export function WorkerProjectCard({ workerId }: WorkerProjectCardProps) {
  const { t } = useTranslation();
  const { data: projectAssignment } = useWorkerProjectAssignment(workerId);
  const projData = projectAssignment?.project as { project_name: string; status: string } | null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("contractors.projects.assignedProject", "Assigned Project")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 text-sm">
        {projData ? (
          <div className="flex items-center justify-between">
            <span className="font-medium">{projData.project_name}</span>
            <Badge variant="outline">{projData.status}</Badge>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {t("contractors.workers.noProjectAssigned", "No project assigned yet")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
