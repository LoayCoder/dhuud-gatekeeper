import { IncidentAttachmentsSection } from '@/features/incidents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Incident } from '@/types/incident.types';

interface IncidentEvidenceTabProps {
    incident: any;
}

export function IncidentEvidenceTab({ incident }: IncidentEvidenceTabProps) {
    const { t } = useTranslation();

    // Parse media attachments
    const mediaAttachments = incident.media_attachments as Array<{ url: string; type: string; name: string }> | null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t('incidents.evidence', 'Evidence & Attachments')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <IncidentAttachmentsSection
                    incidentId={incident.id}
                    mediaAttachments={mediaAttachments}
                    incidentMetadata={{
                        referenceId: incident.reference_id,
                        occurredAt: incident.occurred_at,
                        location: incident.location || undefined,
                        branchName: incident.branch?.name,
                        siteName: incident.site?.name,
                        contractorName: incident.related_contractor_company?.company_name,
                        latitude: incident.latitude,
                        longitude: incident.longitude,
                    }}
                    fallbackTimestamp={incident.created_at}
                />
            </CardContent>
        </Card>
    );
}

