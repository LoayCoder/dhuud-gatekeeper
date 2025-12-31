import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_TILE } from '@/lib/map-tiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, RefreshCw, AlertTriangle, Building2, Star, ExternalLink, Map, Navigation, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NearestSiteResult, Coordinate } from '@/lib/geo-utils';
import { useSiteDepartments } from '@/hooks/use-site-departments';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationAddress {
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  formatted_address: string | null;
}

interface GPSLocationConfirmCardProps {
  userCoordinates: { lat: number; lng: number };
  gpsAccuracy?: number;
  nearestSiteResult: NearestSiteResult | null;
  noSiteNearby: boolean;
  onConfirm: () => void;
  onChangeLocation: () => void;
  isConfirmed: boolean;
  locationAddress?: LocationAddress | null;
  isFetchingAddress?: boolean;
}

export function GPSLocationConfirmCard({
  userCoordinates,
  gpsAccuracy,
  nearestSiteResult,
  noSiteNearby,
  onConfirm,
  onChangeLocation,
  isConfirmed,
  locationAddress,
  isFetchingAddress,
}: GPSLocationConfirmCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const siteMarkerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  // Fetch site departments if we have a detected site
  const { departments: siteDepartments, isLoading: depsLoading } = useSiteDepartments(
    nearestSiteResult?.site.id
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    const map = L.map(mapContainerRef.current, {
      center: [userCoordinates.lat, userCoordinates.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    // Use premium CartoDB tiles for cleaner appearance
    L.tileLayer(DEFAULT_TILE.url, {
      attribution: DEFAULT_TILE.attribution,
      ...DEFAULT_TILE.options,
    }).addTo(map);

    // Add zoom control in correct position based on RTL
    L.control.zoom({ position: direction === 'rtl' ? 'topleft' : 'topright' }).addTo(map);

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update user marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
    }

    // Add accuracy circle if available
    if (gpsAccuracy) {
      accuracyCircleRef.current = L.circle([userCoordinates.lat, userCoordinates.lng], {
        radius: gpsAccuracy,
        color: 'hsl(210, 100%, 50%)',
        fillColor: 'hsl(210, 100%, 50%)',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current);
    }

    // Add pulsing user location marker
    userMarkerRef.current = L.circleMarker([userCoordinates.lat, userCoordinates.lng], {
      radius: 10,
      color: 'hsl(210, 100%, 50%)',
      fillColor: 'hsl(210, 100%, 60%)',
      fillOpacity: 1,
      weight: 3,
      className: 'animate-pulse',
    }).addTo(mapRef.current);

    // Fit bounds to include user and site
    const bounds = L.latLngBounds([[userCoordinates.lat, userCoordinates.lng]]);
    
    if (nearestSiteResult?.site.latitude && nearestSiteResult?.site.longitude) {
      bounds.extend([nearestSiteResult.site.latitude, nearestSiteResult.site.longitude]);
    }
    
    if (nearestSiteResult?.site.boundary_polygon) {
      nearestSiteResult.site.boundary_polygon.forEach(p => {
        bounds.extend([p.lat, p.lng]);
      });
    }

    mapRef.current.fitBounds(bounds.pad(0.2));
  }, [userCoordinates, gpsAccuracy, nearestSiteResult]);

  // Update site marker and polygon
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing site marker and polygon
    if (siteMarkerRef.current) {
      siteMarkerRef.current.remove();
      siteMarkerRef.current = null;
    }
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    if (!nearestSiteResult?.site) return;

    const site = nearestSiteResult.site;

    // Add boundary polygon if available
    if (site.boundary_polygon && site.boundary_polygon.length >= 3) {
      const polygonCoords = site.boundary_polygon.map(p => [p.lat, p.lng] as L.LatLngTuple);
      const isInside = nearestSiteResult.isInsideBoundary;
      
      polygonRef.current = L.polygon(polygonCoords, {
        color: isInside ? 'hsl(142, 76%, 36%)' : 'hsl(38, 92%, 50%)',
        fillColor: isInside ? 'hsl(142, 76%, 36%)' : 'hsl(38, 92%, 50%)',
        fillOpacity: 0.15,
        weight: 3,
        dashArray: isInside ? undefined : '5, 5',
      }).addTo(mapRef.current);
    }

    // Add site center marker
    if (site.latitude && site.longitude) {
      const siteIcon = L.divIcon({
        className: 'custom-site-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      
      siteMarkerRef.current = L.marker([site.latitude, site.longitude], { icon: siteIcon })
        .addTo(mapRef.current);
    }
  }, [nearestSiteResult]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const primaryDepartment = siteDepartments.find(d => d.is_primary);
  const otherDepartments = siteDepartments.filter(d => !d.is_primary);

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isConfirmed && "ring-2 ring-green-500/50 bg-green-50/30 dark:bg-green-950/20"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5 text-primary" />
          {t('incidents.gpsConfirmation.title')}
          {isConfirmed && (
            <Badge variant="default" className="ms-auto gap-1 bg-green-600">
              <Check className="h-3 w-3" />
              {t('incidents.gpsConfirmation.confirmed')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Map */}
        <div 
          ref={mapContainerRef}
          className="h-40 w-full rounded-lg overflow-hidden border"
          style={{ minHeight: '160px' }}
        />

        {/* Site Information */}
        {nearestSiteResult ? (
          <div className="space-y-3">
            {/* Site & Branch */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-base">{nearestSiteResult.site.name}</p>
                  {nearestSiteResult.site.branch_name && (
                    <p className="text-sm text-muted-foreground">{nearestSiteResult.site.branch_name}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {nearestSiteResult.distanceMeters}m
              </Badge>
            </div>

            {/* Boundary Warning */}
            {nearestSiteResult.site.boundary_polygon && !nearestSiteResult.isInsideBoundary && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t('incidents.gpsConfirmation.outsideBoundary')}</span>
              </div>
            )}

            {/* Departments */}
            {!depsLoading && siteDepartments.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('incidents.gpsConfirmation.departments')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {primaryDepartment && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      {primaryDepartment.department?.name}
                    </Badge>
                  )}
                  {otherDepartments.map(sd => (
                    <Badge key={sd.id} variant="outline">
                      {sd.department?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!depsLoading && siteDepartments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('incidents.gpsConfirmation.noDepartments')}
              </p>
            )}

            {/* GPS Accuracy */}
            {gpsAccuracy && (
              <p className="text-xs text-muted-foreground">
                {t('incidents.gpsConfirmation.accuracy')}: ±{Math.round(gpsAccuracy)}m
              </p>
            )}

            {/* Address Details with Google Maps Link */}
            <div className="space-y-2 border-t pt-3 mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('incidents.addressDetails.formattedAddress', 'Address')}
              </p>
              {isFetchingAddress ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  {t('incidents.addressDetails.fetchingAddress', 'Fetching address...')}
                </p>
              ) : locationAddress ? (
                <div className="text-sm space-y-1">
                  {locationAddress.city && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{locationAddress.city}</span>
                    </div>
                  )}
                  {locationAddress.district && (
                    <div className="flex items-center gap-2">
                      <Map className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{locationAddress.district}</span>
                    </div>
                  )}
                  {locationAddress.street && (
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{locationAddress.street}</span>
                    </div>
                  )}
                  {locationAddress.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">{locationAddress.country}</span>
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Google Maps Link */}
              <a
                href={`https://www.google.com/maps?q=${userCoordinates.lat},${userCoordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors mt-1"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{t('incidents.viewOnGoogleMaps', 'View on Google Maps')}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : noSiteNearby ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t('incidents.noSiteNearby')}</span>
            </div>

            {/* Address Details for no site nearby */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('incidents.addressDetails.formattedAddress', 'Address')}
              </p>
              {isFetchingAddress ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  {t('incidents.addressDetails.fetchingAddress', 'Fetching address...')}
                </p>
              ) : locationAddress ? (
                <div className="text-sm space-y-1">
                  {locationAddress.city && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{locationAddress.city}</span>
                    </div>
                  )}
                  {locationAddress.district && (
                    <div className="flex items-center gap-2">
                      <Map className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{locationAddress.district}</span>
                    </div>
                  )}
                  {locationAddress.street && (
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{locationAddress.street}</span>
                    </div>
                  )}
                  {locationAddress.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">{locationAddress.country}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('incidents.addressDetails.noAddressAvailable', 'Address not available')}
                </p>
              )}
              
              {/* Google Maps Link */}
              <a
                href={`https://www.google.com/maps?q=${userCoordinates.lat},${userCoordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline transition-colors mt-1"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{t('incidents.viewOnGoogleMaps', 'View on Google Maps')}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmed || noSiteNearby}
            className="flex-1 gap-2"
            variant={isConfirmed ? "outline" : "default"}
          >
            {isConfirmed ? (
              <>
                <Check className="h-4 w-4" />
                {t('incidents.gpsConfirmation.confirmed')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {t('incidents.gpsConfirmation.confirmLocation')}
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={onChangeLocation}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('incidents.gpsConfirmation.changeLocation')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
