import type { Site } from '@/hooks/use-org-hierarchy';

/**
 * Calculate distance between two GPS coordinates using the Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface NearestSiteResult {
  site: Site;
  distanceMeters: number;
}

/**
 * Find the nearest site to a given GPS coordinate within a maximum distance
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param sites Array of sites to search
 * @param maxDistanceMeters Maximum distance to consider (default 500m)
 * @returns The nearest site and distance, or null if none within range
 */
export function findNearestSite(
  userLat: number,
  userLng: number,
  sites: Site[],
  maxDistanceMeters: number = 500
): NearestSiteResult | null {
  let nearestSite: Site | null = null;
  let minDistance = Infinity;

  for (const site of sites) {
    // Skip sites without GPS coordinates
    if (site.latitude == null || site.longitude == null) {
      continue;
    }

    const distance = calculateDistance(
      userLat,
      userLng,
      site.latitude,
      site.longitude
    );

    if (distance < minDistance && distance <= maxDistanceMeters) {
      minDistance = distance;
      nearestSite = site;
    }
  }

  if (nearestSite) {
    return {
      site: nearestSite,
      distanceMeters: Math.round(minDistance),
    };
  }

  return null;
}
