import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ContractorCompany, useCreateContractorCompany, useUpdateContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { useBranches, useDepartments, useSections, useClientRepresentatives } from "@/hooks/contractor-management/use-contractor-company-details";
import { useContractorSafetyOfficers } from "@/hooks/contractor-management/use-contractor-safety-officers";
import { useSendIdCardsForCompany } from "@/hooks/contractor-management/use-contractor-id-cards";
import { useSyncPersonnelToWorkers } from "@/hooks/contractor-management/use-sync-personnel-to-workers";
import { SiteRepWorkerForm, SiteRepFormData } from "./SiteRepWorkerForm";
import { SafetyOfficerFullFormList, SafetyOfficerFullFormData } from "./SafetyOfficerFullForm";
import { useAuth } from "@/contexts/AuthContext";
import { Building, Users, Briefcase, Info, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: ContractorCompany | null;
}

interface FormData {
  company_name: string;
  company_name_ar: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  commercial_registration_number: string;
  vat_number: string;
  scope_of_work: string;
  contract_start_date: string;
  contract_end_date: string;
  total_workers: number;
  client_site_rep_id: string;
  assigned_branch_id: string;
  assigned_department_id: string;
  assigned_section_id: string;
}

const initialFormData: FormData = {
  company_name: "",
  company_name_ar: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  commercial_registration_number: "",
  vat_number: "",
  scope_of_work: "",
  contract_start_date: "",
  contract_end_date: "",
  total_workers: 0,
  client_site_rep_id: "",
  assigned_branch_id: "",
  assigned_department_id: "",
  assigned_section_id: "",
};

const initialSiteRepData: SiteRepFormData = {
  full_name: "",
  national_id: "",
  mobile_number: "",
  nationality: "",
  photo_path: null,
  phone: "",
  email: "",
};

