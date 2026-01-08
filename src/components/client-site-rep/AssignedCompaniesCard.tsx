import { Building2, Phone, Mail, Calendar, Users, ChevronDown, HardHat, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useState } from "react";
import type { ClientSiteRepCompany, ClientSiteRepPersonnel } from "@/hooks/contractor-management/use-client-site-rep-data";

interface AssignedCompaniesCardProps {
  companies: ClientSiteRepCompany[];
  personnel?: ClientSiteRepPersonnel;
  onViewAll?: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  blacklisted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function AssignedCompaniesCard({ companies, personnel, onViewAll }: AssignedCompaniesCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const toggleExpand = (companyId: string) => {
    setExpandedCompanyId(prev => prev === companyId ? null : companyId);
  };

  // Filter personnel by company
  const getCompanyPersonnel = (companyId: string) => {
    if (!personnel) return { safetyOfficers: [], contractorReps: [] };
    
    // Filter safety officers by company (they have company_name which we can match)
    const companySafetyOfficers = personnel.safetyOfficers.filter(so => {
      const company = companies.find(c => c.id === companyId);
      return company && so.company_name === company.company_name;
    });

    // Filter contractor reps by company
    const companyReps = personnel.contractorReps.filter(rep => {
      const company = companies.find(c => c.id === companyId);
      return company && rep.company_name === company.company_name;
    });

    return { safetyOfficers: companySafetyOfficers, contractorReps: companyReps };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          {t("clientSiteRep.myCompanies", "My Companies")} ({companies.length})
        </CardTitle>
        {companies.length > 3 && onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {t("common.viewAll", "View All")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {companies.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t("clientSiteRep.noCompaniesAssigned", "No companies assigned to you")}
          </p>
        ) : (
          companies.slice(0, 5).map((company) => {
            const companyPersonnel = getCompanyPersonnel(company.id);
            const isExpanded = expandedCompanyId === company.id;

            return (
              <Collapsible
                key={company.id}
                open={isExpanded}
                onOpenChange={() => toggleExpand(company.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div
                      className="p-3 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {isRTL && company.company_name_ar ? company.company_name_ar : company.company_name}
                          </h4>
                          <Badge className={statusColors[company.status] || "bg-muted"}>
                            {t(`contractors.status.${company.status}`, company.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {company.total_workers}
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''} rtl:rotate-180 rtl:${isExpanded ? 'rotate-0' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30 space-y-4">
                      {/* Contact Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-3">
                        {company.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <a 
                              href={`tel:${company.phone}`}
                              className="text-primary hover:underline"
                              dir="ltr"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {company.phone}
                            </a>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <a 
                              href={`mailto:${company.email}`}
                              className="text-primary hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {company.email}
                            </a>
                          </div>
                        )}
                        {company.contract_end_date && (
                          <div className="flex items-center gap-2 col-span-full text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {t("clientSiteRep.contractEnds", "Contract ends")}: {format(new Date(company.contract_end_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Contractor Representatives */}
                      {companyPersonnel.contractorReps.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {t("clientSiteRep.contractorReps", "Contractor Representatives")}
                            </span>
                          </div>
                          <div className="space-y-2 ps-6">
                            {companyPersonnel.contractorReps.map((rep) => (
                              <div key={rep.id} className="text-sm p-2 rounded border bg-background space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{rep.name}</p>
                                  {rep.is_primary && (
                                    <Badge variant="outline" className="text-xs">
                                      {t("common.primary", "Primary")}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={rep.is_onsite ? "default" : "secondary"} 
                                    className={`text-xs ${rep.is_onsite ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                  >
                                    {rep.is_onsite 
                                      ? t("clientSiteRep.onsite", "Onsite") 
                                      : t("clientSiteRep.offsite", "Offsite")}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                  {rep.phone && (
                                    <a 
                                      href={`tel:${rep.phone}`}
                                      className="text-primary hover:underline flex items-center gap-1"
                                      dir="ltr"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="h-3 w-3" />
                                      {rep.phone}
                                    </a>
                                  )}
                                  {rep.email && (
                                    <a 
                                      href={`mailto:${rep.email}`}
                                      className="text-primary hover:underline flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Mail className="h-3 w-3" />
                                      {rep.email}
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Safety Officers */}
                      {companyPersonnel.safetyOfficers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <HardHat className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {t("clientSiteRep.safetyOfficers", "Safety Officers")}
                            </span>
                          </div>
                          <div className="space-y-2 ps-6">
                            {companyPersonnel.safetyOfficers.map((officer) => (
                              <div key={officer.id} className="text-sm p-2 rounded border bg-background space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{officer.full_name}</p>
                                  {officer.is_primary && (
                                    <Badge variant="outline" className="text-xs">
                                      {t("common.primary", "Primary")}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={officer.is_onsite ? "default" : "secondary"} 
                                    className={`text-xs ${officer.is_onsite ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                  >
                                    {officer.is_onsite 
                                      ? t("clientSiteRep.onsite", "Onsite") 
                                      : t("clientSiteRep.offsite", "Offsite")}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                  {officer.phone && (
                                    <a 
                                      href={`tel:${officer.phone}`}
                                      className="text-primary hover:underline flex items-center gap-1"
                                      dir="ltr"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="h-3 w-3" />
                                      {officer.phone}
                                    </a>
                                  )}
                                  {officer.email && (
                                    <a 
                                      href={`mailto:${officer.email}`}
                                      className="text-primary hover:underline flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Mail className="h-3 w-3" />
                                      {officer.email}
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {companyPersonnel.contractorReps.length === 0 && companyPersonnel.safetyOfficers.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          {t("clientSiteRep.noPersonnelAssigned", "No personnel assigned")}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
