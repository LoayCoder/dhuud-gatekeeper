import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  HeartPulse,
  Upload,
  Info,
} from "lucide-react";
import { NATIONALITIES } from "@/lib/nationalities";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { WorkerPhotoUpload } from "@/features/contractors/components/WorkerPhotoUpload";
import { useUpdateContractorWorker } from "./use-update-contractor-worker-portal";
import { supabase } from "@/integrations/supabase/client";

const editWorkerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  full_name_ar: z.string().optional(),
  id_type: z.string().default("national_id"),
  national_id: z.string().min(5, "National ID is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  mobile_number: z.string().min(8, "Valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  worker_role: z.string().default("laborer"),
  preferred_language: z.string().default("en"),
  fitness_to_work: z.string().optional(),
  fitness_acknowledged: z.boolean().default(false),
  medical_check_date: z.string().optional(),
  fitness_expiry_date: z.string().optional(),
  training_certifications: z.array(z.string()).default([]),
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
    id_type?: string;
    national_id: string;
    date_of_birth?: string | null;
    gender?: string | null;
    mobile_number: string;
    email?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    nationality?: string | null;
    worker_role?: string;
    preferred_language: string;
    approval_status: string;
    photo_path?: string | null;
    fitness_to_work?: string | null;
    fitness_acknowledged?: boolean | null;
    medical_check_date?: string | null;
    fitness_expiry_date?: string | null;
    medical_certificate_path?: string | null;
    training_certifications?: string[];
  } | null;
  companyId: string;
}

