import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { ContractorWorker, useCreateContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { useUpdateContractorWorker } from "@/features/contractors/hooks/use-update-contractor-worker";
import { ContractorCompany } from "@/features/contractors/hooks/use-contractor-companies";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { NATIONALITIES } from "@/lib/nationalities";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { workerFormSchema, type WorkerFormValues } from './WorkerFormSchema';

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  companies: ContractorCompany[];
}

const defaultValues: WorkerFormValues = {
  company_id: "", full_name: "", national_id: "",
  nationality: "", mobile_number: "", preferred_language: "en", photo_path: null,
};

export function WorkerFormDialog({ open, onOpenChange, worker, companies }: WorkerFormDialogProps) {
  const { t, i18n } = useTranslation();
  const createWorker = useCreateContractorWorker();
  const updateWorker = useUpdateContractorWorker();
  const isEditing = !!worker;
  const isRTL = i18n.dir() === 'rtl';

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues,
  });

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    if (worker) {
      form.reset({
        company_id: worker.company_id,
        full_name: worker.full_name,
        national_id: worker.national_id,
        nationality: worker.nationality || "",
        mobile_number: worker.mobile_number,
        preferred_language: worker.preferred_language,
        photo_path: worker.photo_path || null,
      });
    } else {
      form.reset(defaultValues);
    }
    setShowSuccessAlert(false);
  }, [worker, open, form]);

  const onSubmit = async (values: WorkerFormValues) => {
    try {
      if (isEditing && worker) {
        await updateWorker.mutateAsync({ id: worker.id, company_id: values.company_id, full_name: values.full_name, national_id: values.national_id, nationality: values.nationality, mobile_number: values.mobile_number, preferred_language: values.preferred_language, photo_path: values.photo_path });
        setShowSuccessAlert(true);
        setTimeout(() => {
          onOpenChange(false);
          setShowSuccessAlert(false);
        }, 1500);
      } else {
        await createWorker.mutateAsync(values);
        onOpenChange(false);
      }
    } catch {
      // Errors handled by mutation's onError
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
              <div className="flex justify-center">
                <Controller
                  control={form.control}
                  name="photo_path"
                  render={({ field }) => (
                    <WorkerPhotoUpload
                      photoPath={field.value}
                      onPhotoChange={field.onChange}
                      workerId={worker?.id}
                      disabled={isPending}
                    />
                  )}
                />
              </div>

              <FormField control={form.control} name="company_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.company", "Company")} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t("contractors.workers.selectCompany", "Select company")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.name", "Full Name")} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="national_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contractors.workers.nationalId", "National ID")} *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contractors.workers.mobile", "Mobile")} *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.nationality", "Nationality")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("contractors.workers.selectNationality", "Select nationality")} />
                      </SelectTrigger>
                    </FormControl>
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
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
                <Button type="submit" disabled={isPending}>
                  {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
