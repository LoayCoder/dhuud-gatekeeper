import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, Building2, Map, Navigation, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LocationAddress {
  country?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  formatted_address?: string | null;
}

interface LocationDisplayProps {
  latitude: number;
  longitude: number;
  address?: LocationAddress | null;
  showIcon?: boolean;
  className?: string;
  compact?: boolean;
}

export function LocationDisplay({
  latitude,
  longitude,
  address,
  showIcon = true,
  className,
  compact = false,
}: LocationDisplayProps) {
  const { t } = useTranslation();

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const hasAddressDetails = address && (
    address.city || address.district || address.street || address.country
  );

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {hasAddressDetails && (
          <span className="text-sm text-muted-foreground">
            {[address?.city, address?.district, address?.country].filter(Boolean).join(', ')}
          </span>
        )}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          {t('incidents.viewOnGoogleMaps', 'View on Google Maps')}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {hasAddressDetails && (
        <div className="space-y-1.5">
          {address?.city && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{address.city}</span>
            </div>
          )}
          {address?.district && (
            <div className="flex items-center gap-2 text-sm">
              <Map className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{address.district}</span>
            </div>
          )}
          {address?.street && (
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{address.street}</span>
            </div>
          )}
          {address?.country && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{address.country}</span>
            </div>
          )}
        </div>
      )}

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-colors"
      >
        {showIcon && <MapPin className="h-4 w-4" />}
        <span>{t('incidents.viewOnGoogleMaps', 'View on Google Maps')}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
