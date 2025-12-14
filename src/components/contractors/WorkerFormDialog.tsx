import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ContractorWorker, useCreateContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  companies: ContractorCompany[];
}

export function WorkerFormDialog({ open, onOpenChange, worker, companies }: WorkerFormDialogProps) {
  const { t } = useTranslation();
  const createWorker = useCreateContractorWorker();
  const isEditing = !!worker;

  const [formData, setFormData] = useState({
    company_id: "", full_name: "", full_name_ar: "", national_id: "",
    nationality: "", mobile_number: "", preferred_language: "en",
  });

  useEffect(() => {
    if (worker) {
      setFormData({
        company_id: worker.company_id,
        full_name: worker.full_name,
        full_name_ar: worker.full_name_ar || "",
        national_id: worker.national_id,
        nationality: worker.nationality || "",
        mobile_number: worker.mobile_number,
        preferred_language: worker.preferred_language,
      });
    } else {
      setFormData({ company_id: "", full_name: "", full_name_ar: "", national_id: "", nationality: "", mobile_number: "", preferred_language: "en" });
    }
  }, [worker, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createWorker.mutateAsync(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.workers.editWorker", "Edit Worker") : t("contractors.workers.addWorker", "Add Worker")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("contractors.workers.company", "Company")} *</Label>
            <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("contractors.workers.selectCompany", "Select company")} /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.workers.name", "Full Name")} *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.workers.nameAr", "Name (Arabic)")}</Label>
              <Input value={formData.full_name_ar} onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })} dir="rtl" />
            </div>
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
            <Input value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createWorker.isPending}>{t("common.create", "Create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
