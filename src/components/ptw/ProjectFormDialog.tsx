import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ptw.mobilization.newProject", "New Project")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Project form coming in Phase 3
        </p>
      </DialogContent>
    </Dialog>
  );
}
