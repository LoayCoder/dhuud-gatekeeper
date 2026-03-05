import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, Calendar, MapPin, FileText, Shield, Zap, Edit } from "lucide-react";
import { format } from "date-fns";
import type { IncidentWithDetails } from '@/features/incidents';
import { IncidentAttachmentsSection } from '@/features/incidents';
import { getSeverityBadgeVariant } from "@/lib/hsse-severity-levels";
import { getSubtypeTranslation, snakeToCamel, getHsseEventTypeForSubtype } from "@/lib/hsse-translation-utils";
import { LocationDisplay } from "@/components/shared/LocationDisplay";

interface IncidentInfoCardProps {
  incident: IncidentWithDetails;
  isLocked: boolean;
  onEditLocation?: () => void;
}

export function IncidentInfoCard({ incident, isLocked, onEditLocation }: IncidentInfoCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const InfoItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <div className="text-sm">{value || 'â€”'}</div>
    </div>
  );

  return (
    <Card className={isLocked ? 'border-muted bg-muted/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('investigation.overview.incidentInfo', 'Incident Information')}
          </CardTitle>
          {isLocked && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              {t('investigation.overview.readOnly', 'Read-only')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent dir={direction}>
        <div className="space-y-6">
          {/* Title and Reference */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {incident.reference_id}
              </Badge>
              <Badge variant={getSeverityBadgeVariant(incident.severity_v2)}>
                {incident.severity_v2 ? t(`severity.${incident.severity_v2}.label`) : t('common.unknown')}
              </Badge>
              <Badge variant="secondary">
                {t(`incidents.status.${incident.status}`)}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold">{incident.title}</h3>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('incidents.description', 'Description')}</p>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
              {incident.description}
            </p>
          </div>

          {/* Category Badges Row */}
          {(() => {
            // Derive category from incident_type OR from subtype using HSSE mapping
            const derivedCategory = (incident as any).incident_type || 
              (incident.subtype ? getHsseEventTypeForSubtype(incident.subtype) : null);
            
            return (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {String(t(`incidents.eventCategories.${incident.event_type}`, incident.event_type))}
                </Badge>
                {incident.event_type === 'incident' && derivedCategory && (
                  <Badge variant="outline" className="bg-secondary/50">
                    {String(t(`incidents.hsseEventTypes.${snakeToCamel(derivedCategory)}`, 
                              { defaultValue: derivedCategory }))}
                  </Badge>
                )}
                {incident.subtype && (
                  <Badge variant="secondary">
                    {getSubtypeTranslation(
                      t,
                      incident.event_type,
                      incident.subtype,
                      (incident as any).incident_type
                    )}
                  </Badge>
                )}
              </div>
            );
          })()}

          {/* Key Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem 
              icon={AlertTriangle}
              label={t('incidents.eventType', 'Event Type')} 
              value={String(t(`incidents.eventCategories.${incident.event_type}`, incident.event_type))}
            />
            {incident.event_type === 'incident' && (() => {
              // Derive category from incident_type OR from subtype using HSSE mapping
              const derivedCategory = (incident as any).incident_type || 
                (incident.subtype ? getHsseEventTypeForSubtype(incident.subtype) : null);
              
              return (
                <InfoItem 
                  label={t('incidents.incidentCategory', 'Incident Category')} 
                  value={derivedCategory 
                    ? String(t(`incidents.hsseEventTypes.${snakeToCamel(derivedCategory)}`, 
                               { defaultValue: derivedCategory }))
                    : undefined
                  }
                />
              );
            })()}
            {incident.subtype && (
              <InfoItem 
                label={t('incidents.incidentSubCategory', 'Incident Sub Category')} 
                value={getSubtypeTranslation(
                  t,
                  incident.event_type,
                  incident.subtype,
                  (incident as any).incident_type
                )}
              />
            )}
            <InfoItem 
              icon={Calendar}
              label={t('incidents.occurredAt', 'Date & Time')} 
              value={incident.occurred_at ? format(new Date(incident.occurred_at), 'PPp') : null}
            />
            <div className="flex items-start justify-between gap-2">
              <InfoItem 
                icon={MapPin}
                label={t('incidents.location', 'Location')} 
                value={
                  incident.site?.name || 
                  incident.branch?.name || 
                  incident.location ||
                  incident.location_city ||
                  (incident.latitude && incident.longitude 
                    ? t('incidents.gpsCoordinatesAvailable', 'GPS Coordinates Available')
                    : undefined)
                }
              />
              {onEditLocation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditLocation}
                  className="h-7 gap-1.5 text-xs shrink-0"
                >
                  <Edit className="h-3 w-3" />
                  {t('common.edit', 'Edit')}
                </Button>
              )}
            </div>
            {/* Address Details from GPS */}
            {(incident.location_city || incident.location_district) && (
              <InfoItem 
                icon={MapPin}
                label={t('incidents.addressDetails.formattedAddress', 'Address')} 
                value={
                  <div className="space-y-0.5 text-sm">
                    {incident.location_city && (
                      <span className="block">{incident.location_city}</span>
                    )}
                    {incident.location_district && (
                      <span className="block text-muted-foreground">{incident.location_district}</span>
                    )}
                    {incident.location_street && (
                      <span className="block text-muted-foreground">{incident.location_street}</span>
                    )}
                  </div>
                }
              />
            )}
          </div>

          {/* GPS Location with Google Maps Link - with fallback to site location */}
          {(() => {
            const effectiveLatitude = incident.latitude || incident.site?.latitude;
            const effectiveLongitude = incident.longitude || incident.site?.longitude;
            const isUsingFallbackLocation = !incident.latitude && incident.site?.latitude;
            
            if (!effectiveLatitude || !effectiveLongitude) return null;
            
            return (
              <div className="bg-muted/30 rounded-md p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">{t('incidents.addressDetails.coordinates', 'GPS Location')}</span>
                  {isUsingFallbackLocation && (
                    <Badge variant="secondary" className="text-xs ms-2">
                      {t('incidents.approximateLocation', 'Approximate Location (Site)')}
                    </Badge>
                  )}
                </div>
                <LocationDisplay
                  latitude={effectiveLatitude}
                  longitude={effectiveLongitude}
                  address={{
                    city: incident.location_city || undefined,
                    district: incident.location_district || undefined,
                    street: incident.location_street || undefined,
                    country: incident.location_country || undefined,
                    formatted_address: incident.location_formatted || undefined,
                  }}
                  showIcon={false}
                />
              </div>
            );
          })()}

          {/* Injury & Damage */}
          {(incident.has_injury || incident.has_damage) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {incident.has_injury && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">{t('incidents.injuryReported', 'Injury Reported')}</span>
                  </div>
                  {incident.injury_details && (
                    <p className="text-sm text-muted-foreground">
                      {(incident.injury_details as Record<string, unknown>).description as string || 
                       `${t('incidents.injuryCount', 'Count')}: ${(incident.injury_details as Record<string, unknown>).count || 'N/A'}`}
                    </p>
                  )}
                </div>
              )}
              {incident.has_damage && (
                <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium text-sm">{t('incidents.damageReported', 'Damage Reported')}</span>
                  </div>
                  {incident.damage_details && (
                    <p className="text-sm text-muted-foreground">
                      {(incident.damage_details as Record<string, unknown>).description as string}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Immediate Actions */}
          {incident.immediate_actions && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {t('incidents.immediateActions', 'Immediate Actions Taken')}
              </p>
              <p className="text-sm bg-muted/50 p-3 rounded-md">
                {incident.immediate_actions}
              </p>
            </div>
          )}

          {/* Special Event */}
          {incident.special_event && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('incidents.linkedEvent', 'Linked Major Event')}</p>
              <p className="text-sm font-medium text-primary">{incident.special_event.name}</p>
            </div>
          )}

          {/* Attachments Section */}
          <IncidentAttachmentsSection 
            incidentId={incident.id}
            mediaAttachments={incident.media_attachments as Array<{ url: string; type: string; name: string }> | null}
            compact
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
        </div>
      </CardContent>
    </Card>
  );
}

