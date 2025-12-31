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
import { useContractorSafetyOfficers, useSyncContractorSafetyOfficers, SafetyOfficerFormData } from "@/hooks/contractor-management/use-contractor-safety-officers";
import { useSendIdCardsForCompany } from "@/hooks/contractor-management/use-contractor-id-cards";
import { SafetyOfficersList } from "./SafetyOfficersList";
import { useAuth } from "@/contexts/AuthContext";
import { Building, Users, Briefcase, Info } from "lucide-react";

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
  contractor_site_rep_name: string;
  contractor_site_rep_phone: string;
  contractor_site_rep_email: string;
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
  contractor_site_rep_name: "",
  contractor_site_rep_phone: "",
  contractor_site_rep_email: "",
  client_site_rep_id: "",
  assigned_branch_id: "",
  assigned_department_id: "",
  assigned_section_id: "",
};

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const createCompany = useCreateContractorCompany();
  const updateCompany = useUpdateContractorCompany();
  const syncSafetyOfficers = useSyncContractorSafetyOfficers();
  const sendIdCards = useSendIdCardsForCompany();
  const isEditing = !!company;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [safetyOfficers, setSafetyOfficers] = useState<SafetyOfficerFormData[]>([]);

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
        contractor_site_rep_name: (company as any).contractor_site_rep_name || "",
        contractor_site_rep_phone: (company as any).contractor_site_rep_phone || "",
        contractor_site_rep_email: (company as any).contractor_site_rep_email || "",
        client_site_rep_id: (company as any).client_site_rep_id || "",
        assigned_branch_id: (company as any).assigned_branch_id || "",
        assigned_department_id: (company as any).assigned_department_id || "",
        assigned_section_id: (company as any).assigned_section_id || "",
      });
    } else if (!open) {
      setFormData(initialFormData);
      setSafetyOfficers([]);
    }
  }, [company, open]);

  // Load existing safety officers when editing
  useEffect(() => {
    if (existingOfficers.length > 0 && open) {
      setSafetyOfficers(existingOfficers.map(o => ({
        id: o.id,
        name: o.name,
        phone: o.phone || "",
        email: o.email || "",
        is_primary: o.is_primary,
      })));
    }
  }, [existingOfficers, open]);

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
      // Update safety_officers_count based on actual officers
      safety_officers_count: safetyOfficers.length,
    };

    let companyId: string;

    if (isEditing) {
      await updateCompany.mutateAsync({ id: company.id, data: submitData });
      companyId = company.id;
    } else {
      const result = await createCompany.mutateAsync(submitData);
      companyId = result.id;
    }

    // Sync safety officers
    if (safetyOfficers.length > 0 || existingOfficers.length > 0) {
      await syncSafetyOfficers.mutateAsync({ companyId, officers: safetyOfficers });
    }

    // Send ID cards via WhatsApp for new companies or when contacts have phones
    if (profile?.tenant_id) {
      const hasContactsWithPhones = 
        formData.contractor_site_rep_phone || 
        safetyOfficers.some(o => o.phone);

      if (hasContactsWithPhones) {
        // Send ID cards in background (don't block form close)
        sendIdCards.mutate({
          company_id: companyId,
          tenant_id: profile.tenant_id,
          company_name: formData.company_name,
          contract_end_date: formData.contract_end_date || undefined,
          site_rep: formData.contractor_site_rep_phone ? {
            name: formData.contractor_site_rep_name,
            phone: formData.contractor_site_rep_phone,
            email: formData.contractor_site_rep_email || undefined,
          } : undefined,
          safety_officers: safetyOfficers
            .filter(o => o.phone)
            .map(o => ({
              id: o.id,
              name: o.name,
              phone: o.phone,
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
          <Tabs defaultValue="basic" className="mt-4">
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
              {/* Contractor Site Representative */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">{t("contractors.companies.contractorSiteRep", "Contractor's Site Representative")}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.name", "Name")}</Label>
                    <Input 
                      value={formData.contractor_site_rep_name} 
                      onChange={(e) => handleChange("contractor_site_rep_name", e.target.value)}
                      placeholder={t("contractors.companies.repName", "Representative name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.phone", "Phone")}</Label>
                    <Input 
                      value={formData.contractor_site_rep_phone} 
                      onChange={(e) => handleChange("contractor_site_rep_phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.email", "Email")}</Label>
                    <Input 
                      type="email"
                      value={formData.contractor_site_rep_email} 
                      onChange={(e) => handleChange("contractor_site_rep_email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Contractor Safety Officers List */}
              <SafetyOfficersList 
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

          <div className="flex justify-end gap-2 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
              {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