const STEPS = ["basic", "scope", "assignment", "personnel"] as const;
type Step = typeof STEPS[number];

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const createCompany = useCreateContractorCompany();
  const updateCompany = useUpdateContractorCompany();
  const syncPersonnel = useSyncPersonnelToWorkers();
  const sendIdCards = useSendIdCardsForCompany();
  const isEditing = !!company;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [siteRepData, setSiteRepData] = useState<SiteRepFormData>(initialSiteRepData);
  const [safetyOfficers, setSafetyOfficers] = useState<SafetyOfficerFullFormData[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>("basic");

  // Fetch dropdown data
  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments(formData.assigned_branch_id || null);
  const { data: sections = [] } = useSections(formData.assigned_department_id || null);
  const { data: representatives = [] } = useClientRepresentatives();
  const { data: existingOfficers = [] } = useContractorSafetyOfficers(company?.id ?? null);

  useEffect(() => {
    if (company && open) {
      setFormData({
        company_name: company.company_name || "",
        company_name_ar: company.company_name_ar || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        commercial_registration_number: company.commercial_registration_number || "",
        vat_number: company.vat_number || "",
        scope_of_work: (company as any).scope_of_work || "",
        contract_start_date: (company as any).contract_start_date || "",
        contract_end_date: (company as any).contract_end_date || "",
        total_workers: (company as any).total_workers || 0,
        client_site_rep_id: (company as any).client_site_rep_id || "",
        assigned_branch_id: (company as any).assigned_branch_id || "",
        assigned_department_id: (company as any).assigned_department_id || "",
        assigned_section_id: (company as any).assigned_section_id || "",
      });
      // Load existing site rep data
      setSiteRepData({
        full_name: (company as any).contractor_site_rep_name || "",
        national_id: (company as any).contractor_site_rep_national_id || "",
        mobile_number: (company as any).contractor_site_rep_mobile || "",
        nationality: (company as any).contractor_site_rep_nationality || "",
        photo_path: (company as any).contractor_site_rep_photo || null,
        phone: (company as any).contractor_site_rep_phone || "",
        email: (company as any).contractor_site_rep_email || "",
      });
      setCurrentStep("basic");
    } else if (!open) {
      setFormData(initialFormData);
      setSiteRepData(initialSiteRepData);
      setSafetyOfficers([]);
      setCurrentStep("basic");
    }
  }, [company, open]);

  // Load existing safety officers when editing
  useEffect(() => {
    if (existingOfficers.length > 0 && open) {
      setSafetyOfficers(existingOfficers.map(o => ({
        id: o.id,
        full_name: o.name, // Map from legacy name field
        national_id: (o as any).national_id || "",
        mobile_number: (o as any).mobile_number || o.phone || "",
        nationality: (o as any).nationality || "",
        photo_path: (o as any).photo_path || null,
        phone: o.phone || "",
        email: o.email || "",
        is_primary: o.is_primary,
      })));
    }
  }, [existingOfficers, open]);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const goToNextStep = () => {
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      client_site_rep_id: formData.client_site_rep_id || null,
      assigned_branch_id: formData.assigned_branch_id || null,
      assigned_department_id: formData.assigned_department_id || null,
      assigned_section_id: formData.assigned_section_id || null,
      contract_start_date: formData.contract_start_date || null,
      contract_end_date: formData.contract_end_date || null,
      safety_officers_count: safetyOfficers.length,
      // Site rep fields for backward compatibility
      contractor_site_rep_name: siteRepData.full_name,
      contractor_site_rep_phone: siteRepData.phone,
      contractor_site_rep_email: siteRepData.email,
    };

    let companyId: string;

    if (isEditing) {
      await updateCompany.mutateAsync({ id: company.id, data: submitData });
      companyId = company.id;
    } else {
      const result = await createCompany.mutateAsync(submitData);
      companyId = result.id;
    }

    // Sync site rep and safety officers to contractor_workers table
    if (profile?.tenant_id) {
      await syncPersonnel.mutateAsync({
        companyId,
        tenantId: profile.tenant_id,
        siteRep: siteRepData.full_name && siteRepData.national_id ? siteRepData : null,
        safetyOfficers: safetyOfficers.filter(o => o.full_name && o.national_id),
      });
    }

    // Send notifications for new companies
    if (profile?.tenant_id && !isEditing) {
      const hasContactsWithPhones = 
        siteRepData.mobile_number || 
        safetyOfficers.some(o => o.mobile_number);

      // Build recipients list for welcome notification
      const welcomeRecipients: Array<{ name: string; phone: string; email?: string }> = [];
      
      if (siteRepData.mobile_number) {
        welcomeRecipients.push({
          name: siteRepData.full_name,
          phone: siteRepData.mobile_number,
          email: siteRepData.email || undefined,
        });
      }
      
      safetyOfficers.filter(o => o.mobile_number).forEach(o => {
        welcomeRecipients.push({
          name: o.full_name,
          phone: o.mobile_number,
          email: o.email || undefined,
        });
      });

      // Send welcome notification (in background)
      if (welcomeRecipients.length > 0) {
        supabase.functions.invoke('send-contractor-welcome', {
          body: {
            tenant_id: profile.tenant_id,
            company_id: companyId,
            company_name: formData.company_name,
            contract_end_date: formData.contract_end_date || undefined,
            recipients: welcomeRecipients,
          },
        }).catch(err => {
          console.warn('[CompanyFormDialog] Failed to send welcome notification:', err);
        });
      }

      // Send ID cards via WhatsApp/Email
      if (hasContactsWithPhones) {
        sendIdCards.mutate({
          company_id: companyId,
          tenant_id: profile.tenant_id,
          company_name: formData.company_name,
          contract_end_date: formData.contract_end_date || undefined,
          site_rep: siteRepData.mobile_number ? {
            name: siteRepData.full_name,
            phone: siteRepData.mobile_number,
            email: siteRepData.email || undefined,
          } : undefined,
          safety_officers: safetyOfficers
            .filter(o => o.mobile_number)
            .map(o => ({
              id: o.id,
              name: o.full_name,
              phone: o.mobile_number,
              email: o.email || undefined,
            })),
        });
      }
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("contractors.companies.editCompany", "Edit Company") : t("contractors.companies.addCompany", "Add Company")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as Step)} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="text-xs">
                <Info className="h-4 w-4 me-1" />
                <span className="hidden sm:inline">{t("contractors.companies.basicInfo", "Basic")}</span>
              </TabsTrigger>
              <TabsTrigger value="scope" className="text-xs">
                <Briefcase className="h-4 w-4 me-1" />
                <span className="hidden sm:inline">{t("contractors.companies.scope", "Scope")}</span>
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs">
                <Building className="h-4 w-4 me-1" />
                <span className="hidden sm:inline">{t("contractors.companies.assignment", "Assignment")}</span>
              </TabsTrigger>
              <TabsTrigger value="personnel" className="text-xs">
                <Users className="h-4 w-4 me-1" />
                <span className="hidden sm:inline">{t("contractors.companies.personnel", "Personnel")}</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.companies.name", "Company Name")} *</Label>
                  <Input 
                    value={formData.company_name} 
                    onChange={(e) => handleChange("company_name", e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.companies.nameAr", "Company Name (Arabic)")}</Label>
                  <Input 
                    value={formData.company_name_ar} 
                    onChange={(e) => handleChange("company_name_ar", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.companies.email", "Email")}</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => handleChange("email", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.companies.phone", "Phone")}</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => handleChange("phone", e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.companies.address", "Address")}</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => handleChange("address", e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.companies.city", "City")}</Label>
                  <Input 
                    value={formData.city} 
                    onChange={(e) => handleChange("city", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.companies.commercialReg", "Commercial Registration")}</Label>
                  <Input 
                    value={formData.commercial_registration_number} 
                    onChange={(e) => handleChange("commercial_registration_number", e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.companies.vatNumber", "VAT Number")}</Label>
                <Input 
                  value={formData.vat_number} 
                  onChange={(e) => handleChange("vat_number", e.target.value)} 
                />
              </div>
            </TabsContent>

            {/* Scope Tab */}
            <TabsContent value="scope" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.companies.startDate", "Contract Start Date")}</Label>
                  <Input 
                    type="date" 
                    value={formData.contract_start_date} 
                    onChange={(e) => handleChange("contract_start_date", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.companies.endDate", "Contract End Date")}</Label>
                  <Input 
                    type="date" 
                    value={formData.contract_end_date} 
                    onChange={(e) => handleChange("contract_end_date", e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.companies.totalWorkers", "Total Workers")}</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.total_workers} 
                    onChange={(e) => handleChange("total_workers", parseInt(e.target.value) || 0)} 
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("contractors.companies.safetyOfficerCountNote", "Safety officers are managed in the Personnel tab")}
              </p>
              <div className="space-y-2">
                <Label>{t("contractors.companies.scopeOfWork", "Scope of Work")}</Label>
                <Textarea 
                  value={formData.scope_of_work} 
                  onChange={(e) => handleChange("scope_of_work", e.target.value)}
                  rows={4}
                  placeholder={t("contractors.companies.scopePlaceholder", "Describe the general scope of work...")}
                />
              </div>
            </TabsContent>

            {/* Assignment Tab */}
            <TabsContent value="assignment" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{t("contractors.companies.branch", "Branch")}</Label>
                <Select 
                  value={formData.assigned_branch_id} 
                  onValueChange={(v) => {
                    handleChange("assigned_branch_id", v);
                    handleChange("assigned_department_id", "");
                    handleChange("assigned_section_id", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("contractors.companies.selectBranch", "Select branch")} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.companies.department", "Department")}</Label>
                <Select 
                  value={formData.assigned_department_id} 
                  onValueChange={(v) => {
                    handleChange("assigned_department_id", v);
                    handleChange("assigned_section_id", "");
                  }}
                  disabled={!formData.assigned_branch_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("contractors.companies.selectDepartment", "Select department")} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.companies.section", "Section")}</Label>
                <Select 
                  value={formData.assigned_section_id} 
                  onValueChange={(v) => handleChange("assigned_section_id", v)}
                  disabled={!formData.assigned_department_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("contractors.companies.selectSection", "Select section")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Personnel Tab */}
            <TabsContent value="personnel" className="mt-4 space-y-6">
              {/* Contractor Site Representative - Full Form */}
              <SiteRepWorkerForm 
                data={siteRepData}
                onChange={setSiteRepData}
              />

              {/* Contractor Safety Officers List - Full Form */}
              <SafetyOfficerFullFormList 
                officers={safetyOfficers} 
                onChange={setSafetyOfficers} 
              />

              {/* Client Site Representative */}
              <div className="space-y-2">
                <Label>{t("contractors.companies.clientSiteRep", "Company's Site Representative")}</Label>
                <Select 
                  value={formData.client_site_rep_id} 
                  onValueChange={(v) => handleChange("client_site_rep_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("contractors.companies.selectRep", "Select representative")} />
                  </SelectTrigger>
                  <SelectContent>
                    {representatives.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.full_name} {rep.email && `(${rep.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between gap-2 pt-6 border-t mt-6">
            <div>
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep}>
                  {t("common.previous", "Previous")}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              {isLastStep ? (
                <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending || syncPersonnel.isPending}>
                  {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
                </Button>
              ) : (
                <Button type="button" onClick={goToNextStep}>
                  {t("common.next", "Next")}
                  <ChevronRight className="h-4 w-4 ms-1" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
