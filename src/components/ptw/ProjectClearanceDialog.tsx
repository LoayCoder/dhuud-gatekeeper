import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePTWProjectClearances } from "@/hooks/ptw";

interface ProjectClearanceDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectClearanceDialog({ projectId, open, onOpenChange }: ProjectClearanceDialogProps) {
  const { t } = useTranslation();
  const { data: clearances } = usePTWProjectClearances(projectId || undefined);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("ptw.clearance.title", "Project Clearance")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {clearances?.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
              <span>{check.requirement_name}</span>
              <span className="text-sm text-muted-foreground">{check.status}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
