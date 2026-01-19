import React, { useMemo } from "react";
import { Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

interface AttackFlowAnimationProps {
  from: [number, number];
  to: [number, number];
  isPermanent: boolean;
}

// Create curved path points between two locations
function createCurvedPath(from: [number, number], to: [number, number], numPoints = 50): LatLngExpression[] {
  const points: LatLngExpression[] = [];
  
  // Calculate midpoint with offset for curve
  const midLat = (from[0] + to[0]) / 2;
  const midLng = (from[1] + to[1]) / 2;
  
  // Calculate distance for curve height
  const distance = Math.sqrt(
    Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2)
  );
  
  // Curve offset (perpendicular to the line)
  const curveHeight = Math.min(distance * 0.3, 20);
  
  // Calculate perpendicular offset direction
  const dx = to[1] - from[1];
  const dy = to[0] - from[0];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  
  const offsetLat = midLat + (dx / len) * curveHeight;
  const offsetLng = midLng - (dy / len) * curveHeight;
  
  // Create quadratic bezier curve points
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const u = 1 - t;
    
    const lat = u * u * from[0] + 2 * u * t * offsetLat + t * t * to[0];
    const lng = u * u * from[1] + 2 * u * t * offsetLng + t * t * to[1];
    
    points.push([lat, lng]);
  }
  
  return points;
}

export function AttackFlowAnimation({ from, to, isPermanent }: AttackFlowAnimationProps) {
  const curvedPath = useMemo(() => createCurvedPath(from, to), [from, to]);
  
  const color = isPermanent ? '#ef4444' : '#f97316'; // red for permanent, orange for temporary
  const opacity = isPermanent ? 0.7 : 0.5;
  
  return (
    <>
      {/* Base line (subtle) */}
      <Polyline
        positions={curvedPath}
        pathOptions={{
          color: color,
          weight: 1.5,
          opacity: opacity * 0.3,
        }}
      />
      
      {/* Animated dashed line */}
      <Polyline
        positions={curvedPath}
        pathOptions={{
          color: color,
          weight: 2,
          opacity: opacity,
          dashArray: '8, 12',
          dashOffset: '0',
          className: 'attack-flow-line'
        }}
      />
    </>
  );
}
