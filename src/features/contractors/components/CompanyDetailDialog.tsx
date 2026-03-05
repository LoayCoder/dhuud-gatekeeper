import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Building2, Mail, Phone, MapPin, FolderOpen, Info, Users, ShieldCheck, Calendar, Briefcase, User, Building, Star, Loader2, Link2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ContractorCompany } from "@/features/contractors/hooks/use-contractor-companies";
import { useContractorCompanyDetails } from "@/features/contractors/hooks/use-contractor-company-details";
import { useContractorSafetyOfficers } from "@/features/contractors/hooks/use-contractor-safety-officers";
import { useContractorSiteRep } from "@/features/contractors/hooks/use-contractor-site-rep";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { SafetyRatioAlert } from "./SafetyRatioAlert";
import { ContractorRepUserLink } from "./ContractorRepUserLink";
import { IDCardActionButton } from '@/features/admin';
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface CompanyDetailDialogProps {
  company: ContractorCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (company: ContractorCompany) => void;
}

export function CompanyDetailDialog({ company, open, onOpenChange, onEdit }: CompanyDetailDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: details } = useContractorCompanyDetails(company?.id ?? null);
  const { data: safetyOfficersFromTable = [] } = useContractorSafetyOfficers(company?.id ?? null);
  const { data: siteRepFromTable } = useContractorSiteRep(company?.id ?? null);
  const [sendingInvitation, setSendingInvitation] = useState(false);

  // Fetch contractor representatives for user linking
  const { data: representatives = [] } = useQuery({
    queryKey: ["contractor-representatives-for-linking", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("contractor_representatives")
        .select("id, full_name, email, user_id, is_primary")
        .eq("company_id", company.id)
        .is("deleted_at", null);
      if (error) throw error;
      return (data || []).map(rep => ({
        ...rep,
        representative_type: rep.is_primary ? 'site_rep' : 'other'
      }));
    },
    enabled: !!company?.id && open,
  });

  // Fallback: fetch safety officers from contractor_workers if contractor_safety_officers is empty
  const { data: workerOfficers = [] } = useQuery({
    queryKey: ["worker-safety-officers-display", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("contractor_workers")
        .select("id, full_name, mobile_number, nationality")
        .eq("company_id", company.id)
        .eq("worker_type", "safety_officer")
        .is("deleted_at", null);
      if (error) throw error;
      return (data || []).map(w => ({
        id: w.id,
        name: w.full_name || "",
        phone: w.mobile_number || null,
        email: null as string | null,
        is_primary: false,
      }));
    },
    enabled: !!company?.id && open,
  });

  // Use whichever source has data - prefer contractor_safety_officers table
  const safetyOfficers = safetyOfficersFromTable.length > 0 ? safetyOfficersFromTable : workerOfficers;
  
  // Site rep: from dedicated table only (no legacy fallback)
  const siteRep = siteRepFromTable || null;

  if (!company) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const getLocalizedName = (item: { name: string } | null | undefined) => {
    if (!item) return "-";
    return item.name;
  };

  // ID card person data helpers
  const getSiteRepPersonData = () => {
    if (!siteRep) return null;
    return {
      id: siteRep.id || 'site_rep',
      fullName: siteRep.full_name || '',
      company: company.company_name,
      companyAr: company.company_name_ar || undefined,
      role: t("contractors.companies.siteRepresentative", "Site Representative"),
      roleAr: 'ممثل الموقع',
      validUntil: details?.contract_end_date || undefined,
      qrToken: `CONTRACTOR_REP:${siteRep.id || company.id}`,
    };
  };

  const getOfficerPersonData = (officer: { id: string; name: string; phone?: string | null }) => ({
    id: officer.id,
    fullName: officer.name,
    company: company.company_name,
    companyAr: company.company_name_ar || undefined,
    role: t("contractors.companies.safetyOfficer", "Safety Officer"),
    roleAr: 'مسؤول السلامة',
    validUntil: details?.contract_end_date || undefined,
    qrToken: `CONTRACTOR_REP:${officer.id}`,
  });

  const handleSendPortalInvitation = async () => {
    if (!company || company.status !== 'active') return;
    
    // Find the primary representative (site rep)
    const primaryRep = representatives.find(r => r.is_primary);
    if (!primaryRep) {
      toast.error(t("contractors.invitation.noSiteRep", "No site representative found to invite"));
      return;
    }
    
    setSendingInvitation(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contractor-invitation', {
        body: {
          company_id: company.id,
          representative_id: primaryRep.id,
          tenant_id: company.tenant_id,
        },
      });
      
      if (error) throw error;
      
      toast.success(
        t("contractors.invitation.sent", "Portal invitation sent to {{email}}", { email: primaryRep.email })
      );
      
      queryClient.invalidateQueries({ queryKey: ["contractor-representatives-for-linking"] });
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error(t("contractors.invitation.failed", "Failed to send portal invitation"));
    } finally {
      setSendingInvitation(false);
    }
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
                  {siteRep && (
                    <Badge variant="default" className="ms-auto text-xs">
                      {t("common.active", "Active")}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {siteRep ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {siteRep.full_name}
                      </div>
                      {(siteRep.phone || siteRep.mobile_number) && getSiteRepPersonData() && (
                        <IDCardActionButton
                          cardType="contractor_rep"
                          entityId={siteRep.id || company.id}
                          personData={getSiteRepPersonData()!}
                          tenantId={company.tenant_id}
                          tenantData={{
                            id: company.tenant_id,
                            name: company.company_name,
                            nameAr: company.company_name_ar || undefined,
                          }}
                          recipientPhone={siteRep.mobile_number || siteRep.phone || undefined}
                        />
                      )}
                    </div>
                    {(siteRep.mobile_number || siteRep.phone) && (
                      <button
                        type="button"
                        onClick={() => window.location.href = `tel:${siteRep.mobile_number || siteRep.phone}`}
                        className="flex items-center gap-2 ps-6 text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {siteRep.mobile_number || siteRep.phone}
                      </button>
                    )}
                    {siteRep.email && (
                      <a
                        href={`mailto:${siteRep.email}`}
                        className="flex items-center gap-2 ps-6 hover:text-primary"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {siteRep.email}
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("contractors.companies.notAssigned", "Not assigned")}</p>
                )}
              </CardContent>
            </Card>

            {/* Send Portal Invitation Button - Only for active companies with site rep */}
            {company.status === 'active' && siteRep && siteRep.email && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendPortalInvitation}
                disabled={sendingInvitation}
              >
                {sendingInvitation ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <UserPlus className="h-4 w-4 me-2" />
                )}
                {t("contractors.invitation.sendButton", "Send Portal Invitation")}
              </Button>
            )}

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
                      <div className="flex items-center justify-between">
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
                          <IDCardActionButton
                            cardType="contractor_rep"
                            entityId={officer.id}
                            personData={getOfficerPersonData(officer)}
                            tenantId={company.tenant_id}
                            tenantData={{
                              id: company.tenant_id,
                              name: company.company_name,
                              nameAr: company.company_name_ar || undefined,
                            }}
                            recipientPhone={officer.phone}
                          />
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

            {/* User Account Linking */}
            {representatives.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {t("contractors.companies.userAccountLinking", "User Account Linking")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {representatives.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="text-sm font-medium">{rep.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {rep.representative_type === 'site_rep' 
                            ? t("contractors.companies.siteRepresentative", "Site Representative")
                            : t("contractors.companies.safetyOfficer", "Safety Officer")}
                        </p>
                      </div>
                      <ContractorRepUserLink
                        representativeId={rep.id}
                        representativeName={rep.full_name}
                        representativeEmail={rep.email}
                        currentUserId={rep.user_id}
                        companyId={company.id}
                        onLinked={() => {
                          queryClient.invalidateQueries({ queryKey: ["contractor-representatives-for-linking"] });
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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

