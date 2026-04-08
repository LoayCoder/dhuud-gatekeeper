import { useForm } from "react-hook-form";
import { ShieldAlert, Info, AlertCircle, Upload, HeartPulse, Clock, Lock } from "lucide-react";
import { addMonths, format, min as dateMin, parseISO } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useContractorPortalCreateWorker, useContractorPortalProjects } from "@/features/contractors/hooks/use-contractor-portal";
import { useCheckDuplicateNationalId } from "@/features/contractors/hooks/use-contractor-workers";
import { NATIONALITIES } from "@/lib/nationalities";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { WorkerPhotoUpload } from "@/features/contractors/components/WorkerPhotoUpload";
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const workerSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  full_name_ar: z.string().optional(),
  id_type: z.string().default("national_id"),
  national_id: z.string().min(5, "ID number is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().min(1, "Nationality is required"),
  mobile_number: z.string().min(8, "Mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  worker_role: z.string().min(1, "Role is required"),
  preferred_language: z.string().default("ar"),
  fitness_to_work: z.string().min(1, "Fitness to work status is required"),
  fitness_acknowledged: z.boolean().default(false),
  medical_check_date: z.string().optional(),
  fitness_expiry_date: z.string().optional(),
  training_certifications: z.array(z.string()).default([]),
  project_id: z.string().min(1, "Project assignment is required"),
  expiry_date: z.string().optional(),
}).refine(
  (data) => {
    if (data.fitness_to_work === "fit" && !data.fitness_acknowledged) {
      return false;
    }
    return true;
  },
  {
    message: "You must confirm the medical fitness acknowledgment",
    path: ["fitness_acknowledged"],
  }
);

type WorkerFormData = z.infer<typeof workerSchema>;

interface ContractorWorkerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string;
  blacklistedIds?: Set<string>;
}

import { LANGUAGES, ID_TYPES, WORKER_ROLES, FITNESS_OPTIONS, TRAINING_CERTS, GENDERS } from "@/features/contractors/constants/worker-constants";

