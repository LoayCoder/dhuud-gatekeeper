import type { Site, Coordinate } from '@/hooks/use-org-hierarchy';

export type { Coordinate };

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
  isInsideBoundary: boolean;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInsidePolygon(
  lat: number,
  lng: number,
  polygon: Coordinate[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
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
    // Check if point is inside the site's boundary polygon
    const isInsideBoundary = nearestSite.boundary_polygon
      ? isPointInsidePolygon(userLat, userLng, nearestSite.boundary_polygon)
      : false;
      
    return {
      site: nearestSite,
      distanceMeters: Math.round(minDistance),
      isInsideBoundary,
    };
  }

  return null;
}
