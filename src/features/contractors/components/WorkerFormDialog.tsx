import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format, min as dateMin, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, HeartPulse, ShieldAlert, Info, Upload, Clock } from "lucide-react";
import { ContractorWorker, useCreateContractorWorker, useCheckDuplicateNationalId } from "@/features/contractors/hooks/use-contractor-workers";
import { useUpdateContractorWorker } from "@/features/contractors/hooks/use-update-contractor-worker";
import { ContractorCompany } from "@/features/contractors/hooks/use-contractor-companies";
import { useContractorPortalProjects } from "@/features/contractors/hooks/use-contractor-portal";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { NATIONALITIES } from "@/lib/nationalities";
import { LANGUAGES, ID_TYPES, WORKER_ROLES, FITNESS_OPTIONS, TRAINING_CERTS, GENDERS } from "@/features/contractors/constants/worker-constants";
import { workerFormSchema, type WorkerFormValues } from './WorkerFormSchema';
import { supabase } from "@/integrations/supabase/client";

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  companies: ContractorCompany[];
  blacklistedIds?: Set<string>;
}

const defaultValues: WorkerFormValues = {
  company_id: "", full_name: "", full_name_ar: "", id_type: "national_id",
  national_id: "", date_of_birth: "", gender: "", nationality: "",
  mobile_number: "", email: "", emergency_contact_name: "", emergency_contact_phone: "",
  worker_role: "", preferred_language: "en",
  fitness_to_work: "", fitness_acknowledged: false,
  medical_check_date: "", fitness_expiry_date: "",
  training_certifications: [], project_id: "", expiry_date: "", photo_path: null,
};

