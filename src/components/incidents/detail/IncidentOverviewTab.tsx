import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Incident } from "@/types/incidents";
import {
    MapPin,
    Calendar,
    User,
    Tag,
    AlertTriangle,
    Building2,
    Activity,
    ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { getHsseEventTypeForSubtype, snakeToCamel, getSubtypeTranslation } from '@/lib/hsse-translation-utils';
import { IncidentRiskPanel } from "./IncidentRiskPanel";
import { IncidentInjuryCard } from "./IncidentInjuryCard";
import { IncidentDamageCard } from "./IncidentDamageCard";
import { IncidentInfoSidebar } from "./IncidentInfoSidebar";

interface IncidentOverviewTabProps {
    incident: Incident;
}

export function IncidentOverviewTab({ incident }: IncidentOverviewTabProps) {
    const { t } = useTranslation();

    // Helper for safe translations
    const safeTranslate = (key: string, defaultVal: string) => {
        return t(key, { defaultValue: defaultVal });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">

                {/* Key Info Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Who & When */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {t('incidents.reporterInfo', 'Reporter & Time')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium">{incident.reporter?.full_name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{t('incidents.reporter', 'Reporter')}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        {incident.occurred_at ? format(new Date(incident.occurred_at), 'PP p') : '-'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Where */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {t('incidents.locationDetails', 'Location')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {incident.branch && <Badge variant="outline">{incident.branch.name}</Badge>}
                                    {incident.site && <Badge variant="outline">{incident.site.name}</Badge>}
                                </div>
                                {incident.location && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {incident.location}
                                    </p>
                                )}
                                {incident.latitude && incident.longitude && (
                                    <p className="text-xs font-mono text-muted-foreground">
                                        {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-primary" />
                            {t('incidents.description', 'Description')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {incident.description}
                        </p>
                    </CardContent>
                </Card>

                {/* Immediate Actions */}
                {incident.immediate_actions && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                {t('incidents.immediateActions', 'Immediate Actions')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                                <p className="whitespace-pre-wrap text-sm">
                                    {incident.immediate_actions}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Impact Analysis (Injury/Damage) */}
                <div className="grid gap-6 sm:grid-cols-2">
                    <IncidentInjuryCard
                        hasInjury={incident.has_injury || false}
                        injuryDetails={incident.injury_details as any}
                        injuryClassification={(incident as any).injury_classification}
                    />
                    <IncidentDamageCard
                        hasDamage={incident.has_damage || false}
                        damageDetails={incident.damage_details as any}
                    />
                </div>

            </div>

            {/* Right Sidebar - Status & Risk */}
            <div className="space-y-6">
                {/* Risk Panel */}
                <IncidentRiskPanel
                    actualSeverity={incident.severity_v2}
                    potentialSeverity={(incident as any).potential_severity_v2}
                    eventType={incident.event_type}
                />

                {/* Classification */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('incidents.classification', 'Classification')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                {t('incidents.eventType', 'Event Type')}
                            </p>
                            <p className="text-sm font-medium capitalize">
                                {incident.event_type === 'incident' ? t('incidents.types.incident') : t('incidents.types.observation')}
                            </p>
                        </div>

                        {incident.event_type === 'incident' && (
                            <>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        {t('incidents.category', 'Category')}
                                    </p>
                                    <p className="text-sm font-medium">
                                        {(() => {
                                            const cat = (incident as any).incident_type ||
                                                (incident.subtype ? getHsseEventTypeForSubtype(incident.subtype) : null);
                                            return cat ? safeTranslate(`incidents.hsseEventTypes.${snakeToCamel(cat)}`, cat) : '-';
                                        })()}
                                    </p>
                                </div>
                                {incident.subtype && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            {t('incidents.subCategory', 'Sub Category')}
                                        </p>
                                        <p className="text-sm font-medium">
                                            {getSubtypeTranslation(t, incident.event_type, incident.subtype, (incident as any).incident_type)}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {incident.special_event && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {t('incidents.specialEvent', 'Special Event')}
                                </p>
                                <Badge variant="secondary">{incident.special_event.name}</Badge>
                            </div>
                        )}

                        {incident.related_contractor_company && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {t('incidents.contractor', 'Contractor')}
                                </p>
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                    <Building2 className="h-4 w-4" />
                                    <span className="text-sm font-medium">{incident.related_contractor_company.company_name}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Additional Metadata Sidebar */}
                <IncidentInfoSidebar incident={incident} />

            </div>
        </div>
    );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
    );
}
