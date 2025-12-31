import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Building2, Mail, Phone, MapPin, FolderOpen, Info, Users, ShieldCheck, Calendar, Briefcase, User, Building, Star } from "lucide-react";
import { ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { useContractorCompanyDetails } from "@/hooks/contractor-management/use-contractor-company-details";
import { useContractorSafetyOfficers } from "@/hooks/contractor-management/use-contractor-safety-officers";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { SafetyRatioAlert } from "./SafetyRatioAlert";
import { format } from "date-fns";

interface CompanyDetailDialogProps {
  company: ContractorCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (company: ContractorCompany) => void;
}

export function CompanyDetailDialog({ company, open, onOpenChange, onEdit }: CompanyDetailDialogProps) {
  const { t } = useTranslation();
  const { data: details } = useContractorCompanyDetails(company?.id ?? null);
  const { data: safetyOfficers = [] } = useContractorSafetyOfficers(company?.id ?? null);

  if (!company) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const getLocalizedName = (item: { name: string } | null | undefined) => {
    if (!item) return "-";
    return item.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company.company_name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">
              <Info className="h-4 w-4 me-1" />
              <span className="hidden sm:inline">{t("contractors.companies.overview", "Overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="scope" className="text-xs">
              <Briefcase className="h-4 w-4 me-1" />
              <span className="hidden sm:inline">{t("contractors.companies.scope", "Scope")}</span>
            </TabsTrigger>
            <TabsTrigger value="personnel" className="text-xs">
              <Users className="h-4 w-4 me-1" />
              <span className="hidden sm:inline">{t("contractors.companies.personnel", "Personnel")}</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="text-xs">
              <ShieldCheck className="h-4 w-4 me-1" />
              <span className="hidden sm:inline">{t("contractors.companies.safety", "Safety")}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">
              <FolderOpen className="h-4 w-4 me-1" />
              <span className="hidden sm:inline">{t("contractors.companies.documents", "Documents")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
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

            {/* Assignment Info */}
            {details && (details.branch || details.department || details.section) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {t("contractors.companies.assignment", "Assignment")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  {details.branch && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("contractors.companies.branch", "Branch")}:</span>
                      <span>{getLocalizedName(details.branch)}</span>
                    </div>
                  )}
                  {details.department && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("contractors.companies.department", "Department")}:</span>
                      <span>{getLocalizedName(details.department)}</span>
                    </div>
                  )}
                  {details.section && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("contractors.companies.section", "Section")}:</span>
                      <span>{getLocalizedName(details.section)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => onEdit(company)}>
                <Pencil className="h-4 w-4 me-2" />
                {t("common.edit", "Edit")}
              </Button>
            </div>
          </TabsContent>

          {/* Scope Tab */}
          <TabsContent value="scope" className="mt-4 space-y-4">
            {/* Contract Duration */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("contractors.companies.contractDuration", "Contract Duration")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("contractors.companies.startDate", "Start Date")}:</span>
                  <p className="font-medium">{formatDate(details?.contract_start_date ?? null)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("contractors.companies.endDate", "End Date")}:</span>
                  <p className="font-medium">{formatDate(details?.contract_end_date ?? null)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Scope of Work */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {t("contractors.companies.scopeOfWork", "Scope of Work")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {details?.scope_of_work || t("contractors.companies.noScopeProvided", "No scope of work provided")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personnel Tab */}
          <TabsContent value="personnel" className="mt-4 space-y-4">
            {/* Contractor Site Representative */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("contractors.companies.contractorSiteRep", "Contractor's Site Representative")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {details?.contractor_site_rep_name ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {details.contractor_site_rep_name}
                    </div>
                    {details.contractor_site_rep_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {details.contractor_site_rep_phone}
                      </div>
                    )}
                    {details.contractor_site_rep_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {details.contractor_site_rep_email}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("contractors.companies.notAssigned", "Not assigned")}</p>
                )}
              </CardContent>
            </Card>

            {/* Contractor Safety Officers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {t("contractors.companies.contractorSafetyOfficers", "Contractor's Safety Officers")}
                  <Badge variant="secondary" className="ms-auto">{safetyOfficers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {safetyOfficers.length > 0 ? (
                  safetyOfficers.map((officer) => (
                    <div key={officer.id} className="p-3 bg-muted/50 rounded-md space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{officer.name}</span>
                        {officer.is_primary && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            {t("contractors.companies.primary", "Primary")}
                          </Badge>
                        )}
                      </div>
                      {officer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ps-6">
                          <Phone className="h-3 w-3" />
                          {officer.phone}
                        </div>
                      )}
                      {officer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ps-6">
                          <Mail className="h-3 w-3" />
                          {officer.email}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">{t("contractors.companies.noSafetyOfficers", "No safety officers added")}</p>
                )}
              </CardContent>
            </Card>

            {/* Client Site Representative */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("contractors.companies.clientSiteRep", "Company's Site Representative")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {details?.client_site_rep ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {details.client_site_rep.full_name}
                    </div>
                    {details.client_site_rep.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {details.client_site_rep.email}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("contractors.companies.notAssigned", "Not assigned")}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="mt-4 space-y-4">
            <SafetyRatioAlert 
              workerCount={details?.total_workers ?? 0} 
              safetyOfficerCount={safetyOfficers.length} 
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {t("contractors.companies.safetyInfo", "Safety Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("contractors.companies.totalWorkers", "Total Workers")}:</span>
                  <p className="font-medium text-lg">{details?.total_workers ?? 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("contractors.companies.safetyOfficersCount", "Safety Officers")}:</span>
                  <p className="font-medium text-lg">{safetyOfficers.length}</p>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              {t("contractors.companies.safetyRatioNote", "Required ratio: 1 Safety Officer per 22 Workers (1:22)")}
            </p>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4">
            <ContractorDocumentUpload companyId={company.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
