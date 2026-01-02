import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ContractorWorker, useCreateContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { useUpdateContractorWorker } from "@/hooks/contractor-management/use-update-contractor-worker";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { toast } from "sonner";
import { NATIONALITIES } from "@/lib/nationalities";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  companies: ContractorCompany[];
}

export function WorkerFormDialog({ open, onOpenChange, worker, companies }: WorkerFormDialogProps) {
  const { t, i18n } = useTranslation();
  const createWorker = useCreateContractorWorker();
  const updateWorker = useUpdateContractorWorker();
  const isEditing = !!worker;
  const isRTL = i18n.dir() === 'rtl';

  const [formData, setFormData] = useState({
    company_id: "", full_name: "", national_id: "",
    nationality: "", mobile_number: "", preferred_language: "en", photo_path: "" as string | null,
  });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    if (worker) {
      setFormData({
        company_id: worker.company_id,
        full_name: worker.full_name,
        national_id: worker.national_id,
        nationality: worker.nationality || "",
        mobile_number: worker.mobile_number,
        preferred_language: worker.preferred_language,
        photo_path: worker.photo_path || null,
      });
    } else {
      setFormData({ company_id: "", full_name: "", national_id: "", nationality: "", mobile_number: "", preferred_language: "en", photo_path: null });
    }
    setShowSuccessAlert(false);
  }, [worker, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && worker) {
        await updateWorker.mutateAsync({
          id: worker.id,
          ...formData,
        });
        setShowSuccessAlert(true);
        // Close dialog after showing success for a moment
        setTimeout(() => {
          onOpenChange(false);
          setShowSuccessAlert(false);
        }, 1500);
      } else {
        await createWorker.mutateAsync(formData);
        onOpenChange(false);
      }
    } catch (error) {
      // Errors are handled by the mutation's onError
    }
  };

  const isPending = createWorker.isPending || updateWorker.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.workers.editWorker", "Edit Worker") : t("contractors.workers.addWorker", "Add Worker")}</DialogTitle>
          {isEditing && (
            <DialogDescription>
              {t("contractors.workers.editWorkerDescription", "Update the worker information. Changes will be saved immediately.")}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {showSuccessAlert && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">{t("common.success", "Success")}</AlertTitle>
            <AlertDescription className="text-green-600">
              {t("contractors.workers.updateSuccess", "Worker updated successfully")}
            </AlertDescription>
          </Alert>
        )}
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div className="flex justify-center">
              <WorkerPhotoUpload
                photoPath={formData.photo_path}
                onPhotoChange={(path) => setFormData({ ...formData, photo_path: path })}
                workerId={worker?.id}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.workers.company", "Company")} *</Label>
              <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("contractors.workers.selectCompany", "Select company")} /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.workers.name", "Full Name")} *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("contractors.workers.nationalId", "National ID")} *</Label>
                <Input value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.workers.mobile", "Mobile")} *</Label>
                <Input value={formData.mobile_number} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.workers.nationality", "Nationality")}</Label>
              <Select value={formData.nationality} onValueChange={(v) => setFormData({ ...formData, nationality: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("contractors.workers.selectNationality", "Select nationality")} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[280px]" dir={isRTL ? 'rtl' : 'ltr'}>
                    {NATIONALITIES.map((nat) => (
                      <SelectItem key={nat.code} value={nat.code}>
                        {isRTL ? nat.name_ar : nat.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
