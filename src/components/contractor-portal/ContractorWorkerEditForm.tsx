import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { NATIONALITIES } from "@/lib/nationalities";
import { useUpdateContractorWorker } from "./use-update-contractor-worker-portal";

const editWorkerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  full_name_ar: z.string().optional(),
  national_id: z.string().min(5, "National ID is required"),
  mobile_number: z.string().min(8, "Valid mobile number is required"),
  nationality: z.string().optional(),
  preferred_language: z.string().default("en"),
});

type EditWorkerFormData = z.infer<typeof editWorkerSchema>;

interface ContractorWorkerEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: {
    id: string;
    full_name: string;
    full_name_ar?: string | null;
    national_id: string;
    mobile_number: string;
    nationality?: string | null;
    preferred_language: string;
    approval_status: string;
  } | null;
  companyId: string;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export default function ContractorWorkerEditForm({
  open,
  onOpenChange,
  worker,
  companyId,
}: ContractorWorkerEditFormProps) {
  const { t } = useTranslation();
  const updateWorker = useUpdateContractorWorker();

  const form = useForm<EditWorkerFormData>({
    resolver: zodResolver(editWorkerSchema),
    defaultValues: {
      full_name: worker?.full_name || "",
      full_name_ar: worker?.full_name_ar || "",
      national_id: worker?.national_id || "",
      mobile_number: worker?.mobile_number || "",
      nationality: worker?.nationality || "",
      preferred_language: worker?.preferred_language || "en",
    },
  });

  // Reset form when worker changes
  if (worker && form.getValues("full_name") !== worker.full_name) {
    form.reset({
      full_name: worker.full_name,
      full_name_ar: worker.full_name_ar || "",
      national_id: worker.national_id,
      mobile_number: worker.mobile_number,
      nationality: worker.nationality || "",
      preferred_language: worker.preferred_language,
    });
  }

  const onSubmit = async (data: EditWorkerFormData) => {
    if (!worker) return;

    await updateWorker.mutateAsync({
      workerId: worker.id,
      data: {
        full_name: data.full_name,
        full_name_ar: data.full_name_ar || null,
        national_id: data.national_id,
        mobile_number: data.mobile_number,
        nationality: data.nationality || null,
        preferred_language: data.preferred_language,
      },
    });

    onOpenChange(false);
  };

  const showReapprovalWarning = worker?.approval_status === "approved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("contractorPortal.workers.editWorker", "Edit Worker")}
          </DialogTitle>
        </DialogHeader>

        {showReapprovalWarning && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {t(
                "contractorPortal.workers.editWarning",
                "Editing this worker will require re-approval by the Document Controller"
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.fullName", "Full Name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.fullNameAr", "Full Name (Arabic)")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="national_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.nationalId", "National ID")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobile_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.mobile", "Mobile Number")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.nationality", "Nationality")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select", "Select...")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NATIONALITIES.map((nat) => (
                        <SelectItem key={nat.code} value={nat.code}>
                          {nat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.workers.language", "Preferred Language")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={updateWorker.isPending}>
                {updateWorker.isPending
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
