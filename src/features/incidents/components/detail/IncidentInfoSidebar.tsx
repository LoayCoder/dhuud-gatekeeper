import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Calendar, 
  Clock,
  Tag,
  Briefcase,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

interface IncidentInfoSidebarProps {
  incident: {
    reporter?: { full_name: string; } | null;
    department_info?: { name: string } | null;
    branch?: { name: string } | null;
    site?: { name: string } | null;
    occurred_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    event_type: string;
    incident_type?: string;
    subtype?: string;
    related_contractor_company?: { company_name: string } | null;
  };
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export function IncidentInfoSidebar({ incident }: IncidentInfoSidebarProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t('incidents.metadata', 'Information')}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {/* Reporter */}
        <InfoRow 
          icon={User}
          label={t('incidents.reportedBy', 'Reported By')}
          value={incident.reporter?.full_name || t('common.unknown', 'Unknown')}
        />

        {/* Department */}
        {incident.department_info && (
          <InfoRow 
            icon={Briefcase}
            label={t('incidents.responsibleDepartment', 'Department')}
            value={incident.department_info.name}
          />
        )}

        {/* Branch */}
        {incident.branch && (
          <InfoRow 
            icon={Building}
            label={t('incidents.branch', 'Branch')}
            value={incident.branch.name}
          />
        )}

        {/* Site */}
        {incident.site && (
          <InfoRow 
            icon={Building}
            label={t('incidents.site', 'Site')}
            value={incident.site.name}
          />
        )}

        {/* Contractor */}
        {incident.related_contractor_company && (
          <InfoRow 
            icon={Building2}
            label={t('incidents.contractor', 'Contractor')}
            value={
              <Badge variant="secondary" className="text-xs">
                {incident.related_contractor_company.company_name}
              </Badge>
            }
          />
        )}

        {/* Classification */}
        {incident.incident_type && (
          <InfoRow 
            icon={Tag}
            label={t('incidents.classification', 'Classification')}
            value={t(`incidents.hsseEventTypes.${incident.incident_type}`, incident.incident_type)}
          />
        )}

        {/* Occurred At */}
        <InfoRow 
          icon={Calendar}
          label={t('incidents.occurredAt', 'Occurred At')}
          value={incident.occurred_at ? format(new Date(incident.occurred_at), 'PPp') : '—'}
        />

        {/* Created At */}
        <InfoRow 
          icon={Clock}
          label={t('incidents.createdAt', 'Created')}
          value={incident.created_at ? format(new Date(incident.created_at), 'PPp') : '—'}
        />

        {/* Updated At */}
        {incident.updated_at && incident.updated_at !== incident.created_at && (
          <InfoRow 
            icon={Clock}
            label={t('incidents.updatedAt', 'Last Updated')}
            value={format(new Date(incident.updated_at), 'PPp')}
          />
        )}
      </CardContent>
    </Card>
  );
}
