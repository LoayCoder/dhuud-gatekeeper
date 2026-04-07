import { useForm } from "react-hook-form";
import { ShieldAlert, Info, AlertCircle, Upload, HeartPulse } from "lucide-react";
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
    // If "fit", acknowledgment must be checked
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

const LANGUAGES = [
  { value: "ar", label: "العربية (Arabic)" },
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "fil", label: "Filipino" },
];

const ID_TYPES = [
  { value: "national_id", labelKey: "contractors.workers.idTypes.nationalId", fallback: "National ID" },
  { value: "iqama", labelKey: "contractors.workers.idTypes.iqama", fallback: "Iqama" },
  { value: "passport", labelKey: "contractors.workers.idTypes.passport", fallback: "Passport" },
];

const WORKER_ROLES = [
  { value: "manager", labelKey: "contractors.workers.roles.manager", fallback: "Manager" },
  { value: "supervisor", labelKey: "contractors.workers.roles.supervisor", fallback: "Supervisor" },
  { value: "laborer", labelKey: "contractors.workers.roles.laborer", fallback: "Laborer" },
  { value: "engineer", labelKey: "contractors.workers.roles.engineer", fallback: "Engineer" },
  { value: "leader", labelKey: "contractors.workers.roles.leader", fallback: "Leader" },
];

const FITNESS_OPTIONS = [
  { value: "fit", labelKey: "contractors.workers.fitness.fit", fallback: "Fit to Work – Medical Check Completed" },
  { value: "not_fit", labelKey: "contractors.workers.fitness.notFit", fallback: "Not Fit to Work" },
  { value: "pending_medical", labelKey: "contractors.workers.fitness.pending", fallback: "Pending Medical Check" },
];

const TRAINING_CERTS = [
  { value: "first_aid", labelKey: "contractors.workers.certs.firstAid", fallback: "First Aid" },
  { value: "fire_safety", labelKey: "contractors.workers.certs.fireSafety", fallback: "Fire Safety" },
  { value: "ptw", labelKey: "contractors.workers.certs.ptw", fallback: "PTW (Permit to Work)" },
  { value: "confined_space", labelKey: "contractors.workers.certs.confinedSpace", fallback: "Confined Space" },
  { value: "working_at_height", labelKey: "contractors.workers.certs.workingAtHeight", fallback: "Working at Height" },
];

const GENDERS = [
  { value: "male", labelKey: "common.male", fallback: "Male" },
  { value: "female", labelKey: "common.female", fallback: "Female" },
];

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
      full_name: "", id_type: "national_id", national_id: "", date_of_birth: "",
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

  // Auto-set expiry_date from selected project's end_date
  useEffect(() => {
    if (watchedProjectId && projects) {
      const selectedProject = projects.find(p => p.id === watchedProjectId);
      if (selectedProject?.end_date) {
        form.setValue("expiry_date", selectedProject.end_date);
      }
    }
  }, [watchedProjectId, projects, form]);

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
      const ext = file.name.split('.').pop();
      const path = `medical-certificates/${companyId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("contractor-documents")
        .upload(path, file, { upsert: true });
      
      if (!error) {
        setMedicalCertPath(path);
      }
    } finally {
      setUploadingCert(false);
    }
  };

  const onSubmit = async (data: WorkerFormData) => {
    if (blacklistedIds?.has(data.national_id) || isDuplicate) return;
    await createWorker.mutateAsync({
      company_id: companyId,
      full_name: data.full_name,
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

              {/* Company (auto-linked, read-only) */}
              {companyName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t("contractors.company", "Company")}</label>
                  <Input value={companyName} disabled className="mt-1 bg-muted" />
                </div>
              )}

              {/* ── Section 1: Personal Information ── */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.personal", "Personal Information")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.name", "Full Name")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                      <FormLabel>{t("contractors.workers.expiryDate", "Expiry Date")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      {watchedProjectId && (
                        <p className="text-xs text-muted-foreground">
                          {t("contractors.workers.expiryAutoSet", "Auto-set from project end date")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
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