export default function ContractorWorkerForm({ open, onOpenChange, companyId, companyName, blacklistedIds }: ContractorWorkerFormProps) {
  const { t, i18n } = useTranslation();
  const createWorker = useContractorPortalCreateWorker();
  const isRTL = i18n.dir() === 'rtl';
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [medicalCertPath, setMedicalCertPath] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const checkDuplicate = useCheckDuplicateNationalId();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const certInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects filtered by company
  const { data: projects, isLoading: projectsLoading } = useContractorPortalProjects(companyId);
  const activeProjects = projects?.filter(p => ["active", "planned", "in_progress"].includes(p.status)) || [];

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      full_name: "", full_name_ar: "", id_type: "national_id", national_id: "", date_of_birth: "",
      gender: "", nationality: "", mobile_number: "", email: "",
      emergency_contact_name: "", emergency_contact_phone: "",
      worker_role: "laborer", preferred_language: "ar",
      fitness_to_work: "", fitness_acknowledged: false,
      medical_check_date: "", fitness_expiry_date: "",
      training_certifications: [],
      project_id: "", expiry_date: "",
    },
  });

  const watchedNationalId = form.watch("national_id");
  const watchedCerts = form.watch("training_certifications");
  const watchedProjectId = form.watch("project_id");
  const watchedFitness = form.watch("fitness_to_work");
  const isBlacklisted = blacklistedIds?.has(watchedNationalId) ?? false;
  const hasPTW = watchedCerts?.includes("ptw");
  const isFit = watchedFitness === "fit";
  const isNotFitOrPending = watchedFitness === "not_fit" || watchedFitness === "pending_medical";

  // Reset acknowledgment when fitness status changes away from "fit"
  useEffect(() => {
    if (!isFit) {
      form.setValue("fitness_acknowledged", false);
    }
  }, [isFit, form]);

  // Debounced duplicate national ID check
  const handleNationalIdCheck = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 5) {
      setIsDuplicate(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const exists = await checkDuplicate(value);
      setIsDuplicate(exists);
    }, 500);
  }, [checkDuplicate]);

  // Watch national_id changes for duplicate check
  useEffect(() => {
    handleNationalIdCheck(watchedNationalId);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [watchedNationalId, handleNationalIdCheck]);

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
    if (watchedProjectId && projects) {
      if (computedAccessEnd) {
        form.setValue("expiry_date", computedAccessEnd);
      }
    }
  }, [watchedProjectId, projects, form, computedAccessEnd]);

  // Medical certificate upload handler
  const handleMedicalCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return;
    }

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
    } catch {
      const { toast } = await import("sonner");
      toast.error(t("contractors.workers.certUploadFailed", "Failed to upload medical certificate"));
    } finally {
      setUploadingCert(false);
    }
  };

  const onSubmit = async (data: WorkerFormData) => {
    if (blacklistedIds?.has(data.national_id) || isDuplicate) return;
    await createWorker.mutateAsync({
      company_id: companyId,
      full_name: data.full_name,
      full_name_ar: data.full_name_ar || null,
      national_id: data.national_id,
      id_type: data.id_type,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      nationality: data.nationality,
      mobile_number: data.mobile_number,
      email: data.email || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      worker_role: data.worker_role,
      preferred_language: data.preferred_language,
      fitness_to_work: data.fitness_to_work || null,
      fitness_acknowledged: data.fitness_acknowledged,
      medical_check_date: data.medical_check_date || null,
      fitness_expiry_date: data.fitness_expiry_date || null,
      medical_certificate_path: medicalCertPath,
      training_certifications: data.training_certifications,
      photo_path: photoPath,
      project_id: data.project_id,
      expiry_date: data.expiry_date || null,
      user_type: "short_term_contractor",
      access_start_date: computedAccessStart || null,
      access_end_date: computedAccessEnd || null,
    });
    form.reset();
    setPhotoPath(null);
    setMedicalCertPath(null);
    setIsDuplicate(false);
    onOpenChange(false);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{t("contractorPortal.workers.addWorker", "Add Worker")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">

              {/* Company (auto-linked, read-only) + User Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("contractors.company", "Company")}</label>
                    <Input value={companyName} disabled className="mt-1 bg-muted" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("contractors.workers.userType", "User Type")}
                  </label>
                  <Input value={t("contractors.workers.shortTermContractor", "Short-term Contractor")} disabled className="mt-1 bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("contractors.workers.userTypeAutoAssigned", "Auto-assigned for contractor users")}
                  </p>
                </div>
              </div>

              {/* ── Section 1: Personal Information ── */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.personal", "Personal Information")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.name", "Full Name")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="full_name_ar" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.nameAr", "Full Name (Arabic)")}</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="id_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.idType", "ID Type")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ID_TYPES.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="national_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.nationalId", "ID Number")} *</FormLabel>
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
                    <FormItem><FormLabel>{t("contractors.workers.dob", "Date of Birth")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.gender", "Gender")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {GENDERS.map(g => (
                            <SelectItem key={g.value} value={g.value}>{t(g.labelKey, g.fallback)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.nationality", "Nationality")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("contractors.workers.selectNationality", "Select nationality")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <ScrollArea className="h-[280px]" dir={isRTL ? 'rtl' : 'ltr'}>
                            {NATIONALITIES.map(nat => (
                              <SelectItem key={nat.code} value={nat.code}>{isRTL ? nat.name_ar : nat.name}</SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Photo Upload */}
                <div className="mt-4">
                  <WorkerPhotoUpload photoPath={photoPath} onPhotoChange={setPhotoPath} />
                </div>
              </div>

              <Separator />

              {/* ── Section 2: Contact Information ── */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.contact", "Contact Information")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="mobile_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.mobile", "Mobile Number")} *</FormLabel>
                      <FormControl>
                        <DhuudPhoneInput value={field.value} onChange={field.onChange} defaultCountry="SA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.email", "Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.emergencyName", "Emergency Contact Name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.emergencyPhone", "Emergency Contact Number")}</FormLabel>
                      <FormControl>
                        <DhuudPhoneInput value={field.value || ""} onChange={(v) => field.onChange(v || "")} defaultCountry="SA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* ── Section 3: Work Details ── */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.work", "Work Details")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Assignment - company-filtered */}
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.projectAssignment", "Project Assignment")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={projectsLoading ? t("common.loading", "Loading...") : t("contractors.workers.selectProject", "Select project")} />
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
                      <FormLabel>{t("contractors.workers.role", "Role")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {WORKER_ROLES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{t(r.labelKey, r.fallback)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="preferred_language" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.preferredLanguage", "Preferred Language")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{LANGUAGES.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="expiry_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.accessEndDate", "Access End Date")}</FormLabel>
                      <FormControl><Input type="date" {...field} disabled className="bg-muted" /></FormControl>
                      <FormMessage />
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

              {/* ── Section 4: Fitness to Work (Acknowledgment-Based) ── */}
              <div>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    {t("contractors.workers.sections.fitness", "Fitness to Work")} *
                  </span>
                </SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="fitness_to_work" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("contractors.workers.fitnessStatus", "Fitness Status")} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select status")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {FITNESS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Acknowledgment checkbox — only when "Fit to Work" is selected */}
                  {isFit && (
                    <FormField control={form.control} name="fitness_acknowledged" render={({ field }) => (
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
                                "I confirm that the worker has undergone a medical check-up and is medically fit to perform the assigned duties. The medical examination results are valid and compliant with HSSE requirements."
                              )}
                            </FormLabel>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

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

                  {/* Supporting fields — Medical Check Date & Fitness Expiry */}
                  {isFit && (
                    <>
                      <FormField control={form.control} name="medical_check_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contractors.workers.medicalCheckDate", "Medical Check Date")}</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="fitness_expiry_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contractors.workers.fitnessExpiryDate", "Fitness Expiry Date")}</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
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

              {/* ── Section 5: Training & Certifications ── */}
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
                                    field.onChange(
                                      checked
                                        ? [...current, cert.value]
                                        : current.filter((v: string) => v !== cert.value)
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
              <div className="flex justify-end gap-2 pt-4 pb-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={createWorker.isPending || isBlacklisted || isDuplicate}>
                  {createWorker.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
