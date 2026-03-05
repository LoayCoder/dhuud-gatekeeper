/**
 * Escalation Alert Banner
 * 
 * Displays a prominent alert when an observation has triggered escalation
 * due to repeated contractor violations
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, Clock, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EscalationAlertBannerProps {
  incident: {
    id: string;
    requires_escalation?: boolean;
    escalation_reason?: string;
    escalation_level?: number;
    escalation_triggered_at?: string;
    related_contractor_company_id?: string;
    contractor_company?: {
      id: string;
      company_name?: string;
    } | null;
  };
  className?: string;
}

export function EscalationAlertBanner({ incident, className }: EscalationAlertBannerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language === 'ar' ? arSA : enUS;
  
  // Only show if escalation is required
  if (!incident.requires_escalation) {
    return null;
  }
  
  // Determine severity level based on escalation_level
  const escalationLevel = incident.escalation_level || 3;
  const severityConfig = getSeverityFromLevel(escalationLevel);
  
  const contractorName = incident.contractor_company?.company_name || 
    t('escalation.unknownContractor', 'Unknown Contractor');
  
  const triggeredAt = incident.escalation_triggered_at 
    ? format(new Date(incident.escalation_triggered_at), 'PPp', { locale })
    : null;
  
  return (
    <Alert
      variant="destructive"
      className={cn(
        'border-2',
        severityConfig.borderClass,
        severityConfig.bgClass,
        className
      )}
    >
      <AlertTriangle className={cn('h-5 w-5', severityConfig.iconClass)} />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        <span>{t('escalation.title', 'Escalation Alert')}</span>
        <Badge 
          variant="outline" 
          className={cn(severityConfig.badgeClass, 'uppercase text-xs')}
        >
          {severityConfig.label}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          {incident.escalation_reason || t('escalation.defaultReason', 
            'This observation has been flagged for escalation due to repeated contractor violations.'
          )}
        </p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Contractor Info */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 opacity-70" />
            <span className="font-medium">{contractorName}</span>
          </div>
          
          {/* Triggered Time */}
          {triggeredAt && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4 opacity-70" />
              <span>{triggeredAt}</span>
            </div>
          )}
          
          {/* Violation Count */}
          <Badge variant="secondary" className="text-xs">
            {t('escalation.violationCount', '{{count}} violations', { count: escalationLevel })}
          </Badge>
        </div>
        
        {/* Action Button */}
        {incident.related_contractor_company_id && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5"
            >
              <Link to={`/contractors/${incident.related_contractor_company_id}`}>
                {t('escalation.viewContractorProfile', 'View Contractor Profile')}
                <ExternalLink className={cn('h-3.5 w-3.5', isRTL && 'rtl:rotate-180')} />
              </Link>
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function getSeverityFromLevel(level: number): {
  label: string;
  borderClass: string;
  bgClass: string;
  iconClass: string;
  badgeClass: string;
} {
  if (level >= 5) {
    return {
      label: 'Critical',
      borderClass: 'border-destructive',
      bgClass: 'bg-destructive/10',
      iconClass: 'text-destructive',
      badgeClass: 'border-destructive text-destructive',
    };
  }
  if (level >= 4) {
    return {
      label: 'High',
      borderClass: 'border-red-500',
      bgClass: 'bg-red-50 dark:bg-red-950/20',
      iconClass: 'text-red-600',
      badgeClass: 'border-red-500 text-red-600',
    };
  }
  return {
    label: 'Medium',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
    iconClass: 'text-amber-600',
    badgeClass: 'border-amber-500 text-amber-600',
  };
}
