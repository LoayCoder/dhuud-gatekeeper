import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Building2, Mail, Phone, MapPin, FolderOpen, Info } from "lucide-react";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";

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
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company.company_name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t("contractors.companies.info", "Info")}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t("contractors.companies.documents", "Documents")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-4">
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
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <ContractorDocumentUpload companyId={company.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
