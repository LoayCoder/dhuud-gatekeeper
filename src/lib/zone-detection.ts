/**
 * Zone Detection Utilities
 * Functions for detecting user's current zone based on GPS coordinates
 */

export interface ZoneWithPolygon {
  id: string;
  zone_name: string;
  zone_code: string | null;
  polygon_coords: [number, number][] | null;
  geofence_radius_meters: number | null;
  is_active: boolean | null;
}

export interface CurrentZoneResult {
  zone: ZoneWithPolygon;
  isInside: boolean;
  distanceToCenter: number;
}

export type BoundaryProximityLevel = 'safe' | 'warning' | 'danger' | 'outside';

export interface BoundaryProximityResult {
  level: BoundaryProximityLevel;
  distanceToEdge: number;
  warningThreshold: number;
  dangerThreshold: number;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInsidePolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Calculate the centroid (center point) of a polygon
 */
export function getPolygonCentroid(polygon: [number, number][]): [number, number] {
  if (!polygon || polygon.length === 0) return [0, 0];
  
  let sumLat = 0;
  let sumLng = 0;
  for (const [lat, lng] of polygon) {
    sumLat += lat;
    sumLng += lng;
  }
  return [sumLat / polygon.length, sumLng / polygon.length];
}

/**
 * Calculate the perpendicular distance from a point to a line segment
 */
function distanceToLineSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return calculateDistance(px, py, xx, yy);
}

/**
 * Calculate the minimum distance from a point to any edge of the polygon
 * @returns Distance in meters to the nearest edge
 */
export function calculateDistanceToBoundary(
  lat: number,
  lng: number,
  polygon: [number, number][]
): number {
  if (!polygon || polygon.length < 3) return Infinity;

  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[j];
    
    const distance = distanceToLineSegment(lat, lng, lat1, lng1, lat2, lng2);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Check boundary proximity level for warning system
 * @param warningThresholdMeters Distance for warning (default 50m)
 * @param dangerThresholdMeters Distance for danger (default 20m)
 */
export function checkBoundaryProximity(
  lat: number,
  lng: number,
  polygon: [number, number][],
  warningThresholdMeters: number = 50,
  dangerThresholdMeters: number = 20
): BoundaryProximityResult {
  if (!polygon || polygon.length < 3) {
    return {
      level: 'safe',
      distanceToEdge: Infinity,
      warningThreshold: warningThresholdMeters,
      dangerThreshold: dangerThresholdMeters,
    };
  }

  const isInside = isPointInsidePolygon(lat, lng, polygon);
  const distanceToEdge = calculateDistanceToBoundary(lat, lng, polygon);

  if (!isInside) {
    return {
      level: 'outside',
      distanceToEdge: -distanceToEdge, // Negative to indicate outside
      warningThreshold: warningThresholdMeters,
      dangerThreshold: dangerThresholdMeters,
    };
  }

  let level: BoundaryProximityLevel;
  if (distanceToEdge <= dangerThresholdMeters) {
    level = 'danger';
  } else if (distanceToEdge <= warningThresholdMeters) {
    level = 'warning';
  } else {
    level = 'safe';
  }

  return {
    level,
    distanceToEdge,
    warningThreshold: warningThresholdMeters,
    dangerThreshold: dangerThresholdMeters,
  };
}

/**
 * Find which zone the user is currently inside
 * Checks polygon boundaries first, then falls back to geofence radius
 */
export function findCurrentZone(
  userLat: number,
  userLng: number,
  zones: ZoneWithPolygon[]
): CurrentZoneResult | null {
  // Filter to active zones only
  const activeZones = zones.filter(z => z.is_active !== false);

  // First, check if user is inside any zone polygon
  for (const zone of activeZones) {
    if (zone.polygon_coords && zone.polygon_coords.length >= 3) {
      if (isPointInsidePolygon(userLat, userLng, zone.polygon_coords)) {
        const centroid = getPolygonCentroid(zone.polygon_coords);
        return {
          zone,
          isInside: true,
          distanceToCenter: calculateDistance(userLat, userLng, centroid[0], centroid[1]),
        };
      }
    }
  }

  // If not inside any polygon, find nearest zone within geofence radius
  let nearestZone: ZoneWithPolygon | null = null;
  let nearestDistance = Infinity;

  for (const zone of activeZones) {
    if (zone.polygon_coords && zone.polygon_coords.length >= 3) {
      const centroid = getPolygonCentroid(zone.polygon_coords);
      const distance = calculateDistance(userLat, userLng, centroid[0], centroid[1]);
      const radius = zone.geofence_radius_meters || 50;

      if (distance <= radius && distance < nearestDistance) {
        nearestDistance = distance;
        nearestZone = zone;
      }
    }
  }

  if (nearestZone) {
    return {
      zone: nearestZone,
      isInside: false,
      distanceToCenter: nearestDistance,
    };
  }

  return null;
}

/**
 * Find the nearest zone regardless of geofence radius
 */
export function findNearestZone(
  userLat: number,
  userLng: number,
  zones: ZoneWithPolygon[],
  maxDistanceMeters?: number
): CurrentZoneResult | null {
  const activeZones = zones.filter(z => z.is_active !== false && z.polygon_coords?.length);

  let nearestZone: ZoneWithPolygon | null = null;
  let nearestDistance = Infinity;

  for (const zone of activeZones) {
    if (zone.polygon_coords && zone.polygon_coords.length >= 3) {
      const centroid = getPolygonCentroid(zone.polygon_coords);
      const distance = calculateDistance(userLat, userLng, centroid[0], centroid[1]);

      if (distance < nearestDistance) {
        if (!maxDistanceMeters || distance <= maxDistanceMeters) {
          nearestDistance = distance;
          nearestZone = zone;
        }
      }
    }
  }

  if (nearestZone) {
    return {
      zone: nearestZone,
      isInside: false,
      distanceToCenter: nearestDistance,
    };
  }

  return null;
}
