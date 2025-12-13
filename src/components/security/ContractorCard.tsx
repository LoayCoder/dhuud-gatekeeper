import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Phone, Globe, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Contractor } from '@/hooks/use-contractors';
import { format, isPast, addDays, isWithinInterval } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface ContractorCardProps {
  contractor: Contractor;
  showQR?: boolean;
  compact?: boolean;
}

export function ContractorCard({ contractor, showQR = false, compact = false }: ContractorCardProps) {
  const { t } = useTranslation();

  const today = new Date();
  const warningWindow = addDays(today, 7);

  const getExpiryStatus = (date: string | null) => {
    if (!date) return 'unknown';
    const expiryDate = new Date(date);
    if (isPast(expiryDate)) return 'expired';
    if (isWithinInterval(expiryDate, { start: today, end: warningWindow })) return 'warning';
    return 'valid';
  };

  const permitStatus = getExpiryStatus(contractor.permit_expiry_date);
  const inductionStatus = getExpiryStatus(contractor.safety_induction_expiry);
  const medicalStatus = getExpiryStatus(contractor.medical_exam_expiry);

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'valid') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (status === 'expired') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contractor.photo_path || undefined} />
          <AvatarFallback>{contractor.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{contractor.full_name}</p>
          <p className="text-sm text-muted-foreground truncate">{contractor.company_name}</p>
        </div>
        {contractor.is_banned && (
          <Badge variant="destructive">{t('security.contractors.banned')}</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={contractor.photo_path || undefined} />
            <AvatarFallback className="text-lg">{contractor.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">{contractor.full_name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{contractor.contractor_code}</p>
              </div>
              {contractor.is_banned && (
                <Badge variant="destructive" className="shrink-0">
                  {t('security.contractors.banned')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {contractor.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contractor.company_name}
                </span>
              )}
              {contractor.mobile_number && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {contractor.mobile_number}
                </span>
              )}
              {contractor.nationality && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {contractor.nationality}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={permitStatus === 'valid' ? 'secondary' : permitStatus === 'warning' ? 'outline' : 'destructive'} className="gap-1">
                <StatusIcon status={permitStatus} />
                {t('security.contractors.permit')}
                {contractor.permit_expiry_date && (
                  <span className="ms-1">{format(new Date(contractor.permit_expiry_date), 'dd/MM/yy')}</span>
                )}
              </Badge>
              <Badge variant={inductionStatus === 'valid' ? 'secondary' : inductionStatus === 'warning' ? 'outline' : 'destructive'} className="gap-1">
                <StatusIcon status={inductionStatus} />
                {t('security.contractors.induction')}
              </Badge>
              <Badge variant={medicalStatus === 'valid' ? 'secondary' : medicalStatus === 'warning' ? 'outline' : 'destructive'} className="gap-1">
                <StatusIcon status={medicalStatus} />
                {t('security.contractors.medical')}
              </Badge>
            </div>
          </div>

          {showQR && contractor.qr_code_data && (
            <div className="shrink-0">
              <QRCodeSVG value={contractor.qr_code_data} size={80} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
