import { useState, useCallback, useMemo } from 'react';
import { useSecurityZones } from '@/hooks/use-security-zones';
import { findCurrentZone, findNearestZone, type CurrentZoneResult } from '@/lib/zone-detection';

interface UseCurrentZoneResult {
  currentZone: CurrentZoneResult | null;
  nearestZone: CurrentZoneResult | null;
  isLocating: boolean;
  error: string | null;
  location: { lat: number; lng: number } | null;
  detectZone: () => void;
}

/**
 * Hook to detect user's current security zone based on GPS location
 */
export function useCurrentZone(): UseCurrentZoneResult {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: zones = [] } = useSecurityZones({ isActive: true });

  const currentZone = useMemo(() => {
    if (!location || !zones.length) return null;
    return findCurrentZone(location.lat, location.lng, zones as any);
  }, [location, zones]);

  const nearestZone = useMemo(() => {
    if (!location || !zones.length) return null;
    // Find nearest zone within 500m if not inside any zone
    if (!currentZone) {
      return findNearestZone(location.lat, location.lng, zones as any, 500);
    }
    return null;
  }, [location, zones, currentZone]);

  const detectZone = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        setError(err.message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return {
    currentZone,
    nearestZone,
    isLocating,
    error,
    location,
    detectZone,
  };
}
