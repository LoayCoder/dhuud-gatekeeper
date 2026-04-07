import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, HeartPulse } from "lucide-react";
import { ContractorWorker, useCreateContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { useUpdateContractorWorker } from "@/features/contractors/hooks/use-update-contractor-worker";
import { ContractorCompany } from "@/features/contractors/hooks/use-contractor-companies";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { NATIONALITIES } from "@/lib/nationalities";
import { LANGUAGES, ID_TYPES, WORKER_ROLES, FITNESS_OPTIONS, TRAINING_CERTS, GENDERS } from "@/features/contractors/constants/worker-constants";
import { workerFormSchema, type WorkerFormValues } from './WorkerFormSchema';

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  companies: ContractorCompany[];
}

const defaultValues: WorkerFormValues = {
  company_id: "", full_name: "", full_name_ar: "", id_type: "national_id",
  national_id: "", date_of_birth: "", gender: "", nationality: "",
  mobile_number: "", email: "", emergency_contact_name: "", emergency_contact_phone: "",
  worker_role: "", preferred_language: "en",
  fitness_to_work: "", fitness_acknowledged: false,
  medical_check_date: "", fitness_expiry_date: "",
  training_certifications: [], project_id: "", photo_path: null,
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
        });
        setShowSuccessAlert(true);
        setTimeout(() => { onOpenChange(false); setShowSuccessAlert(false); }, 1500);
      } else {
        await createWorker.mutateAsync(values);
        onOpenChange(false);
      }
    } catch {
      // Errors handled by mutation's onError
    }
  };

  const isPending = createWorker.isPending || updateWorker.isPending;
  const watchedFitness = form.watch("fitness_to_work");
  const isFit = watchedFitness === "fit";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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
                    <FormItem><FormLabel>{t("contractors.workers.nationalId", "National ID")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>{t("contractors.workers.mobile", "Mobile")} *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.email", "Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.emergencyName", "Emergency Contact Name")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                    <FormItem><FormLabel>{t("contractors.workers.emergencyPhone", "Emergency Contact Phone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Section 3: Work Details */}
              <div>
                <SectionTitle>{t("contractors.workers.sections.work", "Work Details")}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
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

                  {isFit && (
                    <>
                      <FormField control={form.control} name="fitness_acknowledged" render={({ field }) => (
                        <FormItem className="md:col-span-2 flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {t("contractors.workers.fitnessAcknowledgment", "I confirm that the worker has undergone a medical check-up and is medically fit.")}
                          </FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="medical_check_date" render={({ field }) => (
                        <FormItem><FormLabel>{t("contractors.workers.medicalCheckDate", "Medical Check Date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="fitness_expiry_date" render={({ field }) => (
                        <FormItem><FormLabel>{t("contractors.workers.fitnessExpiryDate", "Fitness Expiry Date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
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
              </div>

              {/* Actions */}
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
