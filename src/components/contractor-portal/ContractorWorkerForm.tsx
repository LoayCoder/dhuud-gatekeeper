import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContractorWorker } from "@/hooks/contractor-management";

const workerSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  national_id: z.string().min(5, "National ID is required"),
  mobile_number: z.string().min(8, "Mobile number is required"),
  nationality: z.string().optional(),
  preferred_language: z.string().default("ar"),
});

type WorkerFormData = z.infer<typeof workerSchema>;

interface ContractorWorkerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

const LANGUAGES = [
  { value: "ar", label: "العربية (Arabic)" },
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "fil", label: "Filipino" },
];

export default function ContractorWorkerForm({ open, onOpenChange, companyId }: ContractorWorkerFormProps) {
  const { t } = useTranslation();
  const createWorker = useCreateContractorWorker();

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: { full_name: "", national_id: "", mobile_number: "", nationality: "", preferred_language: "ar" },
  });

  const onSubmit = async (data: WorkerFormData) => {
    await createWorker.mutateAsync({
      company_id: companyId,
      full_name: data.full_name,
      national_id: data.national_id,
      mobile_number: data.mobile_number,
      nationality: data.nationality,
      preferred_language: data.preferred_language,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("contractorPortal.workers.addWorker", "Add Worker")}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.workers.name", "Full Name")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="national_id" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.workers.nationalId", "National ID")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="mobile_number" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.workers.mobile", "Mobile Number")} *</FormLabel><FormControl><Input {...field} type="tel" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="preferred_language" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.workers.preferredLanguage", "Preferred Language")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
              <Button type="submit" disabled={createWorker.isPending}>{createWorker.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
