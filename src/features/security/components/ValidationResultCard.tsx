import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, LogIn, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationResult {
  valid: boolean;
  contractor_id?: string;
  contractor_name?: string;
  company_name?: string;
  nationality?: string;
  preferred_language?: string;
  photo_url?: string;
  errors: string[];
  warnings: string[];
}

interface ValidationResultCardProps {
  result: ValidationResult;
  onLogEntry: () => void;
  isLogging?: boolean;
}

const errorTranslations: Record<string, string> = {
  contractor_not_found: 'security.validationErrors.contractorNotFound',
  contractor_banned: 'security.validationErrors.contractorBanned',
  permit_expired: 'security.validationErrors.permitExpired',
  induction_expired: 'security.validationErrors.inductionExpired',
  medical_expired: 'security.validationErrors.medicalExpired',
  site_not_authorized: 'security.validationErrors.siteNotAuthorized',
  zone_not_authorized: 'security.validationErrors.zoneNotAuthorized',
};

const warningTranslations: Record<string, string> = {
  permit_expiring_soon: 'security.validationWarnings.permitExpiringSoon',
  induction_expiring_soon: 'security.validationWarnings.inductionExpiringSoon',
  medical_expiring_soon: 'security.validationWarnings.medicalExpiringSoon',
};

export function ValidationResultCard({ result, onLogEntry, isLogging }: ValidationResultCardProps) {
  const { t, i18n } = useTranslation();

  const isGranted = result.valid && result.errors.length === 0;
  const hasWarnings = result.warnings.length > 0;

  // Determine display language based on contractor's preference
  const displayLang = result.preferred_language || i18n.language;

  return (
    <Card
      className={cn(
        'border-2 transition-colors',
        isGranted
          ? hasWarnings
            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
            : 'border-green-500 bg-green-50 dark:bg-green-950/20'
          : 'border-destructive bg-destructive/10'
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div
            className={cn(
              'shrink-0 p-3 rounded-full',
              isGranted
                ? hasWarnings
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                : 'bg-destructive'
            )}
          >
            {isGranted ? (
              hasWarnings ? (
                <AlertTriangle className="h-8 w-8 text-white" />
              ) : (
                <CheckCircle className="h-8 w-8 text-white" />
              )
            ) : (
              <XCircle className="h-8 w-8 text-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {/* Status Header */}
            <div>
              <h3
                className={cn(
                  'text-2xl font-bold',
                  isGranted
                    ? hasWarnings
                      ? 'text-yellow-700 dark:text-yellow-400'
                      : 'text-green-700 dark:text-green-400'
                    : 'text-destructive'
                )}
              >
                {isGranted
                  ? hasWarnings
                    ? t('security.contractors.accessWarning')
                    : t('security.contractors.accessGranted')
                  : t('security.contractors.accessDenied')}
              </h3>
            </div>

            {/* Contractor Info */}
            {result.contractor_name && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={result.photo_url} />
                  <AvatarFallback>
                    {result.contractor_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{result.contractor_name}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {result.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {result.company_name}
                      </span>
                    )}
                    {result.nationality && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        {result.nationality}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  {t('security.contractors.denialReasons')}:
                </p>
                <ul className="space-y-1">
                  {result.errors.map((error, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>{t(errorTranslations[error] || error)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  {t('security.contractors.warnings')}:
                </p>
                <ul className="space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{t(warningTranslations[warning] || warning)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Button */}
            {isGranted && (
              <Button
                size="lg"
                className="w-full"
                onClick={onLogEntry}
                disabled={isLogging}
              >
                <LogIn className="h-5 w-5 me-2" />
                {t('security.contractors.logEntry')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
