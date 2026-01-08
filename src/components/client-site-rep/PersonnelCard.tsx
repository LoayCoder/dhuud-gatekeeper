import { HardHat, UserCheck, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import type { ClientSiteRepPersonnel } from "@/hooks/contractor-management/use-client-site-rep-data";

interface PersonnelCardProps {
  personnel: ClientSiteRepPersonnel;
}

export function PersonnelCard({ personnel }: PersonnelCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("clientSiteRep.personnelOverview", "Personnel Overview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Officers */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HardHat className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {t("clientSiteRep.safetyOfficers", "Safety Officers")}
            </span>
            <Badge variant="secondary">{personnel.safetyOfficers.length}</Badge>
          </div>
          {personnel.safetyOfficers.length === 0 ? (
            <p className="text-sm text-muted-foreground ps-6">
              {t("clientSiteRep.noSafetyOfficers", "No safety officers found")}
            </p>
          ) : (
            <div className="grid gap-2 ps-6">
              {personnel.safetyOfficers.slice(0, 3).map((officer) => (
                <div key={officer.id} className="flex items-center justify-between text-sm">
                  <span>{officer.full_name}</span>
                  <span className="text-muted-foreground">{officer.company_name}</span>
                </div>
              ))}
              {personnel.safetyOfficers.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{personnel.safetyOfficers.length - 3} {t("common.more", "more")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contractor Representatives */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {t("clientSiteRep.contractorReps", "Contractor Representatives")}
            </span>
            <Badge variant="secondary">{personnel.contractorReps.length}</Badge>
          </div>
          {personnel.contractorReps.length === 0 ? (
            <p className="text-sm text-muted-foreground ps-6">
              {t("clientSiteRep.noContractorReps", "No contractor representatives found")}
            </p>
          ) : (
            <div className="grid gap-3 ps-6">
              {personnel.contractorReps.slice(0, 3).map((rep) => (
                <div key={rep.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{rep.name}</span>
                    <span className="text-muted-foreground text-xs">{rep.company_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {rep.phone && (
                      <a 
                        href={`tel:${rep.phone}`}
                        className="text-primary hover:underline flex items-center gap-1 text-xs"
                        dir="ltr"
                      >
                        <Phone className="h-3 w-3" />
                        {rep.phone}
                      </a>
                    )}
                    {rep.email && (
                      <a 
                        href={`mailto:${rep.email}`}
                        className="text-primary hover:underline flex items-center gap-1 text-xs"
                      >
                        <Mail className="h-3 w-3" />
                        {rep.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {personnel.contractorReps.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{personnel.contractorReps.length - 3} {t("common.more", "more")}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
