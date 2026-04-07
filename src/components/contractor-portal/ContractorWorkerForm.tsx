import { useForm } from "react-hook-form";
import { ShieldAlert, Info } from "lucide-react";
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
import { useContractorPortalCreateWorker } from "@/features/contractors/hooks/use-contractor-portal";
import { NATIONALITIES } from "@/lib/nationalities";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { WorkerPhotoUpload } from "@/features/contractors/components/WorkerPhotoUpload";
import { useState } from "react";

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
  worker_role: z.string().default("laborer"),
  preferred_language: z.string().default("ar"),
  fitness_to_work: z.string().optional(),
  training_certifications: z.array(z.string()).default([]),
});

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
  { value: "yes", labelKey: "common.yes", fallback: "Yes" },
  { value: "no", labelKey: "common.no", fallback: "No" },
  { value: "optional", labelKey: "common.optional", fallback: "Optional" },
  { value: "ptw", labelKey: "contractors.workers.ptw", fallback: "PTW" },
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

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      full_name: "", id_type: "national_id", national_id: "", date_of_birth: "",
      gender: "", nationality: "", mobile_number: "", email: "",
      emergency_contact_name: "", emergency_contact_phone: "",
      worker_role: "laborer", preferred_language: "ar",
      fitness_to_work: "", training_certifications: [],
    },
  });

  const watchedNationalId = form.watch("national_id");
  const watchedCerts = form.watch("training_certifications");
  const isBlacklisted = blacklistedIds?.has(watchedNationalId) ?? false;
  const hasPTW = watchedCerts?.includes("ptw");

  const onSubmit = async (data: WorkerFormData) => {
    if (blacklistedIds?.has(data.national_id)) return;
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
      training_certifications: data.training_certifications,
      photo_path: photoPath,
    });
    form.reset();
    setPhotoPath(null);
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

                  <FormField control={form.control} name="fitness_to_work" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contractors.workers.fitnessToWork", "Fitness to Work")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {FITNESS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey, opt.fallback)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* ── Section 4: Training & Certifications ── */}
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

                {hasPTW && (
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
                <Button type="submit" disabled={createWorker.isPending || isBlacklisted}>
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