import { LANGUAGES, ID_TYPES, WORKER_ROLES, FITNESS_OPTIONS, TRAINING_CERTS, GENDERS } from "@/features/contractors/constants/worker-constants";

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
  const [medicalCertPath, setMedicalCertPath] = useState<string | null>(
    worker?.medical_certificate_path || null
  );
  const [uploadingCert, setUploadingCert] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditWorkerFormData>({
    resolver: zodResolver(editWorkerSchema),
    defaultValues: {
      full_name: worker?.full_name || "",
      full_name_ar: worker?.full_name_ar || "",
      id_type: worker?.id_type || "national_id",
      national_id: worker?.national_id || "",
      date_of_birth: worker?.date_of_birth || "",
      gender: worker?.gender || "",
      nationality: worker?.nationality || "",
      mobile_number: worker?.mobile_number || "",
      email: worker?.email || "",
      emergency_contact_name: worker?.emergency_contact_name || "",
      emergency_contact_phone: worker?.emergency_contact_phone || "",
      worker_role: worker?.worker_role || "laborer",
      preferred_language: worker?.preferred_language || "en",
      fitness_to_work: worker?.fitness_to_work || "",
      fitness_acknowledged: worker?.fitness_acknowledged || false,
      medical_check_date: worker?.medical_check_date || "",
      fitness_expiry_date: worker?.fitness_expiry_date || "",
      training_certifications: worker?.training_certifications || [],
      photo_path: worker?.photo_path || null,
    },
  });

  // Reset form when worker changes
  useEffect(() => {
    if (worker && open) {
      form.reset({
        full_name: worker.full_name,
        full_name_ar: worker.full_name_ar || "",
        id_type: worker.id_type || "national_id",
        national_id: worker.national_id,
        date_of_birth: worker.date_of_birth || "",
        gender: worker.gender || "",
        nationality: worker.nationality || "",
        mobile_number: worker.mobile_number,
        email: worker.email || "",
        emergency_contact_name: worker.emergency_contact_name || "",
        emergency_contact_phone: worker.emergency_contact_phone || "",
        worker_role: worker.worker_role || "laborer",
        preferred_language: worker.preferred_language,
        fitness_to_work: worker.fitness_to_work || "",
        fitness_acknowledged: worker.fitness_acknowledged || false,
        medical_check_date: worker.medical_check_date || "",
        fitness_expiry_date: worker.fitness_expiry_date || "",
        training_certifications: worker.training_certifications || [],
        photo_path: worker.photo_path || null,
      });
      setMedicalCertPath(worker.medical_certificate_path || null);
    }
  }, [worker?.id, open]);

  const watchedFitness = form.watch("fitness_to_work");
  const watchedCerts = form.watch("training_certifications");
  const isFit = watchedFitness === "fit";
  const isNotFitOrPending =
    watchedFitness === "not_fit" || watchedFitness === "pending_medical";
  const hasPTW = watchedCerts?.includes("ptw");

  // Reset acknowledgment when fitness status changes away from "fit"
  useEffect(() => {
    if (!isFit) {
      form.setValue("fitness_acknowledged", false);
    }
  }, [isFit, form]);

  // Medical certificate upload handler
  const handleMedicalCertUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) return;

      setUploadingCert(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `medical-certificates/${companyId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("contractor-documents")
          .upload(path, file, { upsert: true });
        if (!error) setMedicalCertPath(path);
      } finally {
        setUploadingCert(false);
      }
    },
    [companyId]
  );

  const onSubmit = async (data: EditWorkerFormData) => {
    if (!worker) return;

    await updateWorker.mutateAsync({
      workerId: worker.id,
      data: {
        full_name: data.full_name,
        full_name_ar: data.full_name_ar || null,
        id_type: data.id_type,
        national_id: data.national_id,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        mobile_number: data.mobile_number,
        email: data.email || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        nationality: data.nationality || null,
        worker_role: data.worker_role,
        preferred_language: data.preferred_language,
        fitness_to_work: data.fitness_to_work || null,
        fitness_acknowledged: data.fitness_acknowledged,
        medical_check_date: data.medical_check_date || null,
        fitness_expiry_date: data.fitness_expiry_date || null,
        medical_certificate_path: medicalCertPath,
        training_certifications: data.training_certifications,
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

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" dir={direction}>
        <DialogHeader className="px-6 pt-6 pb-0">
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
          <div className="px-6">
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {t("common.savedSuccessfully", "Saved successfully!")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {showReapprovalWarning && !showSuccess && (
          <div className="px-6">
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
          </div>
        )}

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 pt-2"
            >
              {/* ── Section 1: Personal Information ── */}
              <div>
                <SectionTitle>
                  {t(
                    "contractors.workers.sections.personal",
                    "Personal Information"
                  )}
                </SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.fullName", "Full Name")} *
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

                  {/* ID Type */}
                  <FormField
                    control={form.control}
                    name="id_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.idType", "ID Type")} *
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
                            {ID_TYPES.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey, opt.fallback)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* National ID */}
                  <FormField
                    control={form.control}
                    name="national_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.nationalId", "ID Number")} *
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date of Birth */}
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.dob", "Date of Birth")}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Gender */}
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.gender", "Gender")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("common.select", "Select")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GENDERS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {t(g.labelKey, g.fallback)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nationality */}
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
                            <ScrollArea
                              className="h-[280px]"
                              dir={isRTL ? "rtl" : "ltr"}
                            >
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
                </div>

                {/* Photo Upload */}
                <div className="mt-4">
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
              </div>

              <Separator />

              {/* ── Section 2: Contact Information ── */}
              <div>
                <SectionTitle>
                  {t(
                    "contractors.workers.sections.contact",
                    "Contact Information"
                  )}
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mobile_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.mobile", "Mobile Number")} *
                        </FormLabel>
                        <FormControl>
                          <DhuudPhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            defaultCountry="SA"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.email", "Email")}
                        </FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t(
                            "contractors.workers.emergencyName",
                            "Emergency Contact Name"
                          )}
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
                    name="emergency_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t(
                            "contractors.workers.emergencyPhone",
                            "Emergency Contact Number"
                          )}
                        </FormLabel>
                        <FormControl>
                          <DhuudPhoneInput
                            value={field.value || ""}
                            onChange={(v) => field.onChange(v || "")}
                            defaultCountry="SA"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* ── Section 3: Work Details ── */}
              <div>
                <SectionTitle>
                  {t("contractors.workers.sections.work", "Work Details")}
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="worker_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("contractors.workers.role", "Role")} *
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
                            {WORKER_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {t(r.labelKey, r.fallback)}
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
                        <FormLabel>
                          {t(
                            "contractors.workers.preferredLanguage",
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
              </div>

              <Separator />

              {/* ── Section 4: Fitness to Work ── */}
              <div>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    {t(
                      "contractors.workers.sections.fitness",
                      "Fitness to Work"
                    )}
                  </span>
                </SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fitness_to_work"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          {t(
                            "contractors.workers.fitnessStatus",
                            "Fitness Status"
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t(
                                  "common.select",
                                  "Select status"
                                )}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FITNESS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {t(opt.labelKey, opt.fallback)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Acknowledgment checkbox — only when "Fit to Work" is selected */}
                  {isFit && (
                    <FormField
                      control={form.control}
                      name="fitness_acknowledged"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                            <div className="flex items-start gap-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="mt-0.5"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal leading-relaxed cursor-pointer">
                                {t(
                                  "contractors.workers.fitnessAcknowledgment",
                                  "I confirm that the worker has undergone a medical check-up and is medically fit to perform the assigned duties."
                                )}
                              </FormLabel>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Warning for Not Fit / Pending */}
                  {isNotFitOrPending && (
                    <div className="md:col-span-2">
                      <Alert variant="destructive" className="border-destructive/30">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {watchedFitness === "not_fit"
                            ? t(
                                "contractors.workers.notFitWarning",
                                "This worker is not medically fit. They will be flagged as high risk."
                              )
                            : t(
                                "contractors.workers.pendingMedicalWarning",
                                "This worker has a pending medical check."
                              )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Medical Check Date & Fitness Expiry */}
                  {isFit && (
                    <>
                      <FormField
                        control={form.control}
                        name="medical_check_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t(
                                "contractors.workers.medicalCheckDate",
                                "Medical Check Date"
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fitness_expiry_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t(
                                "contractors.workers.fitnessExpiryDate",
                                "Fitness Expiry Date"
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Medical Certificate Upload */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">
                          {t(
                            "contractors.workers.medicalCertificate",
                            "Medical Certificate"
                          )}
                        </label>
                        <div className="mt-1">
                          <input
                            ref={certInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleMedicalCertUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingCert}
                            onClick={() => certInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingCert
                              ? t("common.uploading", "Uploading...")
                              : medicalCertPath
                                ? t(
                                    "contractors.workers.certificateUploaded",
                                    "Certificate Uploaded ✓"
                                  )
                                : t(
                                    "contractors.workers.uploadCertificate",
                                    "Upload Certificate"
                                  )}
                          </Button>
                          {medicalCertPath && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t(
                                "contractors.workers.certificateReady",
                                "Medical certificate has been attached"
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* ── Section 5: Training & Certifications ── */}
              <div>
                <SectionTitle>
                  {t(
                    "contractors.workers.sections.certifications",
                    "Training & Certifications"
                  )}
                </SectionTitle>
                <FormField
                  control={form.control}
                  name="training_certifications"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TRAINING_CERTS.map((cert) => (
                          <FormField
                            key={cert.value}
                            control={form.control}
                            name="training_certifications"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(cert.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      field.onChange(
                                        checked
                                          ? [...current, cert.value]
                                          : current.filter(
                                              (v: string) => v !== cert.value
                                            )
                                      );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {t(cert.labelKey, cert.fallback)}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasPTW && isNotFitOrPending && (
                  <Alert variant="destructive" className="mt-3 border-destructive/30">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {t(
                        "contractors.workers.ptwFitnessRestriction",
                        "PTW access cannot be requested while the worker is not medically cleared."
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {hasPTW && !isNotFitOrPending && (
                  <Alert className="mt-3 border-primary/30 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      {t(
                        "contractors.workers.ptwInfo",
                        "This worker will be eligible for PTW Receiver access after HSSE Expert approval."
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 pb-2">
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
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
