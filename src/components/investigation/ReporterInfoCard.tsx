import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Briefcase, Building2, MapPin, Phone, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface ReporterInfoCardProps {
  incident: IncidentWithDetails;
}

export function ReporterInfoCard({ incident }: ReporterInfoCardProps) {
  const { t } = useTranslation();

  // Fetch full reporter profile with organizational details
  const { data: reporter, isLoading } = useQuery({
    queryKey: ['reporter-profile', incident.reporter_id],
    queryFn: async () => {
      if (!incident.reporter_id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, employee_id, job_title, phone_number,
          assigned_branch_id, assigned_division_id, assigned_department_id, assigned_section_id,
          branch:branches!profiles_assigned_branch_id_fkey(name),
          division:divisions!profiles_assigned_division_id_fkey(name),
          department:departments!profiles_assigned_department_id_fkey(name),
          section:sections!profiles_assigned_section_id_fkey(name)
        `)
        .eq('id', incident.reporter_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!incident.reporter_id,
  });

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          {t('investigation.overview.reporterInfo', 'Reporter Information')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : reporter ? (
          <div className="grid gap-1 sm:grid-cols-2">
            <InfoRow 
              icon={User} 
              label={t('investigation.overview.name', 'Name')} 
              value={reporter.full_name} 
            />
            <InfoRow 
              icon={BadgeCheck} 
              label={t('investigation.overview.employeeId', 'Employee ID')} 
              value={reporter.employee_id} 
            />
            <InfoRow 
              icon={Briefcase} 
              label={t('investigation.overview.position', 'Position')} 
              value={reporter.job_title} 
            />
            <InfoRow 
              icon={Building2} 
              label={t('investigation.overview.department', 'Department')} 
              value={reporter.department?.name} 
            />
            <InfoRow 
              icon={MapPin} 
              label={t('investigation.overview.branch', 'Branch')} 
              value={reporter.branch?.name} 
            />
            <InfoRow 
              icon={MapPin} 
              label={t('investigation.overview.area', 'Area/Section')} 
              value={reporter.section?.name || reporter.division?.name} 
            />
            <InfoRow 
              icon={Phone} 
              label={t('investigation.overview.contact', 'Contact Number')} 
              value={reporter.phone_number} 
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('investigation.overview.noReporter', 'Reporter information not available')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