export function WorkerFormDialog({ open, onOpenChange, worker, companies, blacklistedIds }: WorkerFormDialogProps) {
  const { t, i18n } = useTranslation();
  const createWorker = useCreateContractorWorker();
  const updateWorker = useUpdateContractorWorker();
  const checkDuplicate = useCheckDuplicateNationalId();
  const isEditing = !!worker;
  const isRTL = i18n.dir() === 'rtl';

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [medicalCertPath, setMedicalCertPath] = useState<string | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const certInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues,
  });

  const watchedCompanyId = form.watch("company_id");
  const watchedNationalId = form.watch("national_id");
  const watchedCerts = form.watch("training_certifications");
  const watchedProjectId = form.watch("project_id");
  const watchedFitness = form.watch("fitness_to_work");

  const isBlacklisted = blacklistedIds?.has(watchedNationalId) ?? false;
  const hasPTW = watchedCerts?.includes("ptw");
  const isFit = watchedFitness === "fit";
  const isNotFitOrPending = watchedFitness === "not_fit" || watchedFitness === "pending_medical";

  // Fetch projects for the selected company
  const { data: projects, isLoading: projectsLoading } = useContractorPortalProjects(watchedCompanyId || undefined);
  const activeProjects = projects?.filter(p => ["active", "planned", "in_progress"].includes(p.status)) || [];

  // Auto-compute access dates from selected project (with 3-month cap)
  const selectedProject = watchedProjectId && projects ? projects.find(p => p.id === watchedProjectId) : null;
  const computedAccessStart = selectedProject?.start_date || "";
  const computedAccessEnd = (() => {
    if (!selectedProject) return "";
    const today = new Date();
    const maxAccess = addMonths(today, 3);
    const projectEnd = selectedProject.end_date ? parseISO(selectedProject.end_date) : null;
    const endDate = projectEnd ? dateMin([projectEnd, maxAccess]) : maxAccess;
    return format(endDate, "yyyy-MM-dd");
  })();

  useEffect(() => {
    if (watchedProjectId && projects && computedAccessEnd) {
      form.setValue("expiry_date", computedAccessEnd);
    }
  }, [watchedProjectId, projects, form, computedAccessEnd]);

  // Reset acknowledgment when fitness status changes away from "fit"
  useEffect(() => {
    if (!isFit) {
      form.setValue("fitness_acknowledged", false);
    }
  }, [isFit, form]);

  // Debounced duplicate national ID check
  const handleNationalIdCheck = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 5) { setIsDuplicate(false); return; }
    debounceRef.current = setTimeout(async () => {
      const exists = await checkDuplicate(value, isEditing ? worker?.id : undefined);
      setIsDuplicate(exists);
    }, 500);
  }, [checkDuplicate, isEditing, worker?.id]);

  useEffect(() => {
    handleNationalIdCheck(watchedNationalId);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [watchedNationalId, handleNationalIdCheck]);

  // Medical certificate upload handler
  const handleMedicalCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return;
    setUploadingCert(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase.from("profiles").select("tenant_id").eq("id", user?.id ?? "").single();
      const tenantId = profileData?.tenant_id;
      if (!tenantId) throw new Error("No tenant");
      const ext = file.name.split('.').pop();
      const path = `${tenantId}/medical-certificates/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("contractor-documents")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      setMedicalCertPath(path);
    } catch (err: unknown) {
      const { toast } = await import("sonner");
      toast.error(t("contractors.workers.certUploadFailed", "Failed to upload medical certificate"));
    } finally {
      setUploadingCert(false);
    }
  };

  useEffect(() => {
    if (worker) {
      form.reset({
        company_id: worker.company_id,
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
        worker_role: worker.worker_role || "",
        preferred_language: worker.preferred_language,
        fitness_to_work: worker.fitness_to_work || "",
        fitness_acknowledged: worker.fitness_acknowledged || false,
        medical_check_date: worker.medical_check_date || "",
        fitness_expiry_date: worker.fitness_expiry_date || "",
        training_certifications: worker.training_certifications || [],
        project_id: "",
        expiry_date: "",
        photo_path: worker.photo_path || null,
      });
      setMedicalCertPath(worker.medical_certificate_path || null);
    } else {
      form.reset(defaultValues);
      setMedicalCertPath(null);
    }
    setShowSuccessAlert(false);
    setIsDuplicate(false);
  }, [worker, open, form]);

  const onSubmit = async (values: WorkerFormValues) => {
    if (isBlacklisted || isDuplicate) return;
    try {
      if (isEditing && worker) {
        await updateWorker.mutateAsync({
          id: worker.id,
          company_id: values.company_id,
          full_name: values.full_name,
          full_name_ar: values.full_name_ar || null,
          id_type: values.id_type,
          national_id: values.national_id,
          date_of_birth: values.date_of_birth || null,
          gender: values.gender || null,
          nationality: values.nationality,
          mobile_number: values.mobile_number,
          email: values.email || null,
          emergency_contact_name: values.emergency_contact_name || null,
          emergency_contact_phone: values.emergency_contact_phone || null,
          worker_role: values.worker_role || null,
          preferred_language: values.preferred_language,
          fitness_to_work: values.fitness_to_work || null,
          fitness_acknowledged: values.fitness_acknowledged,
          medical_check_date: values.medical_check_date || null,
          fitness_expiry_date: values.fitness_expiry_date || null,
          training_certifications: values.training_certifications,
          photo_path: values.photo_path,
          medical_certificate_path: medicalCertPath,
        });
        setShowSuccessAlert(true);
        setTimeout(() => { onOpenChange(false); setShowSuccessAlert(false); }, 1500);
      } else {
        await createWorker.mutateAsync({
          ...values,
          photo_path: values.photo_path,
          medical_certificate_path: medicalCertPath,
          expiry_date: values.expiry_date || null,
          user_type: "short_term_contractor",
          access_start_date: computedAccessStart || null,
          access_end_date: computedAccessEnd || null,
        });
        onOpenChange(false);
      }
    } catch {
      // Errors handled by mutation's onError
    }
  };

  const isPending = createWorker.isPending || updateWorker.isPending;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
              {/* Photo */}
              <div className="flex justify-center">
                <Controller
                  control={form.control}
                  name="photo_path"
                  render={({ field }) => (
                    <WorkerPhotoUpload photoPath={field.value} onPhotoChange={field.onChange} workerId={worker?.id} disabled={isPending} />
                  )}
                />
              </div>

              {/* Section 1: Personal Info */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.personal", "Personal Information")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormItem><FormLabel>{t("contractors.workers.name", "Full Name")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="full_name_ar" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.nameAr", "Full Name (Arabic)")}</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="id_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.idType", "ID Type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ID_TYPES.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="national_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.nationalId", "National ID")} *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      {isBlacklisted && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <ShieldAlert className="h-4 w-4" />
                          {t("contractors.workers.blacklistedError", "This worker is on the security blacklist and cannot be added")}
                        </p>
                      )}
                      {isDuplicate && !isBlacklisted && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-4 w-4" />
                          {t("contractors.workers.duplicateIdError", "A worker with this ID already exists")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.dob", "Date of Birth")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.gender", "Gender")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{t(g.labelKey, g.fallback)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.nationality", "Nationality")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("contractors.workers.selectNationality", "Select nationality")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <ScrollArea className="h-[280px]" dir={isRTL ? 'rtl' : 'ltr'}>
                            {NATIONALITIES.map((nat) => <SelectItem key={nat.code} value={nat.code}>{isRTL ? nat.name_ar : nat.name}</SelectItem>)}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Section 2: Contact */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.contact", "Contact Information")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="mobile_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.mobile", "Mobile")} *</FormLabel>
                      <FormControl>
                        <DhuudPhoneInput value={field.value} onChange={field.onChange} defaultCountry="SA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.email", "Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.emergencyName", "Emergency Contact Name")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.emergencyPhone", "Emergency Contact Phone")}</FormLabel>
                      <FormControl>
                        <DhuudPhoneInput value={field.value || ""} onChange={(v) => field.onChange(v || "")} defaultCountry="SA" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Section 3: Work Details + Project */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.work", "Work Details")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Assignment */}
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.projectAssignment", "Project Assignment")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !watchedCompanyId
                                ? t("contractors.workers.selectCompanyFirst", "Select company first")
                                : projectsLoading
                                  ? t("common.loading", "Loading...")
                                  : t("contractors.workers.selectProject", "Select project")
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeProjects.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              {t("contractors.workers.noProjects", "No active projects for this company")}
                            </SelectItem>
                          ) : (
                            activeProjects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.project_code} — {isRTL && p.project_name_ar ? p.project_name_ar : p.project_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="worker_role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.role", "Role")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {WORKER_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{t(r.labelKey, r.fallback)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="preferred_language" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.preferredLanguage", "Preferred Language")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{LANGUAGES.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="expiry_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.accessEndDate", "Access End Date")}</FormLabel>
                      <FormControl><Input type="date" {...field} disabled className="bg-muted" /></FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* Access Duration Info */}
                {watchedProjectId && computedAccessEnd && (
                  <Alert className="mt-3 border-primary/30 bg-primary/5">
                    <Clock className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      <strong>{t("contractors.workers.accessDurationRule", "Access Duration Rule")}:</strong>{" "}
                      {t("contractors.workers.accessDurationInfo", "Maximum access duration is 3 months from approval date. Access will automatically expire on {{date}}. Manual renewal is required after expiration.", { date: computedAccessEnd })}
                      {computedAccessStart && (
                        <span className="block mt-1 text-xs text-muted-foreground">
                          {t("contractors.workers.projectPeriod", "Project period")}: {computedAccessStart} → {selectedProject?.end_date || "—"}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Section 4: Fitness to Work */}
              <div>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    {t("contractors.workers.sections.fitness", "Fitness to Work")}
                  </span>
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fitness_to_work" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("contractors.workers.fitnessStatus", "Fitness Status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select status")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {FITNESS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  {/* Warning for Not Fit / Pending */}
                  {isNotFitOrPending && (
                    <div className="md:col-span-2">
                      <Alert variant="destructive" className="border-destructive/30">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {watchedFitness === "not_fit"
                            ? t("contractors.workers.notFitWarning", "This worker is not medically fit. They will be flagged as high risk and restricted from PTW and high-risk task assignments.")
                            : t("contractors.workers.pendingMedicalWarning", "This worker has a pending medical check. Worker activation will be restricted until medical clearance is confirmed.")
                          }
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {isFit && (
                    <>
                      <FormField control={form.control} name="fitness_acknowledged" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                            <div className="flex items-start gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                              </FormControl>
                              <FormLabel className="text-sm font-normal leading-relaxed cursor-pointer">
                                {t("contractors.workers.fitnessAcknowledgment", "I confirm that the worker has undergone a medical check-up and is medically fit to perform the assigned duties.")}
                              </FormLabel>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="medical_check_date" render={({ field }) => (
                        <FormItem><FormLabel>{t("contractors.workers.medicalCheckDate", "Medical Check Date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="fitness_expiry_date" render={({ field }) => (
                        <FormItem><FormLabel>{t("contractors.workers.fitnessExpiryDate", "Fitness Expiry Date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />

                      {/* Medical Certificate Upload */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">
                          {t("contractors.workers.medicalCertificate", "Medical Certificate")}
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
                                ? t("contractors.workers.certificateUploaded", "Certificate Uploaded ✓")
                                : t("contractors.workers.uploadCertificate", "Upload Certificate")
                            }
                          </Button>
                          {medicalCertPath && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("contractors.workers.certificateReady", "Medical certificate has been attached")}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Section 5: Training & Certifications */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.certifications", "Training & Certifications")}</SectionTitle>
                <FormField control={form.control} name="training_certifications" render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TRAINING_CERTS.map(cert => (
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
                                    field.onChange(checked ? [...current, cert.value] : current.filter((v: string) => v !== cert.value));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">{t(cert.labelKey, cert.fallback)}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </FormItem>
                )} />

                {/* PTW restriction warning if not fit */}
                {hasPTW && isNotFitOrPending && (
                  <Alert variant="destructive" className="mt-3 border-destructive/30">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {t("contractors.workers.ptwFitnessRestriction", "PTW access cannot be requested while the worker is not medically cleared. Medical fitness is required for PTW eligibility.")}
                    </AlertDescription>
                  </Alert>
                )}

                {hasPTW && !isNotFitOrPending && (
                  <Alert className="mt-3 border-primary/30 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      {t("contractors.workers.ptwInfo", "This worker will be eligible for PTW Receiver access after HSSE Expert approval.")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
                <Button type="submit" disabled={isPending || isBlacklisted || isDuplicate}>
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
