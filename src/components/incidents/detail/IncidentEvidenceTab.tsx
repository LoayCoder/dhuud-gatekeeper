import { IncidentAttachmentsSection } from '@/components/incidents/IncidentAttachmentsSection';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediaAttachments = (incident as any).media_attachments as Array<{ url: string; type: string; name: string }> | null;

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
                        occurredAt: (incident as any).occurred_at,
                        location: (incident as any).location || undefined,
                        branchName: (incident as any).branch?.name,
                        siteName: (incident as any).site?.name,
                        contractorName: (incident as any).related_contractor_company?.company_name,
                        latitude: (incident as any).latitude,
                        longitude: (incident as any).longitude,
                    }}
                    fallbackTimestamp={incident.created_at}
                />
            </CardContent>
        </Card>
    );
}
