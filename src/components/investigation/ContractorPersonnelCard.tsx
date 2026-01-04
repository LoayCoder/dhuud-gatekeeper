import { useTranslation } from "react-i18next";
import { Building2, User, ShieldCheck, HardHat, Phone, Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useContractorPersonnel } from "@/hooks/use-contractor-personnel";

interface ContractorPersonnelCardProps {
  companyId: string;
  companyName?: string;
}

interface PersonnelRowProps {
  icon: React.ReactNode;
  title: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

function PersonnelRow({ icon, title, name, phone, email, isPrimary }: PersonnelRowProps) {
  const { t } = useTranslation();
  
  if (!name) {
    return (
      <div className="py-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ps-7">
          {t('common.notAssigned', 'Not assigned')}
        </p>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
        {isPrimary && (
          <Badge variant="secondary" className="text-xs">
            {t('common.primary', 'Primary')}
          </Badge>
        )}
      </div>
      <div className="mt-2 ps-7 space-y-1">
        <p className="text-sm font-medium text-foreground">{name}</p>
        {(phone || email) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <a href={`tel:${phone}`} className="hover:text-primary" dir="ltr">
                  {phone}
                </a>
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${email}`} className="hover:text-primary">
                  {email}
                </a>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractorPersonnelCard({ companyId, companyName }: ContractorPersonnelCardProps) {
  const { t } = useTranslation();
  const { data: personnel, isLoading, error } = useContractorPersonnel(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !personnel) {
    return null;
  }

  const displayName = personnel.companyName || companyName;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          {t('investigation.overview.contractorInformation', 'Contractor Information')}
        </CardTitle>
        {displayName && (
          <p className="text-sm font-medium text-muted-foreground">{displayName}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          <PersonnelRow
            icon={<User className="h-4 w-4 text-blue-500" />}
            title={t('investigation.overview.contractorRepresentative', 'Contractor Representative')}
            name={personnel.contractorRepresentative?.name ?? null}
            phone={personnel.contractorRepresentative?.phone}
            email={personnel.contractorRepresentative?.email}
            isPrimary
          />
          
          <PersonnelRow
            icon={<ShieldCheck className="h-4 w-4 text-green-500" />}
            title={t('investigation.overview.safetyOfficer', 'Safety Officer')}
            name={personnel.safetyOfficer?.name ?? null}
            phone={personnel.safetyOfficer?.phone}
            email={personnel.safetyOfficer?.email}
            isPrimary
          />
          
          <PersonnelRow
            icon={<HardHat className="h-4 w-4 text-orange-500" />}
            title={t('investigation.overview.siteRepresentative', 'Site Representative')}
            name={personnel.siteRepresentative?.name ?? null}
            phone={personnel.siteRepresentative?.phone}
            email={personnel.siteRepresentative?.email}
          />
          
          {personnel.clientSiteRepresentative && (
            <>
              <Separator />
              <PersonnelRow
                icon={<Building2 className="h-4 w-4 text-purple-500" />}
                title={t('investigation.overview.clientSiteRepresentative', 'Client Site Representative')}
                name={personnel.clientSiteRepresentative.name}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
