import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { MapPin, Tag, FileText, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { getHsseEventTypeForSubtype, snakeToCamel, getSubtypeTranslation } from '@/lib/hsse-translation-utils';
import { IncidentInjuryCard } from "./IncidentInjuryCard";
import { IncidentDamageCard } from "./IncidentDamageCard";
import { IncidentAttachmentsSection } from '@/features/incidents';

interface IncidentSummarySectionProps {
    incident: unknown;
}

export function IncidentSummarySection({ incident }: IncidentSummarySectionProps) {
    const { t } = useTranslation();

    const safeTranslate = (key: string, defaultVal: string) => {
        return t(key, { defaultValue: defaultVal });
    };

    // Parse media attachments
    const mediaAttachments = (incident as unknown).media_attachments as Array<{ url: string; type: string; name: string }> | null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {t('incidents.summary', 'Incident Summary')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Description */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('incidents.description', 'Description')}</h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border">
                            {incident.description || t('common.noDescription', 'No description provided.')}
                        </p>
                    </div>

                    {/* Meta Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Event Details */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                    <Tag className="h-4 w-4" />
                                    {t('incidents.classification', 'Classification')}
                                </h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('incidents.eventType', 'Event Type')}:</span>
                                        <span className="capitalize font-medium">
                                            {incident.event_type === 'incident' ? t('incidents.types.incident') : t('incidents.types.observation')}
                                        </span>
                                    </div>
                                    {incident.event_type === 'incident' && (
                                        <>
                                            <div className="flex flex-col sm:flex-row sm:justify-between text-sm">
                                                <span className="text-muted-foreground">{t('incidents.category', 'Category')}:</span>
                                                <span className="font-medium">
                                                    {(() => {
                                                        const cat = (incident as unknown).incident_type ||
                                                            (incident.subtype ? getHsseEventTypeForSubtype(incident.subtype) : null);
                                                        return cat ? safeTranslate(`incidents.hsseEventTypes.${snakeToCamel(cat)}`, cat) : '-';
                                                    })()}
                                                </span>
                                            </div>
                                            {incident.subtype && (
                                                <div className="flex flex-col sm:flex-row sm:justify-between text-sm">
                                                    <span className="text-muted-foreground">{t('incidents.subCategory', 'Sub Category')}:</span>
                                                    <span className="font-medium text-wrap text-right sm:max-w-[200px]">
                                                        {getSubtypeTranslation(t, incident.event_type, incident.subtype, (incident as unknown).incident_type)}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {incident.related_contractor_company && (
                                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm">
                                            <span className="text-muted-foreground">{t('incidents.contractor', 'Contractor')}:</span>
                                            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-500">
                                                <Building2 className="h-3 w-3" />
                                                {incident.related_contractor_company.company_name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                    <MapPin className="h-4 w-4" />
                                    {t('incidents.locationDetails', 'Location Coordinates')}
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {incident.branch && <Badge variant="outline">{incident.branch.name}</Badge>}
                                        {incident.site && <Badge variant="outline">{incident.site.name}</Badge>}
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">{t('incidents.location', 'Specific Area')}: </span>
                                        <span className="font-medium">{incident.location || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Immediate Actions */}
                    {incident.immediate_actions && (
                        <div className="pt-2">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('incidents.immediateActions', 'Immediate Actions Taken')}</h4>
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                                <p className="whitespace-pre-wrap text-sm">
                                    {incident.immediate_actions}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
                <IncidentInjuryCard
                    hasInjury={incident.has_injury || false}
                    injuryDetails={incident.injury_details as unknown}
                    injuryClassification={(incident as unknown).injury_classification}
                />
                <IncidentDamageCard
                    hasDamage={incident.has_damage || false}
                    damageDetails={incident.damage_details as unknown}
                />
            </div>

            {/* Evidence Quick Preview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        {t('incidents.evidence', 'Evidence & Attachments')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <IncidentAttachmentsSection
                        incidentId={incident.id}
                        mediaAttachments={mediaAttachments}
                        incidentMetadata={{
                            referenceId: incident.reference_id,
                            occurredAt: (incident as unknown).occurred_at,
                            location: (incident as unknown).location || undefined,
                            branchName: (incident as unknown).branch?.name,
                            siteName: (incident as unknown).site?.name,
                            contractorName: (incident as unknown).related_contractor_company?.company_name,
                            latitude: (incident as unknown).latitude,
                            longitude: (incident as unknown).longitude,
                        }}
                        fallbackTimestamp={incident.created_at}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

