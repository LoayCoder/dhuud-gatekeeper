import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GatePassCreateWizard } from "./gate-pass-create/GatePassCreateWizard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GatePassCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GatePassCreateDialog({ open, onOpenChange }: GatePassCreateDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={direction}
        className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {t("gatePasses.createNewPass", "Create New Gate Pass")}
          </DialogTitle>
          <DialogDescription>
            {t("gatePasses.createDescription", "Fill in the details to submit a new material gate pass request")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <GatePassCreateWizard
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
