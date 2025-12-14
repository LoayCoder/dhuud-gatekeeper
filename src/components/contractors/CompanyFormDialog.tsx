import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ContractorCompany, useCreateContractorCompany, useUpdateContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: ContractorCompany | null;
}

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const { t } = useTranslation();
  const createCompany = useCreateContractorCompany();
  const updateCompany = useUpdateContractorCompany();
  const isEditing = !!company;

  const [formData, setFormData] = useState({
    company_name: "", company_name_ar: "", email: "", phone: "", address: "", city: "",
    commercial_registration_number: "", vat_number: "",
  });

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || "",
        company_name_ar: company.company_name_ar || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        commercial_registration_number: company.commercial_registration_number || "",
        vat_number: company.vat_number || "",
      });
    } else {
      setFormData({ company_name: "", company_name_ar: "", email: "", phone: "", address: "", city: "", commercial_registration_number: "", vat_number: "" });
    }
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await updateCompany.mutateAsync({ id: company.id, data: formData });
    } else {
      await createCompany.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.companies.editCompany", "Edit Company") : t("contractors.companies.addCompany", "Add Company")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.companies.name", "Company Name")} *</Label>
              <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.companies.nameAr", "Name (Arabic)")}</Label>
              <Input value={formData.company_name_ar} onChange={(e) => setFormData({ ...formData, company_name_ar: e.target.value })} dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.companies.email", "Email")}</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.companies.phone", "Phone")}</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("contractors.companies.address", "Address")}</Label>
            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("contractors.companies.city", "City")}</Label>
            <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
              {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
