import { useEffect, useState } from 'react';

export const ZONE_STORAGE_KEY = 'gate_selected_zone';

export function useSelectedZone() {
  const [zoneId, setZoneId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ZONE_STORAGE_KEY);
    setZoneId(stored);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ZONE_STORAGE_KEY) {
        setZoneId(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return zoneId;
}