import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, User, ShieldCheck, Phone, Mail, Loader2, ChevronDown, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useContractorPersonnel } from "@/hooks/use-contractor-personnel";
import { cn } from "@/lib/utils";

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
  showActionButtons?: boolean;
}

function PersonnelRow({ icon, title, name, phone, email, isPrimary, showActionButtons }: PersonnelRowProps) {
  const { t } = useTranslation();
  
  // Format phone for WhatsApp (remove spaces, dashes, etc.)
  const formatPhoneForWhatsApp = (phoneNumber: string) => {
    // Remove all non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    // If starts with 0, assume Saudi Arabia and replace with +966
    if (formatted.startsWith('0')) {
      formatted = '+966' + formatted.substring(1);
    }
    // If no + prefix, add it
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    return formatted;
  };
  
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
      <div className="mt-2 ps-7 space-y-2">
        <p className="text-sm font-medium text-foreground">{name}</p>
        {(phone || email) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{phone}</span>
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{email}</span>
              </span>
            )}
          </div>
        )}
        {showActionButtons && phone && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              asChild
            >
              <a href={`tel:${phone}`}>
                <Phone className="h-3.5 w-3.5" />
                {t('common.call', 'Call')}
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              asChild
            >
              <a 
                href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t('common.whatsapp', 'WhatsApp')}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractorPersonnelCard({ companyId, companyName }: ContractorPersonnelCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="text-start">
                <h3 className="font-semibold text-foreground">
                  {t('investigation.overview.contractorInformation', 'Contractor Information')}
                </h3>
                {displayName && (
                  <p className="text-sm text-muted-foreground">{displayName}</p>
                )}
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="divide-y divide-border">
              <PersonnelRow
                icon={<User className="h-4 w-4 text-blue-500" />}
                title={t('investigation.overview.contractorRepresentative', 'Contractor Representative')}
                name={personnel.contractorRepresentative?.name ?? null}
                phone={personnel.contractorRepresentative?.phone}
                email={personnel.contractorRepresentative?.email}
                isPrimary
                showActionButtons
              />
              
              <PersonnelRow
                icon={<ShieldCheck className="h-4 w-4 text-green-500" />}
                title={t('investigation.overview.safetyOfficer', 'Safety Officer')}
                name={personnel.safetyOfficer?.name ?? null}
                phone={personnel.safetyOfficer?.phone}
                email={personnel.safetyOfficer?.email}
                isPrimary
                showActionButtons
              />
              
              {personnel.clientSiteRepresentative && (
                <PersonnelRow
                  icon={<Building2 className="h-4 w-4 text-purple-500" />}
                  title={t('investigation.overview.clientSiteRepresentative', 'Client Site Representative')}
                  name={personnel.clientSiteRepresentative.name}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
