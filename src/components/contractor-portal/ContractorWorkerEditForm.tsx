import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { NATIONALITIES } from "@/lib/nationalities";
import { WorkerPhotoUpload } from "@/features/contractors/components/WorkerPhotoUpload";
import { useUpdateContractorWorker } from "./use-update-contractor-worker-portal";

const editWorkerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  full_name_ar: z.string().optional(),
  national_id: z.string().min(5, "National ID is required"),
  mobile_number: z.string().min(8, "Valid mobile number is required"),
  nationality: z.string().optional(),
  preferred_language: z.string().default("en"),
  photo_path: z.string().nullable().optional(),
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
    photo_path?: string | null;
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
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRTL = direction === "rtl";
  const updateWorker = useUpdateContractorWorker();
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<EditWorkerFormData>({
    resolver: zodResolver(editWorkerSchema),
    defaultValues: {
      full_name: worker?.full_name || "",
      full_name_ar: worker?.full_name_ar || "",
      national_id: worker?.national_id || "",
      mobile_number: worker?.mobile_number || "",
      nationality: worker?.nationality || "",
      preferred_language: worker?.preferred_language || "en",
      photo_path: worker?.photo_path || null,
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
      photo_path: worker.photo_path || null,
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
        photo_path: data.photo_path ?? null,
      },
    });

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onOpenChange(false);
    }, 1200);
  };

  const showReapprovalWarning = worker?.approval_status === "approved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {t("contractorPortal.workers.editWorker", "Edit Worker")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "contractorPortal.workers.editWorkerDesc",
              "Update the worker's information below."
            )}
          </DialogDescription>
        </DialogHeader>

        {showSuccess && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {t("common.savedSuccessfully", "Saved successfully!")}
            </AlertDescription>
          </Alert>
        )}

        {showReapprovalWarning && !showSuccess && (
          <Alert
            variant="default"
            className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {t(
                "contractorPortal.workers.editWarning",
                "Editing this worker will require re-approval by the Document Controller"
              )}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] pe-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-1"
            >
              {/* Photo Upload */}
              <div className="flex justify-center">
                <Controller
                  control={form.control}
                  name="photo_path"
                  render={({ field }) => (
                    <WorkerPhotoUpload
                      photoPath={field.value ?? null}
                      onPhotoChange={field.onChange}
                      workerId={worker?.id}
                    />
                  )}
                />
              </div>

              {/* Full Name */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("contractors.workers.fullName", "Full Name")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full Name Arabic */}
              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        "contractors.workers.fullNameAr",
                        "Full Name (Arabic)"
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* National ID + Mobile in grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="national_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("contractors.workers.nationalId", "National ID")}
                      </FormLabel>
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
                      <FormLabel>
                        {t("contractors.workers.mobile", "Mobile Number")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Nationality + Language in grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("contractors.workers.nationality", "Nationality")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("common.select", "Select...")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <ScrollArea className="h-60">
                            {NATIONALITIES.map((nat) => (
                              <SelectItem key={nat.code} value={nat.code}>
                                {isRTL && nat.name_ar
                                  ? nat.name_ar
                                  : nat.name}
                              </SelectItem>
                            ))}
                          </ScrollArea>
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
                      <FormLabel>
                        {t(
                          "contractors.workers.language",
                          "Preferred Language"
                        )}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={updateWorker.isPending || showSuccess}
                >
                  {updateWorker.isPending
                    ? t("common.saving", "Saving...")
                    : t("common.save", "Save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
