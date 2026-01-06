import { useState, useEffect } from 'react';
import { MAP_STYLES, MapStyleKey } from '@/components/maps/MapStyleSwitcher';

export function useMapStyle(storageKey = 'map-style') {
  const [style, setStyle] = useState<MapStyleKey>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && saved in MAP_STYLES) {
        return saved as MapStyleKey;
      }
    } catch {
      // localStorage not available
    }
    return 'street';
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, style);
    } catch {
      // localStorage not available
    }
  }, [style, storageKey]);

  return {
    mapStyle: style,
    setMapStyle: setStyle,
    tileLayerConfig: MAP_STYLES[style],
  };
}
