import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Building2, Mail, Phone, MapPin } from "lucide-react";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";

interface CompanyDetailDialogProps {
  company: ContractorCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (company: ContractorCompany) => void;
}

export function CompanyDetailDialog({ company, open, onOpenChange, onEdit }: CompanyDetailDialogProps) {
  const { t } = useTranslation();

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company.company_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={company.status === "active" ? "default" : "destructive"}>
              {t(`contractors.status.${company.status}`, company.status)}
            </Badge>
          </div>
          {company.company_name_ar && (
            <p className="text-muted-foreground" dir="rtl">{company.company_name_ar}</p>
          )}
          <div className="grid gap-3">
            {company.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {company.email}
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {company.phone}
              </div>
            )}
            {(company.address || company.city) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {[company.address, company.city].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => onEdit(company)}>
              <Pencil className="h-4 w-4 me-2" />
              {t("common.edit", "Edit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
