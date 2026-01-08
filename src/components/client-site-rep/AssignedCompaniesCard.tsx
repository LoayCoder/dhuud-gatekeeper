import { Building2, Phone, Mail, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { ClientSiteRepCompany } from "@/hooks/contractor-management/use-client-site-rep-data";

interface AssignedCompaniesCardProps {
  companies: ClientSiteRepCompany[];
  onViewAll?: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  blacklisted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function AssignedCompaniesCard({ companies, onViewAll }: AssignedCompaniesCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === "rtl";

  const handleCompanyClick = (companyId: string) => {
    navigate(`/contractors/companies/${companyId}`);
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate("/contractors/companies");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          {t("clientSiteRep.myCompanies", "My Companies")} ({companies.length})
        </CardTitle>
        {companies.length > 3 && (
          <Button variant="ghost" size="sm" onClick={handleViewAll}>
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
          companies.slice(0, 3).map((company) => (
            <div
              key={company.id}
              className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleCompanyClick(company.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCompanyClick(company.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">
                    {isRTL && company.company_name_ar ? company.company_name_ar : company.company_name}
                  </h4>
                  <Badge className={statusColors[company.status] || "bg-muted"}>
                    {t(`contractors.status.${company.status}`, company.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {company.total_workers}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                {company.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr">{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{company.email}</span>
                  </div>
                )}
                {company.contract_end_date && (
                  <div className="flex items-center gap-1 col-span-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {t("clientSiteRep.contractEnds", "Contract ends")}: {format(new Date(company.contract_end_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
