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
  safety_officers_count: number;
  contractor_site_rep_name: string;
  contractor_site_rep_phone: string;
  contractor_site_rep_email: string;
  contractor_safety_officer_name: string;
  contractor_safety_officer_phone: string;
  contractor_safety_officer_email: string;
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
  safety_officers_count: 0,
  contractor_site_rep_name: "",
  contractor_site_rep_phone: "",
  contractor_site_rep_email: "",
  contractor_safety_officer_name: "",
  contractor_safety_officer_phone: "",
  contractor_safety_officer_email: "",
  client_site_rep_id: "",
  assigned_branch_id: "",
  assigned_department_id: "",
  assigned_section_id: "",
};

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const { t } = useTranslation();
  const createCompany = useCreateContractorCompany();
  const updateCompany = useUpdateContractorCompany();
  const isEditing = !!company;

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Fetch dropdown data
  const { data: branches = [] } = useBranches();
  const { data: departments = [] } = useDepartments(formData.assigned_branch_id || null);
  const { data: sections = [] } = useSections(formData.assigned_department_id || null);
  const { data: representatives = [] } = useClientRepresentatives();

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
        safety_officers_count: (company as any).safety_officers_count || 0,
        contractor_site_rep_name: (company as any).contractor_site_rep_name || "",
        contractor_site_rep_phone: (company as any).contractor_site_rep_phone || "",
        contractor_site_rep_email: (company as any).contractor_site_rep_email || "",
        contractor_safety_officer_name: (company as any).contractor_safety_officer_name || "",
        contractor_safety_officer_phone: (company as any).contractor_safety_officer_phone || "",
        contractor_safety_officer_email: (company as any).contractor_safety_officer_email || "",
        client_site_rep_id: (company as any).client_site_rep_id || "",
        assigned_branch_id: (company as any).assigned_branch_id || "",
        assigned_department_id: (company as any).assigned_department_id || "",
        assigned_section_id: (company as any).assigned_section_id || "",
      });
    } else if (!open) {
      setFormData(initialFormData);
    }
  }, [company, open]);

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
    };

    if (isEditing) {
      await updateCompany.mutateAsync({ id: company.id, data: submitData });
    } else {
      await createCompany.mutateAsync(submitData);
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
                <div className="space-y-2">
                  <Label>{t("contractors.companies.safetyOfficersCount", "Safety Officers Count")}</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={formData.safety_officers_count} 
                    onChange={(e) => handleChange("safety_officers_count", parseInt(e.target.value) || 0)} 
                  />
                </div>
              </div>
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

              {/* Contractor Safety Officer */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">{t("contractors.companies.contractorSafetyOfficer", "Contractor's Safety Officer")}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.name", "Name")}</Label>
                    <Input 
                      value={formData.contractor_safety_officer_name} 
                      onChange={(e) => handleChange("contractor_safety_officer_name", e.target.value)}
                      placeholder={t("contractors.companies.officerName", "Safety officer name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.phone", "Phone")}</Label>
                    <Input 
                      value={formData.contractor_safety_officer_phone} 
                      onChange={(e) => handleChange("contractor_safety_officer_phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t("common.email", "Email")}</Label>
                    <Input 
                      type="email"
                      value={formData.contractor_safety_officer_email} 
                      onChange={(e) => handleChange("contractor_safety_officer_email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

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
