/**
 * Map tile configurations for Leaflet maps
 * Using CartoDB tiles for cleaner, more professional appearance
 */

export const MAP_TILES = {
  // Light theme - clean, minimal design
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
    },
  },
  
  // Dark theme - for dark mode interfaces
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
    },
  },
  
  // Positron - ultra-minimal, great for data visualization
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
    },
  },
  
  // Labels only - useful for overlays
  labelsOnly: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
    },
  },
} as const;

// Default tile configuration
export const DEFAULT_TILE = MAP_TILES.light;

// Get tile config based on theme
export function getTileConfig(isDark: boolean = false) {
  return isDark ? MAP_TILES.dark : MAP_TILES.light;
}

// Saudi Arabia default center (Riyadh)
export const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];

// Custom marker styles
export const MARKER_STYLES = {
  primary: {
    color: 'hsl(var(--primary))',
    size: 40,
    borderWidth: 3,
  },
  success: {
    color: '#22c55e',
    size: 36,
    borderWidth: 3,
  },
  warning: {
    color: '#eab308',
    size: 36,
    borderWidth: 3,
  },
  danger: {
    color: '#ef4444',
    size: 36,
    borderWidth: 3,
  },
  muted: {
    color: '#6b7280',
    size: 32,
    borderWidth: 2,
  },
} as const;

// Polygon styles for boundaries
export const BOUNDARY_STYLES = {
  default: {
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
    weight: 3,
    dashArray: '5, 5',
  },
  active: {
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.2,
    weight: 3,
  },
  warning: {
    color: '#eab308',
    fillColor: '#eab308',
    fillOpacity: 0.15,
    weight: 3,
  },
  danger: {
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.15,
    weight: 3,
  },
} as const;
